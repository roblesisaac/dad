import { useDashboardState } from './useDashboardState.js';
import { useRouter } from 'vue-router';
import { useApi } from '@/shared/composables/useApi.js';
import { useTabsAPI } from '@/features/tabs/composables/useTabsAPI.js';
import { useRulesAPI } from '@/features/rule-manager/composables/useRulesAPI.js';
import { useSelectGroup } from '@/features/select-group/composables/useSelectGroup.js';
import { usePlaidSync } from '@/shared/composables/usePlaidSync';
import loadScript from '@/shared/utils/loadScript.js';


/**
 * Composable for dashboard state management
 * Manages the state of the dashboard and delegates operations to specialized composables
 */
export function useInit() {
  // Initialize API and router
  const api = useApi();
  const router = useRouter();
  const { state } = useDashboardState();
  const { syncLatestTransactionsForAllBanks } = usePlaidSync();
  
  // Initialize API composables
  const tabsAPI = useTabsAPI(api);
  const rulesAPI = useRulesAPI(api);
  const { fetchGroupsAndAccounts, handleGroupChange } = useSelectGroup();

  async function init() {
    try {
      state.isInitialized = false;
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
        state.isInitialized = true;
        // await syncLatestTransactionsForAllBanks();
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

  return {
    init
  };
} 