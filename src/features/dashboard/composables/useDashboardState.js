import { reactive, computed } from 'vue';

const state = reactive({
  allUserAccounts: [],
  allUserGroups: [],
  allUserTabs: [],
  allUserRules: [],
  itemsNeedingReauth: [], // Accounts that need to be reconnected

  blueBar: { message: false, loading: false },
  date: { start: 'firstOfMonth', end: 'today' },
  isLoading: true,

  selected: {
    allGroupTransactions: [],
    group: computed(() => state.allUserGroups.find(g => g.isSelected)),
    tabsForGroup: computed({
      get: () => getTabsForGroup(state.selected.group),
      set: (reorderedTabs) => {
        reorderedTabs.forEach((tab, newTabIndex) => tab.sort = newTabIndex);
      }
    }),
    tab: computed(() => state.selected.tabsForGroup.find(tab => tab.isSelected)),
    transaction: false
  }

});

export function useDashboardState() {
  return { state };
}

function getTabsForGroup(group) {
  if (!group) return [];

  const tabs = state.allUserTabs.filter(tab => {
    const tabMatchesGroupId = tab.showForGroup.includes(group._id);
    const tabIsGlobal = tab.showForGroup.includes('_GLOBAL');
    return tabMatchesGroupId || tabIsGlobal;
  });

  return tabs.sort((a, b) => a.sort - b.sort);
}