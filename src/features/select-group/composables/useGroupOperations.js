import { nextTick } from 'vue';
import { useGroupsAPI } from './useGroupsAPI.js';
import { useUtils } from '@/shared/composables/useUtils.js';
import { useTabs } from '../../tabs/composables/useTabs.js';
import { useDashboardState } from '../../dashboard/composables/useDashboardState.js';
import { useRouter } from 'vue-router';
import { useTransactions } from '../../dashboard/composables/useTransactions.js';

/**
 * Composable for group operations
 * Handles business logic related to groups
 */
export function useGroupOperations() {
  const groupsAPI = useGroupsAPI();
  const { sortBy } = useUtils();
  const { processAllTabsForSelectedGroup } = useTabs();
  const { state } = useDashboardState();
  const router = useRouter();
  const { fetchTransactionsForGroup } = useTransactions();
  /**
   * Select the first group in a list
   */
  async function selectFirstGroup(allGroups) {
    const firstGroup = allGroups[0];
    if (!firstGroup) return null;
    
    firstGroup.isSelected = true;
    await groupsAPI.updateGroupSelection(firstGroup._id, true);
    return firstGroup;
  }
  
  /**
   * Fetch groups and accounts data
   */
  async function fetchGroupsAndAccounts() {
    const { groups, accounts } = await groupsAPI.fetchGroupsAndAccounts();
    
    if (groups) {
      // Sort groups by sort order
      return {
        groups: groups.sort(sortBy('sort')),
        accounts
      };
    }
    
    return { groups, accounts };
  }
  
  /**
   * Create a new group
   */
  async function createGroup(groupData) {
    return await groupsAPI.createGroup(groupData);
  }
  
  /**
   * Delete a group
   */
  async function deleteGroup(groupId) {
    return await groupsAPI.deleteGroup(groupId);
  }
  
  /**
   * Select a group and deselect others
   */
  async function selectGroup(groupToSelect) {
    const allGroups = state.allUserGroups;
    // First deselect all groups
    for (const group of allGroups) {
      if (group.isSelected && group._id !== groupToSelect._id) {
        group.isSelected = false;
        await groupsAPI.updateGroupSelection(group._id, false);
      }
    }
    
    // Select the target group
    groupToSelect.isSelected = true;
    await groupsAPI.updateGroupSelection(groupToSelect._id, true);
    
    return groupToSelect;
  }

  /**
   * Handle group selection change
   */
  async function handleGroupChange() {
    let selectedGroup = state.selected.group;
    const tabsForGroup = state.selected.tabsForGroup;

    if(state.date.start > state.date.end) return;

    if(!selectedGroup) {
      if(!state.allUserGroups.length) {
        router.push({ name: 'select-group' });
        return;
      }
      selectedGroup = await selectFirstGroup(state.allUserGroups);
    }
    state.isLoading = true;
    
    // Fetch transactions for all accounts in the selected group
    state.selected.allGroupTransactions = await fetchTransactionsForGroup(
      selectedGroup, 
      state.date
    );

    if(!!tabsForGroup.length) {
      return await processAllTabsForSelectedGroup();
    }
    
    nextTick(async () => {
      // await createNewTab();
      state.isLoading = false;
    });
  }
  
  return {
    fetchGroupsAndAccounts,
    handleGroupChange,
    createGroup,
    deleteGroup,
    selectGroup,
    selectFirstGroup
  };
} 