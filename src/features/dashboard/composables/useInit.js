import { useDashboardState } from './useDashboardState.js';
import { useRouter } from 'vue-router';
import { useApi } from '@/shared/composables/useApi.js';
import { useTabsAPI } from '@/features/tabs/composables/useTabsAPI.js';
import { useRulesAPI } from './useRulesAPI.js';
import { useSelectGroup } from '@/features/select-group/composables/useSelectGroup.js';
import { useTabProcessing } from '@/features/tabs/composables/useTabProcessing.js';
import { useTransactions } from './useTransactions.js';
import loadScript from '@/shared/utils/loadScript.js';


/**
 * Composable for dashboard state management
 * Manages the state of the dashboard and delegates operations to specialized composables
 */
export function useInit() {
  // Initialize API and router
  const api = useApi();
  const router = useRouter();
  const { fetchTransactionsForGroup } = useTransactions();
  const { processAllTabsForSelectedGroup } = useTabProcessing();
  const { state } = useDashboardState();
  
  // Initialize API composables
  const tabsAPI = useTabsAPI(api);
  const rulesAPI = useRulesAPI(api);
  const { fetchGroupsAndAccounts } = useSelectGroup();

  async function init() {
    try {
      state.blueBar.message = 'Beginning sync';
      state.blueBar.loading = true;

      await loadScript('https://cdn.plaid.com/link/v2/stable/link-initialize.js');

      try {
        state.allUserTabs = await tabsAPI.fetchUserTabs();  
        state.allUserRules = await rulesAPI.fetchUserRules();
      } catch (error) {
        console.error('Error fetching tabs/rules:', error);
      }
      
      try {
        const { groups, accounts } = await fetchGroupsAndAccounts();

        if(!groups || !accounts) {
          state.blueBar.message = null;
          state.blueBar.loading = false;

          router.push({ name: 'onboarding' });
          return;
        }

        state.allUserAccounts = accounts;
        state.allUserGroups = groups;

        await handleGroupChange();
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
      state.blueBar.message = null;
      state.isLoading = false;
    }
  }

  /**
   * Handle group selection change
   */
  async function handleGroupChange() {
    let selectedGroup = state.selected.group;
    const tabsForGroup = state.selected.tabsForGroup;

    if(state.date.start > state.date.end) return;

    if(!selectedGroup) {
      if(!state.allUserGroups.length) {
        alert('No groups found. Please create a group first.');
        return;
      }
      // selectedGroup = await selectFirstGroup(state.allUserGroups);
    }
    state.isLoading = true;
    
    // Fetch transactions for all accounts in the selected group
    state.selected.allGroupTransactions = await fetchTransactionsForGroup(
      selectedGroup, 
      state.date
    );

    if(tabsForGroup.length) {
      return await processAllTabsForSelectedGroup();
    }
    
    state.isLoading = false;
    state.blueBar.message = false;
  }

  return {
    init,
    handleGroupChange
  };
} 