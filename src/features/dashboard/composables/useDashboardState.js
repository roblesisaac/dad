import { reactive, computed } from 'vue';
// Create shared state
const state = reactive({
  allUserAccounts: [],
  allUserGroups: [],
  allUserTabs: [],
  allUserRules: [],
  blueBar: {
    message: false,
    loading: false
  },
  date: { start: 'firstOfMonth', end: 'today' },
  editingRule: null,
  elems: {
    body: document.documentElement.style
  },
  isLoading: true,
  linkToken: null,
  // reordering: false,
  selected: {
    allGroupTransactions: [],
    group: computed(() => state.allUserGroups.find(g => g.isSelected)),
    tabsForGroup: computed({
      get: () => {
        const selectedGroup = state.selected.group;
        if(!selectedGroup) return [];

        const tabs = state.allUserTabs.filter(tab => {
          const tabMatchesGroupId = tab.showForGroup.includes(selectedGroup._id);
          const tabIsGlobal = tab.showForGroup.includes('_GLOBAL');
          return tabMatchesGroupId || tabIsGlobal;
        });

        return tabs.sort((a,b) => a.sort - b.sort);
      },
      set: (reorderedTabs) => {
        reorderedTabs.forEach((tab, newTabIndex) => tab.sort = newTabIndex);       
      }
    }),
    tab: computed(() => state.selected.tabsForGroup.find(tab => tab.isSelected)),
    transaction: false
  },
  syncCheckId: false
});

export function useDashboardState() {
  return { state };
}