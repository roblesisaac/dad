import { useRouter } from 'vue-router';
import { useTabs } from '@/features/tabs/composables/useTabs.js';
import { useDashboardState } from './useDashboardState.js';
import { useApi } from '@/shared/composables/useApi.js';

/**
 * Dashboard-specific tab operations composable
 * Acts as a bridge between dashboard components and tabs feature
 */
export function useDashboardTabs() {
  const { state } = useDashboardState();
  const { updateTabSort: updateTabSortInTabs, selectTab: selectTabInTabs } = useTabs();
  const router = useRouter();
  const api = useApi();
  
  /**
   * Select a tab from a dashboard component
   * @param {Object} tabToSelect - The tab to select
   */
  function selectTab(tabToSelect) {
    selectTabInTabs(tabToSelect, false);
  }
  
  /**
   * Navigate to the tab edit page
   */
  function editTab() {
    router.push({ name: 'edit-tab' });
  }
  
  /**
   * Check if a tab is shared with multiple groups or globally
   * @param {Object} tab - The tab to check
   * @returns {boolean} True if the tab is shared
   */
  function isTabShared(tab) {
    return tab.showForGroup.length > 1 || tab.showForGroup.includes('_GLOBAL');
  }
  
  /**
   * Format a string to be used as a CSS class name
   * @param {string} inputString - The string to format
   * @returns {string} A valid CSS class name
   */
  function getUniqueTabClassName(inputString) {
    return inputString.replace(/[:\-]/g, '_');
  }

  /**
   * Update a tab's sort order in both the backend and local state
   * @param {string} tabId - The ID of the tab to update
   * @param {number} newSort - The new sort order
   */
  async function updateTabSort(tabId, newSort) {
    // Find the tab in all tabs
    const tabToUpdate = state.allUserTabs.find(tab => tab._id === tabId);
    
    if (tabToUpdate) {
      // Update local sort value
      tabToUpdate.sort = newSort;
      
      // Call the API to update on backend
      await api.put(`tabs/${tabId}`, { sort: newSort });
    }
  }
  
  /**
   * Reorder all tabs after dragging
   * @param {Array} tabs - The new order of tabs
   */
  function updateTabsOrder(tabs) {
    if (!tabs || !tabs.length) return;
    
    // Update sort values to match new positions
    tabs.forEach((tab, index) => {
      // Only update if the sort value has changed
      if (tab.sort !== index) {
        tab.sort = index;
        // Update in backend without waiting
        api.put(`tabs/${tab._id}`, { sort: index });
      }
    });
  }
  
  return {
    selectTab,
    editTab,
    isTabShared,
    getUniqueTabClassName,
    updateTabSort,
    updateTabsOrder
  };
} 