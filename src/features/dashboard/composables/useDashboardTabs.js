import { useRouter } from 'vue-router';
import { useTabs } from '@/features/tabs/composables/useTabs.js';

/**
 * Dashboard-specific tab operations composable
 * Acts as a bridge between dashboard components and tabs feature
 */
export function useDashboardTabs() {
  const { updateTabSort, selectTab: selectTabInTabs } = useTabs();
  const router = useRouter();
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
  
  return {
    selectTab,
    editTab,
    isTabShared,
    getUniqueTabClassName,
    updateTabSort
  };
} 