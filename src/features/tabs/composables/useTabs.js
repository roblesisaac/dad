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

let createDefaultTabsPromise = null;

export function useTabs() {
  const { state } = useDashboardState();
  const { processTabData, processAllTabsForSelectedGroup } = useTabProcessing();
  const tabsAPI = useTabsAPI();
  const rulesAPI = useRulesAPI();

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
    const processed = processTabData(tabToSelect);
    if(processed) {
      tabToSelect.categorizedItems = processed.categorizedItems;
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
    newTab.isSelected = false;

    state.allUserTabs.push(newTab);
    await processAllTabsForSelectedGroup();
    await selectTab(newTab);
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
    ensureDefaultTabsForTabView,
    toggleTabForGroup,
    updateTab
  };
} 
