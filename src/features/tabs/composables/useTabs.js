import { useTabsAPI } from './useTabsAPI.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';
import { useTabProcessing } from './useTabProcessing.js';
import {
  ALL_ACCOUNTS_GROUP_ID,
  ALL_ACCOUNTS_HIDDEN_GROUP_ID
} from '@/features/dashboard/constants/groups.js';
import {
  getTabSortForScope,
  resolveTabOrderScopeId,
  setTabSortForScope
} from '@/features/tabs/utils/tabOrder.js';
import {
  normalizeDrillSchema,
  normalizeDrillPath,
  ensureDrillLevel,
  replaceRulesAtDepth,
  replaceRulesAtPath
} from '@/features/tabs/utils/drillSchema.js';

const DEFAULT_TABS_FOR_EMPTY_STATE = [
  { tabName: 'money in', filterMethod: '>' },
  { tabName: 'money out', filterMethod: '<' }
];

const DEFAULT_ORGANIZE_SETTINGS = Object.freeze({
  sortKey: 'date',
  sortDirection: 'desc',
  groupBy: 'none'
});

const ALLOWED_SORT_KEYS = new Set(['amount', 'date', 'name', 'category']);
const ALLOWED_SORT_DIRECTIONS = new Set(['asc', 'desc']);
const ALLOWED_GROUP_BY_VALUES = new Set([
  'none',
  'category',
  'year',
  'month',
  'year_month',
  'day',
  'date',
  'weekday'
]);

let createDefaultTabsPromise = null;

function normalizeConditionCombinator(combinator) {
  return String(combinator || '').toLowerCase() === 'or'
    ? 'or'
    : 'and';
}

function normalizeFilterJoinOperator(joinOperator) {
  return String(joinOperator || '').toLowerCase() === 'or'
    ? 'or'
    : 'and';
}

function normalizeLegacyDateMethod(methodName) {
  if (methodName === '<') {
    return 'is before';
  }

  if (methodName === '>') {
    return 'is after';
  }

  return methodName;
}

function normalizeLegacyTextMethod(methodName) {
  if (methodName === 'contains') {
    return 'includes';
  }

  return methodName;
}

function normalizeMethodForProperty(property, methodName) {
  if (property === 'date') {
    return normalizeLegacyDateMethod(methodName);
  }

  if (property === 'name' || property === 'category') {
    return normalizeLegacyTextMethod(methodName);
  }

  return methodName;
}

function isConditionComplete(condition) {
  if (!condition) {
    return false;
  }

  return Boolean(
    condition.property
      && condition.method
      && String(condition.value || '').trim()
  );
}

function buildRuleWithConditions(ruleType, baseCondition, resultValue = '', extraConditions = []) {
  const normalizedProperty = String(baseCondition?.property || '').trim();
  const normalizedMethod = normalizeMethodForProperty(
    normalizedProperty,
    String(baseCondition?.method || '').trim()
  );
  const normalizedCriterion = String(baseCondition?.value || '').trim();
  const normalizedResultValue = String(resultValue || '').trim();

  const rule = [
    ruleType,
    normalizedProperty,
    normalizedMethod,
    normalizedCriterion,
    normalizedResultValue
  ];

  for (const extraCondition of extraConditions) {
    if (!isConditionComplete(extraCondition)) {
      continue;
    }

    const extraProperty = String(extraCondition.property || '').trim();
    rule.push(
      normalizeConditionCombinator(extraCondition.combinator),
      extraProperty,
      normalizeMethodForProperty(extraProperty, String(extraCondition.method || '').trim()),
      String(extraCondition.value || '').trim()
    );
  }

  return rule;
}

function normalizeSortKey(sortKey) {
  const normalizedSortKey = String(sortKey || '').trim().replace(/^-/, '');
  return ALLOWED_SORT_KEYS.has(normalizedSortKey)
    ? normalizedSortKey
    : DEFAULT_ORGANIZE_SETTINGS.sortKey;
}

function normalizeSortDirection(sortDirection, sortKey = '') {
  const normalizedSortDirection = String(sortDirection || '').toLowerCase();
  if (ALLOWED_SORT_DIRECTIONS.has(normalizedSortDirection)) {
    return normalizedSortDirection;
  }

  return String(sortKey || '').trim().startsWith('-')
    ? 'desc'
    : DEFAULT_ORGANIZE_SETTINGS.sortDirection;
}

function normalizeGroupByValue(groupByValue) {
  const normalizedGroupByValue = String(groupByValue || '').trim();
  return ALLOWED_GROUP_BY_VALUES.has(normalizedGroupByValue)
    ? normalizedGroupByValue
    : DEFAULT_ORGANIZE_SETTINGS.groupBy;
}

function normalizeRuleList(ruleList) {
  return Array.isArray(ruleList) ? ruleList : [];
}

function createLocalRuleConfig(rule, options = {}) {
  const {
    filterJoinOperator = 'and',
    isImportant = false,
    orderOfExecution = 0,
    idPrefix = 'rule'
  } = options;

  return {
    _id: `${idPrefix}-${Math.random().toString(36).slice(2, 10)}`,
    rule,
    filterJoinOperator,
    _isImportant: Boolean(isImportant),
    orderOfExecution: Number.isFinite(Number(orderOfExecution))
      ? Number(orderOfExecution)
      : 0
  };
}

function buildDefaultDrillSchema() {
  return normalizeDrillSchema({});
}

function buildDrillSchemaFromWizardConfig({
  filters = [],
  categorizeRules = [],
  sortKey = DEFAULT_ORGANIZE_SETTINGS.sortKey,
  sortDirection = DEFAULT_ORGANIZE_SETTINGS.sortDirection,
  groupBy = DEFAULT_ORGANIZE_SETTINGS.groupBy
} = {}) {
  const filterRules = normalizeRuleList(filters)
    .filter(filterRule => isConditionComplete(filterRule))
    .map((filterRule, index) => createLocalRuleConfig(
      buildRuleWithConditions('filter', filterRule, '', normalizeRuleList(filterRule.conditions)),
      {
        idPrefix: 'filter',
        filterJoinOperator: index === 0
          ? 'and'
          : normalizeFilterJoinOperator(filterRule.joinOperator),
        orderOfExecution: index
      }
    ));

  const localCategorizeRules = normalizeRuleList(categorizeRules)
    .filter(categorizeRule =>
      isConditionComplete(categorizeRule)
      && String(categorizeRule.category || '').trim()
    )
    .map((categorizeRule, index) => createLocalRuleConfig(
      buildRuleWithConditions(
        'categorize',
        categorizeRule,
        categorizeRule.category,
        normalizeRuleList(categorizeRule.conditions)
      ),
      {
        idPrefix: 'categorize',
        filterJoinOperator: 'and',
        orderOfExecution: index
      }
    ));

  const sortRules = [createLocalRuleConfig(
    ['sort', sortKey, sortDirection, '', ''],
    {
      idPrefix: 'sort',
      orderOfExecution: 0
    }
  )];

  const groupByRules = [createLocalRuleConfig(
    ['groupBy', groupBy, '', '', ''],
    {
      idPrefix: 'group-by',
      orderOfExecution: 0
    }
  )];

  return normalizeDrillSchema({
    version: 1,
    levels: [{
      id: 'level-1',
      sortRules,
      categorizeRules: localCategorizeRules,
      filterRules,
      groupByRules
    }]
  });
}

export function useTabs() {
  const { state } = useDashboardState();
  const { processTabData, processAllTabsForSelectedGroup } = useTabProcessing();
  const tabsAPI = useTabsAPI();

  function resolveReactiveTabById(tabId) {
    if (!tabId) {
      return null;
    }

    const tabInSelectedGroup = state.selected.tabsForGroup.find(tab => tab._id === tabId);
    if (tabInSelectedGroup) {
      return tabInSelectedGroup;
    }

    return state.allUserTabs.find(tab => tab._id === tabId) || null;
  }

  function tabIsVisibleInGroup(tab, groupId) {
    const showForGroup = Array.isArray(tab?.showForGroup) ? tab.showForGroup : [];

    if (groupId === ALL_ACCOUNTS_GROUP_ID) {
      return !showForGroup.includes(ALL_ACCOUNTS_HIDDEN_GROUP_ID);
    }

    return showForGroup.includes(groupId) || showForGroup.includes('_GLOBAL');
  }

  function mergeRuntimeTabFields(existingTab = {}, updatedTab = {}) {
    const hasNumericExistingTotal = Number.isFinite(Number(existingTab?.total));
    const hasNumericUpdatedTotal = Number.isFinite(Number(updatedTab?.total));

    return {
      ...existingTab,
      ...updatedTab,
      isSelected: Boolean(existingTab?.isSelected),
      categorizedItems: Array.isArray(existingTab?.categorizedItems) ? existingTab.categorizedItems : [],
      hiddenItems: Array.isArray(existingTab?.hiddenItems) ? existingTab.hiddenItems : [],
      groupByMode: String(existingTab?.groupByMode || updatedTab?.groupByMode || 'category'),
      total: hasNumericExistingTotal
        ? Number(existingTab.total)
        : (hasNumericUpdatedTotal ? Number(updatedTab.total) : 0)
    };
  }

  function replaceTabInState(updatedTab) {
    if (!updatedTab?._id) {
      return updatedTab;
    }

    const index = state.allUserTabs.findIndex(tab => tab._id === updatedTab._id);
    if (index === -1) {
      return updatedTab;
    }

    const existingTab = state.allUserTabs[index];
    const mergedTab = mergeRuntimeTabFields(existingTab, updatedTab);
    state.allUserTabs[index] = mergedTab;
    return mergedTab;
  }

  async function persistTabUpdate(tabId, updates = {}) {
    const updatedTab = await tabsAPI.updateTab(tabId, updates);
    return replaceTabInState(updatedTab);
  }

  async function setTabDrillSchema(tabId, drillSchema, options = {}) {
    const { reprocess = true } = options;
    const normalizedDrillSchema = normalizeDrillSchema(drillSchema);
    const updatedTab = await persistTabUpdate(tabId, {
      drillSchema: normalizedDrillSchema
    });

    if (reprocess) {
      await processAllTabsForSelectedGroup({ showLoading: false });
    }

    return updatedTab;
  }

  /**
   * Select a tab and deselect the currently selected tab
   */
  function selectTab(tabToSelect) {
    if(tabToSelect.isSelected) {
      return;
    }

    const prevSelectedTab = state.selected.tab;

    if(prevSelectedTab) {
      prevSelectedTab.isSelected = false;
      prevSelectedTab.categorizedItems = [];
      prevSelectedTab.hiddenItems = [];
    }

    tabToSelect.isSelected = true;
    tabToSelect.categorizedItems = [];
    tabToSelect.hiddenItems = [];
    tabToSelect.groupByMode = 'category';
    const processed = processTabData(tabToSelect);
    if(processed) {
      tabToSelect.categorizedItems = processed.categorizedItems;
      tabToSelect.hiddenItems = Array.isArray(processed.hiddenItems) ? processed.hiddenItems : [];
      tabToSelect.groupByMode = processed.groupByMode || 'category';
    }
  }

  /**
   * Updates the sort order of a tab
   */
  async function updateTabSort(tabId, newSort, options = {}) {
    try {
      // Find the tab in state
      const tab = state.allUserTabs.find(t => t._id === tabId);
      if (!tab) return;

      const scopeId = resolveTabOrderScopeId(options.scopeId || state.selected.group);
      const normalizedSort = Number(newSort);
      if (!Number.isFinite(normalizedSort)) {
        return;
      }

      if (scopeId) {
        setTabSortForScope(tab, scopeId, normalizedSort);
      } else {
        tab.sort = normalizedSort;
      }
      
      // Set loading indicator if not already set
      if (!state.blueBar.loading) {
        state.blueBar.message = "Saving tab order...";
        state.blueBar.loading = true;
      }
      
      // Call API to update sort value
      const updatedTab = await tabsAPI.updateTabSort(tabId, normalizedSort, scopeId);
      return replaceTabInState(updatedTab);
    } catch (error) {
      console.error('Error updating tab sort:', error);
      state.blueBar.message = "Error saving tab order";
    } finally {
      // Clear loading state after a delay
      // Using a setTimeout to avoid rapid flashing if multiple tabs are sorted at once
      setTimeout(() => {
        state.blueBar.loading = false;
        state.blueBar.message = "";
      }, 1000);
    }
  }

  /**
   * Create a new tab using the provided function
   */
  async function createNewTab() {
    const { tabsForGroup } = state.selected;
    let tabName = `Tab ${tabsForGroup.length+1}`;
    const response = prompt('What would you like to name this tab?', tabName);
    if(!response) return;
    tabName = response;

    if(!state.selected.group) return;

    const selectedGroup = state.selected.group;
    const selectedTab = state.selected.tab;

    if(selectedTab) {
      selectedTab.isSelected = false;
      selectedTab.categorizedItems = [];
      selectedTab.hiddenItems = [];
    }

    const scopeId = resolveTabOrderScopeId(selectedGroup);
    const nextSort = tabsForGroup.length + 1;

    const newTabData = {
      tabName,
      showForGroup: selectedGroup?.isVirtualAllAccounts || selectedGroup?._id === ALL_ACCOUNTS_GROUP_ID
        ? ['_GLOBAL']
        : [selectedGroup._id],
      sort: nextSort,
      sortByGroup: scopeId
        ? { [scopeId]: nextSort }
        : {},
      drillSchema: buildDefaultDrillSchema()
    };

    const newTab = await tabsAPI.createTab(newTabData);
    if (!newTab?._id) {
      return;
    }

    newTab.isSelected = false;

    state.allUserTabs.push(newTab);
    await processAllTabsForSelectedGroup();

    const newReactiveTab = resolveReactiveTabById(newTab._id);
    if (!newReactiveTab) {
      return;
    }

    await selectTab(newReactiveTab);
  }

  async function createTabWithWizardConfig(config = {}) {
    const { tabsForGroup } = state.selected;
    const selectedGroup = state.selected.group;
    const selectedTab = state.selected.tab;

    const requestedTabName = String(config.tabName || '').trim();
    const fallbackTabName = `Tab ${tabsForGroup.length + 1}`;
    const tabName = requestedTabName || fallbackTabName;

    if (!selectedGroup) {
      return null;
    }

    const organizeConfig = {
      ...DEFAULT_ORGANIZE_SETTINGS,
      ...(config.organize || {})
    };

    const normalizedSortKey = normalizeSortKey(organizeConfig.sortKey);
    const normalizedSortDirection = normalizeSortDirection(
      organizeConfig.sortDirection,
      organizeConfig.sortKey
    );
    const normalizedGroupByValue = normalizeGroupByValue(organizeConfig.groupBy);

    const normalizedFilters = normalizeRuleList(config.filters);
    const normalizedCategorizeRules = normalizeRuleList(config.categorizeRules);
    const drillSchema = buildDrillSchemaFromWizardConfig({
      filters: normalizedFilters,
      categorizeRules: normalizedCategorizeRules,
      sortKey: normalizedSortKey,
      sortDirection: normalizedSortDirection,
      groupBy: normalizedGroupByValue
    });

    state.blueBar.message = 'Saving tab...';
    state.blueBar.loading = true;

    try {
      if (selectedTab) {
        selectedTab.isSelected = false;
        selectedTab.categorizedItems = [];
        selectedTab.hiddenItems = [];
      }

      const scopeId = resolveTabOrderScopeId(selectedGroup);
      const nextSort = tabsForGroup.length + 1;

      const newTabData = {
        tabName,
        showForGroup: selectedGroup?.isVirtualAllAccounts || selectedGroup?._id === ALL_ACCOUNTS_GROUP_ID
          ? ['_GLOBAL']
          : [selectedGroup._id],
        sort: nextSort,
        sortByGroup: scopeId
          ? { [scopeId]: nextSort }
          : {},
        drillSchema
      };

      const newTab = await tabsAPI.createTab(newTabData);
      if (!newTab?._id) {
        throw new Error('Failed to create tab');
      }

      newTab.isSelected = false;
      state.allUserTabs.push(newTab);

      await processAllTabsForSelectedGroup();
      const newReactiveTab = resolveReactiveTabById(newTab._id);
      if (newReactiveTab) {
        await selectTab(newReactiveTab);
      }

      state.blueBar.message = 'Tab saved';

      return newReactiveTab || newTab;
    } catch (error) {
      console.error('Error creating tab from wizard:', error);
      state.blueBar.message = 'Error creating tab';
      return null;
    } finally {
      setTimeout(() => {
        state.blueBar.loading = false;
        state.blueBar.message = '';
      }, 1200);
    }
  }

  async function ensureDefaultTabsForTabView() {
    if (state.allUserTabs.length > 0) {
      return [];
    }

    if (!createDefaultTabsPromise) {
      createDefaultTabsPromise = (async () => {
        const latestTabs = await tabsAPI.fetchUserTabs();
        if (Array.isArray(latestTabs) && latestTabs.length > 0) {
          state.allUserTabs = latestTabs;
          return [];
        }

        const createdTabs = [];

        for (const [sort, defaultTab] of DEFAULT_TABS_FOR_EMPTY_STATE.entries()) {
          const defaultFilterRule = createLocalRuleConfig(
            ['filter', 'amount', defaultTab.filterMethod, '0', ''],
            {
              idPrefix: 'filter',
              filterJoinOperator: 'and',
              orderOfExecution: 0
            }
          );

          const createdTab = await tabsAPI.createTab({
            tabName: defaultTab.tabName,
            showForGroup: ['_GLOBAL'],
            sort,
            sortByGroup: {
              [ALL_ACCOUNTS_GROUP_ID]: sort
            },
            drillSchema: normalizeDrillSchema({
              version: 1,
              levels: [{
                id: 'level-1',
                sortRules: [createLocalRuleConfig(
                  ['sort', 'date', 'desc', '', ''],
                  {
                    idPrefix: 'sort',
                    orderOfExecution: 0
                  }
                )],
                categorizeRules: [],
                filterRules: [defaultFilterRule],
                groupByRules: [createLocalRuleConfig(
                  ['groupBy', 'none', '', '', ''],
                  {
                    idPrefix: 'group-by',
                    orderOfExecution: 0
                  }
                )]
              }]
            })
          });

          if (!createdTab) {
            continue;
          }

          createdTab.isSelected = false;
          state.allUserTabs.push(createdTab);
          createdTabs.push(createdTab);
        }

        await processAllTabsForSelectedGroup({ showLoading: false });
        return createdTabs;
      })()
        .catch((error) => {
          console.error('Error creating default tabs for empty state:', error);
          return [];
        })
        .finally(() => {
          createDefaultTabsPromise = null;
        });
    }

    return await createDefaultTabsPromise;
  }

  async function updateTabDrillSchemaAtDepth(tabId, depth, replacement = {}) {
    const tab = state.allUserTabs.find(tabItem => tabItem?._id === tabId);
    if (!tab) {
      return null;
    }

    const safeDepth = Number.isFinite(Number(depth)) && Number(depth) >= 0
      ? Number(depth)
      : 0;
    const schemaWithDepth = ensureDrillLevel(tab.drillSchema, safeDepth);
    const nextDrillSchema = replaceRulesAtDepth(schemaWithDepth, safeDepth, replacement);

    return await setTabDrillSchema(tabId, nextDrillSchema);
  }

  async function updateTabDrillSchemaAtPath(tabId, drillPath = [], replacement = {}) {
    const tab = state.allUserTabs.find(tabItem => tabItem?._id === tabId);
    if (!tab) {
      return null;
    }

    const normalizedPath = normalizeDrillPath(drillPath);
    if (!normalizedPath.length) {
      return await updateTabDrillSchemaAtDepth(tabId, 0, replacement);
    }

    const nextDrillSchema = replaceRulesAtPath(tab.drillSchema, normalizedPath, replacement);
    return await setTabDrillSchema(tabId, nextDrillSchema);
  }

  function nextUniqueTabName(baseName, targetGroupId) {
    const normalizedBaseName = String(baseName || '').trim() || 'copy of tab';
    const existingTabNames = new Set(
      state.allUserTabs
        .filter(tab => tabIsVisibleInGroup(tab, targetGroupId))
        .map(tab => String(tab?.tabName || '').trim().toLowerCase())
        .filter(Boolean)
    );

    if (!existingTabNames.has(normalizedBaseName.toLowerCase())) {
      return normalizedBaseName;
    }

    let index = 2;
    let candidate = `${normalizedBaseName} ${index}`;

    while (existingTabNames.has(candidate.toLowerCase())) {
      index += 1;
      candidate = `${normalizedBaseName} ${index}`;
    }

    return candidate;
  }

  async function copyTabSchemaToGroup(tabId, targetGroupId) {
    const sourceTab = state.allUserTabs.find(tab => tab?._id === tabId);
    const normalizedTargetGroupId = String(targetGroupId || '').trim();

    if (!sourceTab || !normalizedTargetGroupId) {
      return null;
    }

    const isAllAccountsTarget = normalizedTargetGroupId === ALL_ACCOUNTS_GROUP_ID;
    const visibleTabsInTarget = state.allUserTabs.filter(tab => tabIsVisibleInGroup(tab, normalizedTargetGroupId));
    const nextSort = visibleTabsInTarget.length
      ? Math.max(...visibleTabsInTarget.map((tab, index) => getTabSortForScope(tab, normalizedTargetGroupId, index))) + 1
      : 0;

    const copiedTabName = nextUniqueTabName(
      `copy of ${String(sourceTab.tabName || 'tab').trim() || 'tab'}`,
      normalizedTargetGroupId
    );

    const newTab = await tabsAPI.createTab({
      tabName: copiedTabName,
      showForGroup: isAllAccountsTarget
        ? ['_GLOBAL']
        : [normalizedTargetGroupId],
      sort: nextSort,
      sortByGroup: {
        [normalizedTargetGroupId]: nextSort
      },
      drillSchema: normalizeDrillSchema(sourceTab.drillSchema)
    });

    if (!newTab?._id) {
      return null;
    }

    newTab.isSelected = false;
    state.allUserTabs.push(newTab);
    await processAllTabsForSelectedGroup({ showLoading: false });

    return newTab;
  }

  /**
   * Toggle a tab's visibility for a specific group
   */
  async function toggleTabForGroup(tabId, groupId) {
    try {
      // Find the tab in state
      const tab = state.allUserTabs.find(t => t._id === tabId);
      if (!tab) return;
      
      // Set loading indicator
      state.blueBar.message = "Updating tab visibility...";
      state.blueBar.loading = true;
      
      const allGroupIds = state.allUserGroups
        .map(group => group?._id)
        .filter(Boolean);
      const uniqueGroupIds = (groupIds) => [...new Set(groupIds.filter(Boolean))];
      const currentShowForGroup = Array.isArray(tab.showForGroup) ? tab.showForGroup : [];

      // Update showForGroup in memory
      let isEnabled = false;
      if (groupId === ALL_ACCOUNTS_HIDDEN_GROUP_ID) {
        if (currentShowForGroup.includes(groupId)) {
          tab.showForGroup = currentShowForGroup.filter(id => id !== groupId);
          isEnabled = true;
        } else {
          tab.showForGroup = uniqueGroupIds([...currentShowForGroup, groupId]);
        }
      } else if (currentShowForGroup.includes('_GLOBAL')) {
        tab.showForGroup = uniqueGroupIds(
          allGroupIds.filter(existingGroupId => existingGroupId !== groupId)
        );
      } else if (currentShowForGroup.includes(groupId)) {
        // Disable tab for this group
        tab.showForGroup = currentShowForGroup.filter(id => id !== groupId);
      } else {
        // Enable tab for this group
        tab.showForGroup = uniqueGroupIds([...currentShowForGroup, groupId]);
        isEnabled = true;
      }
      
      // Save changes to backend
      const updatedTab = await tabsAPI.updateTab(tab._id, { 
        showForGroup: tab.showForGroup 
      });
      
      // Update tab in state with response from server
      if (updatedTab) {
        const mergedTab = replaceTabInState(updatedTab);
        
        // If we just enabled the tab, update its sort value to be at the end
        if (isEnabled && groupId !== ALL_ACCOUNTS_HIDDEN_GROUP_ID) {
          const enabledTabs = state.allUserTabs.filter(t => 
            (Array.isArray(t.showForGroup) ? t.showForGroup : []).includes(groupId)
              || (Array.isArray(t.showForGroup) ? t.showForGroup : []).includes('_GLOBAL')
          );
          
          if (enabledTabs.length > 0) {
            // Set sort to be higher than the highest current sort value
            const maxSort = Math.max(...enabledTabs.map(t => getTabSortForScope(t, groupId, 0)));
            await updateTabSort(tabId, maxSort + 1, { scopeId: groupId });
          }
        }

        return mergedTab;
      }

      return updatedTab;
    } catch (error) {
      console.error('Error toggling tab visibility:', error);
      state.blueBar.message = "Error updating tab";
    } finally {
      // Clear loading state after a delay
      setTimeout(() => {
        state.blueBar.loading = false;
        state.blueBar.message = "";
      }, 1000);
    }
  }

  async function updateTab(tab) {
    try {
      // Set the loading state
      state.blueBar.message = "Saving tab changes...";
      state.blueBar.loading = true;
      
      // Use the existing tabsAPI.updateTab method instead of a custom fetch
      const updatedTab = await tabsAPI.updateTab(tab._id, tab);
      
      // Update the tab in state
      return replaceTabInState(updatedTab);
    } catch (error) {
      console.error('Error updating tab:', error);
      state.blueBar.message = "Error saving changes";
    } finally {
      // Clear loading state after a delay
      setTimeout(() => {
        state.blueBar.loading = false;
        state.blueBar.message = false;
      }, 1500);
    }
  }

  return {
    selectTab,
    updateTabSort,
    createNewTab,
    createTabWithWizardConfig,
    ensureDefaultTabsForTabView,
    updateTabDrillSchemaAtDepth,
    updateTabDrillSchemaAtPath,
    copyTabSchemaToGroup,
    setTabDrillSchema,
    toggleTabForGroup,
    updateTab
  };
}
