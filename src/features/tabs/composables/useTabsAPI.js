import { useApi } from '@/shared/composables/useApi';
/**
 * Tab API operations
 * This composable handles all API interactions related to tabs
 */
export function useTabsAPI() {
  const api = useApi();
  /**
   * Fetch all tabs for the user
   */
  async function fetchUserTabs() {
    const tabs = await api.get('tabs');
    return tabs || [];
  }

  /**
   * Update a tab's selection state
   */
  async function updateTabSelection(tabId, isSelected) {
    return await api.put(`tabs/${tabId}`, { isSelected });
  }

  /**
   * Update a tab's sort order
   */
  async function updateTabSort(tabId, newSort) {
    return await api.put(`tabs/${tabId}`, { sort: newSort });
  }

  /**
   * Create a new tab
   */
  async function createTab(tabData) {
    return await api.post('tabs', tabData);
  }

  /**
   * Delete a tab
   */
  async function deleteTab(tabId) {
    return await api.delete(`tabs/${tabId}`);
  }

  /**
   * Update a tab
   */
  async function updateTab(tabId, updateData) {
    return await api.put(`tabs/${tabId}`, updateData);
  }

  async function updateTabName(tabId, newName) {
    return await api.put(`tabs/${tabId}`, { tabName: newName });
  }

  return {
    fetchUserTabs,
    updateTabSelection,
    updateTabSort,
    createTab,
    deleteTab,
    updateTab,
    updateTabName
  };
} 