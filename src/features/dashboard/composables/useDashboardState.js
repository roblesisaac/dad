import { reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useApi } from '@/shared/composables/useApi';
import { useTransactions } from './useTransactions';
import { useTabProcessing } from './useTabProcessing';
import { useSyncStatus } from '@/features/onboarding/composables/useSyncStatus';
import { useUtils } from './useUtils';
import loadScript from '@/shared/utils/loadScript';

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
    editingGroup: null,
    elems: {
      body: document.documentElement.style
    },
    isLoading: true,
    linkToken: null,
    showReorder: false,
    selected: {
      allGroupTransactions: [],
      group: computed(() => state.allUserGroups.find(group => group.isSelected)),
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
  // Initialize composables
  const api = useApi();
  const router = useRouter();
  const { fetchTransactions, fetchUserTabs, fetchUserRules } = useTransactions(api);
  const { processTabData } = useTabProcessing();
  const { checkSyncStatus } = useSyncStatus(api, state);
  const { 
    sortBy, 
    extractDateRange, 
    selectFirstGroup,
    selectFirstTab,
    selectedTabsInGroup,
    deselectOtherTabs 
  } = useUtils();

  // Shared methods
  const actions = {
    checkSyncStatus,
    createNewTab: async () => {
      if(location.pathname !== '/dashboard') return;

      const tabsForGroup = state.selected.tabsForGroup;
      let tabName = `Tab ${tabsForGroup.length+1}`;
      const response = prompt('What would you like to name this tab?', tabName);
      if(!response) return;
      tabName = response;

      if(!state.selected.group) return;

      const selectedGroup = state.selected.group;
      const selectedTab = state.selected.tab;

      if(selectedTab) {
        selectedTab.isSelected = false;
        api.put(`tabs/${selectedTab._id}`, { isSelected: false });
      }

      const newTab = await api.post('tabs', {
        tabName,
        showForGroup: [selectedGroup._id],
        isSelected: true,
        sort: tabsForGroup.length+1
      });

      state.allUserTabs.push(newTab);
      await actions.processAllTabsForSelectedGroup();
    },
    goBack: () => {
      state.isLoading = true;
      router.back();
    },
    init: async () => {
      try {
        state.blueBar.message = 'Beginning sync';
        state.blueBar.loading = true;

        await loadScript('https://cdn.plaid.com/link/v2/stable/link-initialize.js');

        try {
          state.allUserTabs = await fetchUserTabs();       
          state.allUserRules = await fetchUserRules();
        } catch (error) {
          console.error('Error fetching tabs/rules:', error);
        }
        
        try {
          const response = await api.get('/plaid/sync/accounts/and/groups');

          if(!response) {
            state.blueBar.message = null;
            state.blueBar.loading = false;

            router.push({ name: 'onboarding' });
            return;
          }

          const { groups, accounts } = response;

          state.allUserAccounts = accounts;
          state.allUserGroups = groups?.sort(sortBy('sort')) || [];
        } catch (error) {
          const errorData = error.response?.data;
          state.blueBar.message = errorData?.message || 'There was an error connecting to your accounts. Please try again.';
          state.blueBar.loading = false;
        }
      } catch (error) {
        console.error('Init error:', error);
        state.blueBar.message = 'Unable to initialize application. Please refresh the page.';
      } finally {
        state.blueBar.loading = false;
      }
    },
    handleGroupChange: async () => {
      let selectedGroup = state.selected.group;
      const tabsForGroup = state.selected.tabsForGroup;

      if(state.date.start > state.date.end) return;

      if(!selectedGroup) {
        if(!state.allUserGroups.length) {
          router.push({ name: 'select-group' });
          return;
        }
        selectedGroup = selectFirstGroup(state, api);
      }

      state.isLoading = true;
      state.selected.allGroupTransactions = [];

      for(const account of selectedGroup.accounts) {
        state.selected.allGroupTransactions = [
          ...state.selected.allGroupTransactions,
          ...await fetchTransactions(account.account_id, extractDateRange(state))
        ]
      };

      if(!!tabsForGroup.length) {
        return await actions.processAllTabsForSelectedGroup();
      }

      nextTick(async () => {
        await actions.createNewTab();
        state.isLoading = false;
      });
    },
    handleTabChange: (newSelectedTabId, oldSelectedTabId) => {
      if (newSelectedTabId === oldSelectedTabId) return;

      if(oldSelectedTabId) {
        const oldSelectedTab = state.allUserTabs?.find(({ _id }) => _id === oldSelectedTabId);
        if (oldSelectedTab) {
          oldSelectedTab.categorizedItems = [];
        }
      }

      if(!newSelectedTabId) return;
      
      const selectedTab = state.selected.tab;
      if (!selectedTab) return;

      const processed = processTabData(state.selected.allGroupTransactions, selectedTab, state.allUserRules);
      if (processed) {
        selectedTab.categorizedItems = processed.categorizedItems;
      }
    },
    processAllTabsForSelectedGroup: async () => {
      const tabsForGroup = state.selected.tabsForGroup;
      if(!tabsForGroup?.length) return;

      state.isLoading = true;

      const selectedTabs = selectedTabsInGroup(tabsForGroup);

      if(selectedTabs.length < 1) {
        selectFirstTab(tabsForGroup, api);
      }

      if(selectedTabs.length > 1) {
        await deselectOtherTabs(selectedTabs, api);
      }

      for(const tab of tabsForGroup) {
        tab.categorizedItems = [];
        const processed = processTabData(state.selected.allGroupTransactions, tab, state.allUserRules);
        if (processed) {
          tab.total = processed.tabTotal;
          tab.categorizedItems = processed.categorizedItems;
        }
      }

      state.isLoading = false;
    },
    processTabData
  };

  return {
    state,
    actions
  };
} 