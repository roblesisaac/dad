import { reactive, computed } from 'vue';
import {
  ALL_ACCOUNTS_GROUP_ID,
  ALL_ACCOUNTS_HIDDEN_GROUP_ID
} from '@/features/dashboard/constants/groups.js';
import {
  getTabSortForScope,
  resolveTabOrderScopeId,
  setTabSortForScope
} from '@/features/tabs/utils/tabOrder.js';

const state = reactive({
  allUserAccounts: [],
  allUserGroups: [],
  allUserTabs: [],
  allUserRules: [],
  itemsNeedingReauth: [], // Accounts that need to be reconnected
  isOnboarding: false,

  blueBar: { message: false, loading: false },
  date: { start: 'firstOfMonth', end: 'today' },
  isLoading: true,
  isVisualizerOpen: false,
  reportRowTotalOverride: null,

  selected: {
    allGroupTransactions: [],
    groupOverride: null,
    group: computed(() => {
      const overrideGroup = state.selected.groupOverride;
      if (overrideGroup?.isVirtualAllAccounts) {
        return {
          ...overrideGroup,
          _id: ALL_ACCOUNTS_GROUP_ID,
          accounts: state.allUserAccounts
        };
      }

      return overrideGroup || state.allUserGroups.find(g => g.isSelected);
    }),
    tabsForGroup: computed({
      get: () => getTabsForGroup(state.selected.group),
      set: (reorderedTabs) => {
        const scopeId = resolveTabOrderScopeId(state.selected.group);
        reorderedTabs.forEach((tab, newTabIndex) => setTabSortForScope(tab, scopeId, newTabIndex));
      }
    }),
    tab: computed(() => state.selected.tabsForGroup.find(tab => tab.isSelected)),
    drillPath: [],
    transaction: false
  }

});

export function useDashboardState() {
  return { state };
}

function sortTabsForScope(tabs, group) {
  const scopeId = resolveTabOrderScopeId(group);

  return [...tabs]
    .map((tab, index) => ({ tab, index }))
    .sort((a, b) => {
      const sortA = getTabSortForScope(a.tab, scopeId, a.index);
      const sortB = getTabSortForScope(b.tab, scopeId, b.index);

      if (sortA !== sortB) {
        return sortA - sortB;
      }

      return a.index - b.index;
    })
    .map(({ tab }) => tab);
}

function getTabsForGroup(group) {
  if (!group) return [];

  if (group?.isVirtualAllAccounts || group?._id === ALL_ACCOUNTS_GROUP_ID) {
    return sortTabsForScope(state.allUserTabs
      .filter((tab) => {
        const showForGroup = Array.isArray(tab.showForGroup) ? tab.showForGroup : [];
        return !showForGroup.includes(ALL_ACCOUNTS_HIDDEN_GROUP_ID);
      }), group);
  }

  const tabs = state.allUserTabs.filter(tab => {
    const showForGroup = Array.isArray(tab.showForGroup) ? tab.showForGroup : [];
    const tabMatchesGroupId = showForGroup.includes(group._id);
    const tabIsGlobal = showForGroup.includes('_GLOBAL');
    return tabMatchesGroupId || tabIsGlobal;
  });

  return sortTabsForScope(tabs, group);
}
