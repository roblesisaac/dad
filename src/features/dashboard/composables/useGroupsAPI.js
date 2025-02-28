import { useApi } from '@/shared/composables/useApi.js';

/**
 * Groups API operations
 * This composable handles all API interactions related to account groups
 */
export function useGroupsAPI() {
  const api = useApi();

  /**
   * Fetch all groups and accounts
   */
  async function fetchGroupsAndAccounts() {
    const response = await api.get('/plaid/sync/accounts/and/groups');
    if (!response) return { groups: [], accounts: [] };
    
    const { groups, accounts } = response;
    return { groups, accounts };
  }

  /**
   * Create a new group
   */
  async function createGroup(groupData) {
    return await api.post('groups', groupData);
  }

  /**
   * Update a group's properties
   */
  async function updateGroup(groupId, updateData) {
    return await api.put(`groups/${groupId}`, updateData);
  }

  /**
   * Delete a group
   */
  async function deleteGroup(groupId) {
    return await api.delete(`groups/${groupId}`);
  }

  /**
   * Set a group as selected and deselect others
   */
  async function selectGroup(groupId) {
    return await api.put(`groups/${groupId}`, { isSelected: true });
  }

  /**
   * Deselect a group
   */
  async function deselectGroup(groupId) {
    return await api.put(`groups/${groupId}`, { isSelected: false });
  }

  return {
    fetchGroupsAndAccounts,
    createGroup,
    updateGroup,
    deleteGroup,
    selectGroup,
    deselectGroup
  };
} 