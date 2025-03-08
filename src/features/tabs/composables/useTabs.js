import { useApi } from '@/shared/composables/useApi.js';
import { useTabsAPI } from './useTabsAPI.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';
import { useTabProcessing } from './useTabProcessing.js';
import { nextTick } from 'vue';

export function useTabs() {
  const { state } = useDashboardState();
  const { processTabData, processAllTabsForSelectedGroup } = useTabProcessing();
  const api = useApi();
  const tabsAPI = useTabsAPI(api);

  /**
   * Select a tab and deselect the currently selected tab
   */
  async function selectTab(tabToSelect) {
    if(tabToSelect.isSelected) {
      return;
    }

    state.isLoading = true;
    const prevSelectedTab = state.selected.tab;

    tabToSelect.isSelected = true;
    await tabsAPI.updateTabSelection(tabToSelect._id, true);

    if(prevSelectedTab) {
      prevSelectedTab.isSelected = false;
      tabsAPI.updateTabSelection(prevSelectedTab._id, false);
    }

    handleTabChange(tabToSelect._id, prevSelectedTab._id);
    await nextTick();
    state.isLoading = false;
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
      api.put(`tabs/${selectedTab._id}`, { isSelected: false });
    }

    const newTabData = {
      tabName,
      showForGroup: [selectedGroup._id],
      isSelected: true,
      sort: tabsForGroup.length+1
    };

    const newTab = await tabsAPI.createTab(newTabData);

    state.allUserTabs.push(newTab);
    await processAllTabsForSelectedGroup();
  }

  /**
   * Handle tab selection change
   */
  function handleTabChange(newSelectedTabId, oldSelectedTabId) {
      if (newSelectedTabId === oldSelectedTabId) return;
      state.isLoading = true;
  
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
      
      // Update showForGroup in memory
      let isEnabled = false;
      if (tab.showForGroup.includes(groupId)) {
        // Disable tab for this group
        tab.showForGroup = tab.showForGroup.filter(id => id !== groupId);
      } else {
        // Enable tab for this group
        tab.showForGroup.push(groupId);
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
        if (isEnabled) {
          const enabledTabs = state.allUserTabs.filter(t => 
            t.showForGroup.includes(groupId)
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
    processAllTabsForSelectedGroup,
    toggleTabForGroup,
    updateTab
  };
} 