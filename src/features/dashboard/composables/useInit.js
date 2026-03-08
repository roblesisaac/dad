import { useDashboardState } from './useDashboardState.js';
import { useApi } from '@/shared/composables/useApi.js';
import { useTabsAPI } from '@/features/tabs/composables/useTabsAPI.js';
import { useRulesAPI } from '@/features/rule-manager/composables/useRulesAPI.js';
import { useSelectGroup } from '@/features/select-group/composables/useSelectGroup.js';
import { usePlaidSync } from '@/shared/composables/usePlaidSync';
import loadScript from '@/shared/utils/loadScript.js';
import { normalizeTabWithDrillSchema } from '@/features/tabs/utils/drillSchema.js';
import { ALL_ACCOUNTS_GROUP_ID } from '@/features/dashboard/constants/groups.js';


/**
 * Composable for dashboard state management
 * Manages the state of the dashboard and delegates operations to specialized composables
 */
export function useInit() {
  // Initialize API
  const api = useApi();
  const { state } = useDashboardState();
  const { syncLatestTransactionsForAllBanks } = usePlaidSync();
  let pendingPostInitWorkflow = null;

  // Initialize API composables
  const tabsAPI = useTabsAPI(api);
  const rulesAPI = useRulesAPI(api);
  const { fetchGroupsAndAccounts, handleGroupChange } = useSelectGroup();

  function mergeRuntimeTabStateWithFetchedTabs(fetchedTabs = []) {
    const existingTabsById = new Map(
      (Array.isArray(state.allUserTabs) ? state.allUserTabs : [])
        .map((tab) => [String(tab?._id || ''), tab])
        .filter(([tabId]) => Boolean(tabId))
    );

    return fetchedTabs.map((tab) => {
      const tabId = String(tab?._id || '');
      const existingTab = existingTabsById.get(tabId);
      if (!existingTab) {
        return tab;
      }

      const existingTotal = Number(existingTab?.total);
      const fetchedTotal = Number(tab?.total);
      const existingOverriddenCount = Number(existingTab?.overriddenRecategorizeCount);
      const fetchedOverriddenCount = Number(tab?.overriddenRecategorizeCount);

      return {
        ...tab,
        isSelected: Boolean(existingTab?.isSelected),
        categorizedItems: Array.isArray(existingTab?.categorizedItems)
          ? existingTab.categorizedItems
          : (Array.isArray(tab?.categorizedItems) ? tab.categorizedItems : []),
        hiddenItems: Array.isArray(existingTab?.hiddenItems)
          ? existingTab.hiddenItems
          : (Array.isArray(tab?.hiddenItems) ? tab.hiddenItems : []),
        groupByMode: String(existingTab?.groupByMode || tab?.groupByMode || 'category'),
        total: Number.isFinite(existingTotal)
          ? existingTotal
          : (Number.isFinite(fetchedTotal) ? fetchedTotal : 0),
        overriddenRecategorizeCount: Number.isFinite(existingOverriddenCount)
          ? existingOverriddenCount
          : (Number.isFinite(fetchedOverriddenCount) ? fetchedOverriddenCount : 0)
      };
    });
  }

  async function waitForPendingPostInitWorkflow() {
    if (!pendingPostInitWorkflow) {
      return;
    }

    try {
      await pendingPostInitWorkflow;
    } catch (_error) {
      // Ignore previous post-init errors so a new refresh can proceed.
    }
  }

  function setPendingPostInitWorkflow(workflowPromise) {
    const trackedWorkflow = workflowPromise.finally(() => {
      if (pendingPostInitWorkflow === trackedWorkflow) {
        pendingPostInitWorkflow = null;
      }
    });

    pendingPostInitWorkflow = trackedWorkflow;
    return trackedWorkflow;
  }

  async function fetchTabsAndRules() {
    try {
      const [tabs, rules] = await Promise.all([
        tabsAPI.fetchUserTabs(),
        rulesAPI.fetchUserRules()
      ]);

      const safeTabs = Array.isArray(tabs) ? tabs : [];
      const safeRules = Array.isArray(rules) ? rules : [];
      const pendingMigrationUpdates = [];

      const normalizedTabs = safeTabs.map((tab) => {
        const hasStoredSchema = Boolean(
          tab
            && Object.prototype.hasOwnProperty.call(tab, 'drillSchema')
            && tab.drillSchema
            && Array.isArray(tab.drillSchema.levels)
        );

        const normalizedTab = normalizeTabWithDrillSchema(tab, safeRules);
        const shouldPersistSchema = !hasStoredSchema;

        if (shouldPersistSchema && tab?._id) {
          pendingMigrationUpdates.push(
            tabsAPI.updateTab(tab._id, {
              drillSchema: normalizedTab.drillSchema
            })
          );
        }

        return normalizedTab;
      });

      if (pendingMigrationUpdates.length) {
        await Promise.allSettled(pendingMigrationUpdates);
      }

      state.allUserTabs = mergeRuntimeTabStateWithFetchedTabs(normalizedTabs);
      state.allUserRules = safeRules;
    } catch (error) {
      console.error('Error fetching tabs/rules:', error);
    }
  }

  function applyPreferredGroupSelection(groups, preferredGroupId, accounts = []) {
    if (!Array.isArray(groups) || !groups.length) {
      return;
    }

    const normalizedPreferredGroupId = String(preferredGroupId || '').trim();
    if (normalizedPreferredGroupId === ALL_ACCOUNTS_GROUP_ID) {
      groups.forEach((group) => {
        group.isSelected = false;
      });

      state.selected.groupOverride = {
        _id: ALL_ACCOUNTS_GROUP_ID,
        name: 'All Accounts',
        isVirtualAllAccounts: true,
        accounts
      };
      return;
    }

    state.selected.groupOverride = null;

    if (!normalizedPreferredGroupId) {
      return;
    }

    const preferredGroup = groups.find(group => group?._id === normalizedPreferredGroupId);
    if (!preferredGroup) {
      return;
    }

    groups.forEach((group) => {
      group.isSelected = group._id === normalizedPreferredGroupId;
    });
  }

  async function init(options = {}) {
    const {
      preferredGroupId = '',
      prioritizeFirstPaint = true,
      awaitPostInitWorkflow = false,
      runPlaidSync = true,
      preserveSelectedTab = false
    } = options;
    try {
      state.isInitialized = false;
      state.blueBar.message = 'Beginning sync';
      state.blueBar.loading = true;

      const plaidScriptPromise = loadScript('https://cdn.plaid.com/link/v2/stable/link-initialize.js')
        .catch((error) => {
          console.error('Failed to load Plaid script:', error);
        });

      try {
        const { groups, accounts, itemsNeedingReauth } = await fetchGroupsAndAccounts();

        // Store items needing reauth in state
        if (itemsNeedingReauth && itemsNeedingReauth.length > 0) {
          state.itemsNeedingReauth = itemsNeedingReauth;
          const count = itemsNeedingReauth.length;
          state.blueBar.message = `${count} bank connection${count > 1 ? 's need' : ' needs'} to be reconnected`;
        }

        if (!groups || groups.length === 0 || !accounts || accounts.length === 0) {
          state.blueBar.message = null;
          state.blueBar.loading = false;
          state.isOnboarding = true;
          state.isLoading = false;
          return;
        }

        applyPreferredGroupSelection(groups, preferredGroupId, accounts || []);

        state.allUserAccounts = accounts;
        state.allUserGroups = groups;

        if (prioritizeFirstPaint) {
          state.isInitialized = true;
          state.isLoading = false;

          await waitForPendingPostInitWorkflow();

          const postInitWorkflow = (async () => {
            await fetchTabsAndRules();
            await handleGroupChange({
              showLoading: false,
              preserveSelectedTab
            });
            if (runPlaidSync) {
              await syncLatestTransactionsForAllBanks();
            }
          });

          const trackedWorkflow = setPendingPostInitWorkflow(postInitWorkflow);

          if (awaitPostInitWorkflow) {
            await trackedWorkflow;
          } else {
            void trackedWorkflow.catch((backgroundError) => {
              console.error('Background init workflow error:', backgroundError);
            });
          }
        } else {
          await waitForPendingPostInitWorkflow();
          await fetchTabsAndRules();
          await handleGroupChange({ preserveSelectedTab });
          state.isInitialized = true;

          if (runPlaidSync) {
            syncLatestTransactionsForAllBanks().catch((syncError) => {
              console.error('Background sync error:', syncError);
            });
          }
        }

        void plaidScriptPromise;
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
