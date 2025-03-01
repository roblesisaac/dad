import { useRouter } from 'vue-router';
import { useTabs } from '@/features/tabs/composables/useTabs.js';
import { useDashboardState } from './useDashboardState.js';
import { useApi } from '@/shared/composables/useApi.js';
import { nextTick } from 'vue';

/**
 * Dashboard-specific tab operations composable
 * Acts as a bridge between dashboard components and tabs feature
 */
export function useDashboardTabs() {
  const { state } = useDashboardState();
  const { updateTabSort } = useTabs();
  const router = useRouter();
  const api = useApi();
  
  /**
   * Select a tab from a dashboard component
   * @param {Object} tabToSelect - The tab to select
   */
  function selectTab(tabToSelect) {
    if (tabToSelect.isSelected) {
      return;
    }
    
    const currentlySelectedTab = state.selected.tab;

    if (currentlySelectedTab) {
      currentlySelectedTab.isSelected = false;
      api.put(`tabs/${currentlySelectedTab._id}`, { isSelected: false });
    }

    nextTick(() => {
      tabToSelect.isSelected = true;
      api.put(`tabs/${tabToSelect._id}`, { isSelected: true });
    });
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
  
  return {
    selectTab,
    editTab,
    isTabShared,
    getUniqueTabClassName,
    updateTabSort
  };
} 