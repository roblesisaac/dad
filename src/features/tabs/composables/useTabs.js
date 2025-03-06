import { useApi } from '@/shared/composables/useApi.js';
import { useTabsAPI } from './useTabsAPI.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';
import { useTabProcessing } from './useTabProcessing.js';
import { useRouter } from 'vue-router';

export function useTabs() {
  const { state } = useDashboardState();
  const { processTabData } = useTabProcessing();
  const api = useApi();
  const router = useRouter();
  const tabsAPI = useTabsAPI(api);

  /**
   * Find selected tabs in a group
   */
  function selectedTabsInGroup(tabsForGroup) {
    return tabsForGroup?.filter(tab => tab.isSelected) || [];
  }

  /**
   * Select the first tab in a group
   */
  async function selectFirstTab(tabsForGroup) {
    const firstTab = tabsForGroup[0];
    if (!firstTab) return;

    firstTab.isSelected = true;
    await tabsAPI.updateTabSelection(firstTab._id, true);
    return firstTab;
  }

  /**
   * Deselect all tabs except the first one
   */
  async function deselectOtherTabs(selectedTabs) {
    if (!selectedTabs?.length) return;
    
    for(const tab of selectedTabs.splice(1)) {
      tab.isSelected = false;
      await tabsAPI.updateTabSelection(tab._id, false);
    }
  }

  /**
   * Select a tab and deselect the currently selected tab
   */
  async function selectTab(tabToSelect, shouldRedirect = true) {
    if(tabToSelect.isSelected) {
      if(shouldRedirect) router.back();
      return;
    }

    const currentlySelectedTab = state.selected.tab;

    if(currentlySelectedTab) {
      currentlySelectedTab.isSelected = false;
      await tabsAPI.updateTabSelection(currentlySelectedTab._id, false);
    }

    tabToSelect.isSelected = true;
    await tabsAPI.updateTabSelection(tabToSelect._id, true);
    if(shouldRedirect) router.back();
  }

   /**
   * Process data for all tabs in the selected group
   */
  async function processAllTabsForSelectedGroup() {
    const tabsForGroup = state.selected.tabsForGroup;
    if(!tabsForGroup?.length) return;

    state.isLoading = true;

    const selectedTabs = selectedTabsInGroup(tabsForGroup);

    if(selectedTabs.length < 1) {
      await selectFirstTab(tabsForGroup);
    }

    if(selectedTabs.length > 1) {
      await deselectOtherTabs(selectedTabs);
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
   * Create a new tab for the dashboard using a prompt
   * @param {Array} allUserTabs - Array to add the new tab to
   * @param {Object} selectedGroup - The currently selected group
   * @param {Object} selectedTab - The currently selected tab
   * @param {Array} tabsForGroup - Tabs for the current group
   * @param {Function} postCreateCallback - Function to call after tab is created
   * @returns {Object|null} The created tab or null if creation was canceled
   */
  async function createDashboardTab(allUserTabs, selectedGroup, selectedTab, tabsForGroup, postCreateCallback) {
    // Only run on dashboard page
    if(location.pathname !== '/dashboard') return null;

    // Generate tab name suggestion
    let tabName = `Tab ${tabsForGroup.length+1}`;
    
    // Prompt for tab name
    const response = prompt('What would you like to name this tab?', tabName);
    if(!response) return null;
    tabName = response;

    // Ensure we have a group selected
    if(!selectedGroup) return null;

    // Deselect previous tab if it exists
    if(selectedTab) {
      selectedTab.isSelected = false;
      await tabsAPI.updateTabSelection(selectedTab._id, false);
    }

    // Create the new tab
    const newTab = await tabsAPI.createTab({
      tabName,
      showForGroup: [selectedGroup._id],
      isSelected: true,
      sort: tabsForGroup.length+1
    });

    // Add to tabs array
    allUserTabs.push(newTab);
    
    // Run callback if provided
    if (postCreateCallback) {
      await postCreateCallback();
    }
    
    return newTab;
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
    
    const currentRoute = router.currentRoute.value;    
    if(currentRoute.name === 'dashboard') {
      return
    }

    router.back();
  }

  /**
   * Remove a group from a tab and deselect it
   */
  async function removeAndDeselectGroupFromTab(tab, groupId) {
    const showForGroup = tab.showForGroup
      .filter(id => id !== groupId);

    await tabsAPI.updateTab(tab._id, {
      isSelected: false,
      showForGroup
    });

    tab.isSelected = false;
    tab.showForGroup = showForGroup;
  }

  /**
   * Find a tab by ID in a list of tabs
   */
  function findTab(tabId, tabs) {
    return tabs.find(tab => tab._id === tabId);
  }

  /**
   * Save tab groups
   */
  async function saveTabGroups(tab) {
    const { _id, showForGroup } = tab;
    await tabsAPI.updateTab(_id, { showForGroup });
  }

    /**
   * Handle tab selection change
   */
  function handleTabChange(newSelectedTabId, oldSelectedTabId) {
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
    createDashboardTab,
    handleTabChange,
    findTab,
    saveTabGroups,
    selectedTabsInGroup,
    selectFirstTab,
    deselectOtherTabs,
    processAllTabsForSelectedGroup,
    toggleTabForGroup,
    updateTab
  };
} 