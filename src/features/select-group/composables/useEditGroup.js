import { useRouter } from 'vue-router';
import { useGroupsAPI } from './useGroupsAPI';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useUtils } from '@/shared/composables/useUtils';

export function useEditGroup() {
  const { state } = useDashboardState();
  const groupsAPI = useGroupsAPI();
  const router = useRouter();
  const { waitUntilTypingStops } = useUtils();

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

  /**
   * Create a new account group
   */
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

  /**
   * Select a group and navigate back
   */
  async function selectGroup(groupToSelect) {
    const selectedGroup = state.selected.group;

    if(selectedGroup) {
      await groupsAPI.deselectGroup(selectedGroup._id);          
      selectedGroup.isSelected = false;
    }

    await groupsAPI.selectGroup(groupToSelect._id);
    groupToSelect.isSelected = true;
    router.back();
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

  async function updateGroupSort(groupId, sort) {
    await groupsAPI.updateGroupSort(groupId, sort);
  }

  return {
    createNewGroup,
    deleteGroup,
    selectGroup,
    updateGroupName,
    updateGroup,
    updateGroupSort
  };
} 