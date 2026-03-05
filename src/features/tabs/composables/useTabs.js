import { useTabsAPI } from './useTabsAPI.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';
import { useTabProcessing } from './useTabProcessing.js';
import { useRulesAPI } from '@/features/rule-manager/composables/useRulesAPI.js';
import {
  ALL_ACCOUNTS_GROUP_ID,
  ALL_ACCOUNTS_HIDDEN_GROUP_ID
} from '@/features/dashboard/constants/groups.js';

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

export function useTabs() {
  const { state } = useDashboardState();
  const { processTabData, processAllTabsForSelectedGroup } = useTabProcessing();
  const tabsAPI = useTabsAPI();
  const rulesAPI = useRulesAPI();

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
    }

    tabToSelect.isSelected = true;
    tabToSelect.categorizedItems = [];
    tabToSelect.groupByMode = 'category';
    const processed = processTabData(tabToSelect);
    if(processed) {
      tabToSelect.categorizedItems = processed.categorizedItems;
      tabToSelect.groupByMode = processed.groupByMode || 'category';
    }
  }

  /**
   * Updates the sort order of a tab
   */
  async function updateTabSort(tabId, newSort) {
    try {
      // Find the tab in state
      const tab = state.allUserTabs.find(t => t._id === tabId);
      if (!tab) return;
      
      // Set loading indicator if not already set
      if (!state.blueBar.loading) {
        state.blueBar.message = "Saving tab order...";
        state.blueBar.loading = true;
      }
      
      // Call API to update sort value
      const updatedTab = await tabsAPI.updateTabSort(tabId, newSort);
      
      return updatedTab;
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
    }

    const newTabData = {
      tabName,
      showForGroup: selectedGroup?.isVirtualAllAccounts || selectedGroup?._id === ALL_ACCOUNTS_GROUP_ID
        ? ['_GLOBAL']
        : [selectedGroup._id],
      sort: tabsForGroup.length+1
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

    state.blueBar.message = 'Saving tab...';
    state.blueBar.loading = true;

    try {
      if (selectedTab) {
        selectedTab.isSelected = false;
        selectedTab.categorizedItems = [];
      }

      const newTabData = {
        tabName,
        showForGroup: selectedGroup?.isVirtualAllAccounts || selectedGroup?._id === ALL_ACCOUNTS_GROUP_ID
          ? ['_GLOBAL']
          : [selectedGroup._id],
        sort: tabsForGroup.length + 1
      };

      const newTab = await tabsAPI.createTab(newTabData);
      if (!newTab?._id) {
        throw new Error('Failed to create tab');
      }

      newTab.isSelected = false;
      state.allUserTabs.push(newTab);

      const rulePayloads = [];

      normalizedFilters
        .filter(filterRule => isConditionComplete(filterRule))
        .forEach((filterRule, index) => {
          rulePayloads.push({
            applyForTabs: [newTab._id],
            rule: buildRuleWithConditions('filter', filterRule, '', normalizeRuleList(filterRule.conditions)),
            filterJoinOperator: index === 0
              ? 'and'
              : normalizeFilterJoinOperator(filterRule.joinOperator),
            _isImportant: false,
            orderOfExecution: index
          });
        });

      normalizedCategorizeRules
        .filter(categorizeRule =>
          isConditionComplete(categorizeRule)
          && String(categorizeRule.category || '').trim()
        )
        .forEach((categorizeRule, index) => {
          rulePayloads.push({
            applyForTabs: [newTab._id],
            rule: buildRuleWithConditions(
              'categorize',
              categorizeRule,
              categorizeRule.category,
              normalizeRuleList(categorizeRule.conditions)
            ),
            filterJoinOperator: 'and',
            _isImportant: false,
            orderOfExecution: index
          });
        });

      rulePayloads.push({
        applyForTabs: [newTab._id],
        rule: ['sort', normalizedSortKey, normalizedSortDirection, '', ''],
        filterJoinOperator: 'and',
        _isImportant: false,
        orderOfExecution: 0
      });

      rulePayloads.push({
        applyForTabs: [newTab._id],
        rule: ['groupBy', normalizedGroupByValue, '', '', ''],
        filterJoinOperator: 'and',
        _isImportant: false,
        orderOfExecution: 0
      });

      let failedRuleCount = 0;
      for (const rulePayload of rulePayloads) {
        try {
          const createdRule = await rulesAPI.createRule(rulePayload);
          if (createdRule) {
            state.allUserRules.push(createdRule);
            continue;
          }
          failedRuleCount += 1;
        } catch (error) {
          failedRuleCount += 1;
          console.error('Error creating tab wizard rule:', error);
        }
      }

      await processAllTabsForSelectedGroup();
      const newReactiveTab = resolveReactiveTabById(newTab._id);
      if (newReactiveTab) {
        await selectTab(newReactiveTab);
      }

      if (failedRuleCount > 0) {
        state.blueBar.message = `Tab created. ${failedRuleCount} rule${failedRuleCount === 1 ? '' : 's'} failed to save.`;
      } else {
        state.blueBar.message = 'Tab saved';
      }

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
          const createdTab = await tabsAPI.createTab({
            tabName: defaultTab.tabName,
            showForGroup: ['_GLOBAL'],
            sort
          });

          if (!createdTab) {
            continue;
          }

          createdTab.isSelected = false;
          state.allUserTabs.push(createdTab);
          createdTabs.push({
            tab: createdTab,
            filterMethod: defaultTab.filterMethod
          });
        }

        for (const createdTabWithFilter of createdTabs) {
          const createdRule = await rulesAPI.createRule({
            applyForTabs: [createdTabWithFilter.tab._id],
            rule: ['filter', 'amount', createdTabWithFilter.filterMethod, '0', ''],
            filterJoinOperator: 'and',
            _isImportant: false,
            orderOfExecution: 0
          });

          if (createdRule) {
            state.allUserRules.push(createdRule);
          }
        }

        await processAllTabsForSelectedGroup({ showLoading: false });
        return createdTabs.map(({ tab }) => tab);
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
        const index = state.allUserTabs.findIndex(t => t._id === updatedTab._id);
        if (index !== -1) {
          state.allUserTabs[index] = updatedTab;
        }
        
        // If we just enabled the tab, update its sort value to be at the end
        if (isEnabled && groupId !== ALL_ACCOUNTS_HIDDEN_GROUP_ID) {
          const enabledTabs = state.allUserTabs.filter(t => 
            t.showForGroup.includes(groupId) || t.showForGroup.includes('_GLOBAL')
          );
          
          if (enabledTabs.length > 0) {
            // Set sort to be higher than the highest current sort value
            const maxSort = Math.max(...enabledTabs.map(t => t.sort || 0));
            await updateTabSort(tabId, maxSort + 1);
          }
        }
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
      const index = state.allUserTabs.findIndex(t => t._id === updatedTab._id);
      if (index !== -1) {
        state.allUserTabs[index] = updatedTab;
      }
      
      return updatedTab;
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
    toggleTabForGroup,
    updateTab
  };
} 
