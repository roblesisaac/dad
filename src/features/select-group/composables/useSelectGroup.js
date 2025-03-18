import { useGroupsAPI } from './useGroupsAPI';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useTabProcessing } from '@/features/tabs/composables/useTabProcessing.js';
import { useTransactions } from '@/features/dashboard/composables/useTransactions.js';
import { useUtils } from '@/shared/composables/useUtils';

export function useSelectGroup() {
  const { state } = useDashboardState();
  const groupsAPI = useGroupsAPI();
  const { sortBy,waitUntilTypingStops } = useUtils();

  const { fetchTransactionsForGroup } = useTransactions();
  const { processAllTabsForSelectedGroup } = useTabProcessing();

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

  function formatAccounts(accounts) {
    const propsToKeep = ['_id', 'account_id', 'mask', 'current', 'available'];

    return accounts.map(account => {
      const accountData = {};
      propsToKeep.forEach(prop => accountData[prop] = account[prop] || account.balances?.[prop] || 0);
      return accountData;
    });
  }

  function numeric(value) {
    const number = parseFloat(value);
    return isNaN(number) ? 0 : number;
  }

  function sumOf(accounts, propName) {
    return accounts.reduce((acc, curr) => numeric(curr[propName]) + numeric(acc), 0);
  }

  function updateStateMemory(groupId, newGroupData) {
    const groupToUpdate = state.allUserGroups.find(group => group._id === groupId);
    groupToUpdate.totalAvailableBalance = newGroupData.totalAvailableBalance;
    groupToUpdate.totalCurrentBalance = newGroupData.totalCurrentBalance;
  }

  async function deleteGroup(groupToDelete) {
    if(!confirm('Remove Group?')) {
      return;
    }

    const idToRemove = groupToDelete._id;
    state.allUserGroups = state.allUserGroups.filter(group => group._id !== idToRemove);
    await groupsAPI.deleteGroup(idToRemove);
  }
  
  async function createNewGroup() {
    if(!confirm('Are you sure you want to create a new group?')) {
      return;
    }

    const newGroupData = {
      accounts: [],
      isSelected: false,
      name: `New Group ${state.allUserGroups.length}`
    };

    const savedNewGroup = await groupsAPI.createGroup(newGroupData);
    state.allUserGroups.push(savedNewGroup);
  }

  async function updateGroupName(updatedGroup) {
    await waitUntilTypingStops();
    await groupsAPI.updateGroup(updatedGroup._id, { 
      name: updatedGroup.name
    });
  }

  async function updateGroup(updatedGroup, previousGroup) {
    if(updatedGroup.name !== previousGroup.name) {
      await updateGroupName();
      return;
    }

    const accounts = formatAccounts(updatedGroup.accounts);

    const newGroupData = {
      name: updatedGroup.name,
      info: updatedGroup.info,
      accounts,
      totalCurrentBalance: sumOf(accounts, 'current'),
      totalAvailableBalance: sumOf(accounts, 'available')
    };

    updateStateMemory(updatedGroup._id, newGroupData);
    await groupsAPI.updateGroup(updatedGroup._id, newGroupData);
  }
  
  /**
   * Select a group and deselect others
   */
  async function selectGroup(groupToSelect) {
    state.isLoading = true;
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

    await handleGroupChange();
    
    return groupToSelect;
  }

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

  async function updateGroupSort(groupId, sort) {
    await groupsAPI.updateGroupSort(groupId, sort);
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
        alert('No groups found. Please create a group first.');
        return;
      }
      // selectedGroup = await selectFirstGroup(state.allUserGroups);
    }
    state.isLoading = true;
    
    // Fetch transactions for all accounts in the selected group
    state.selected.allGroupTransactions = await fetchTransactionsForGroup(
      selectedGroup, 
      state.date
    );

    if(tabsForGroup.length) {
      return await processAllTabsForSelectedGroup();
    }
    
    state.isLoading = false;
  }

  return {
    createNewGroup,
    deleteGroup,
    fetchGroupsAndAccounts,
    handleGroupChange,
    selectGroup,
    selectFirstGroup,
    updateGroupName,
    updateGroup,
    updateGroupSort
  };
} 