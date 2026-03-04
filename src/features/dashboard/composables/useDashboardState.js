import { reactive, computed } from 'vue';
import {
  ALL_ACCOUNTS_GROUP_ID,
  ALL_ACCOUNTS_HIDDEN_GROUP_ID
} from '@/features/dashboard/constants/groups.js';

const state = reactive({
  allUserAccounts: [],
  allUserGroups: [],
  allUserTabs: [],
  allUserRules: [],
  itemsNeedingReauth: [], // Accounts that need to be reconnected

  blueBar: { message: false, loading: false },
  date: { start: 'firstOfMonth', end: 'today' },
  isLoading: true,
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
        reorderedTabs.forEach((tab, newTabIndex) => tab.sort = newTabIndex);
      }
    }),
    tab: computed(() => state.selected.tabsForGroup.find(tab => tab.isSelected)),
    category: false,
    transaction: false
  }

});

export function useDashboardState() {
  return { state };
}

function getTabsForGroup(group) {
  if (!group) return [];

  if (group?.isVirtualAllAccounts || group?._id === ALL_ACCOUNTS_GROUP_ID) {
    return state.allUserTabs
      .filter((tab) => {
        const showForGroup = Array.isArray(tab.showForGroup) ? tab.showForGroup : [];
        return !showForGroup.includes(ALL_ACCOUNTS_HIDDEN_GROUP_ID);
      })
      .sort((a, b) => a.sort - b.sort);
  }

  const tabs = state.allUserTabs.filter(tab => {
    const tabMatchesGroupId = tab.showForGroup.includes(group._id);
    const tabIsGlobal = tab.showForGroup.includes('_GLOBAL');
    return tabMatchesGroupId || tabIsGlobal;
  });

  return tabs.sort((a, b) => a.sort - b.sort);
}
