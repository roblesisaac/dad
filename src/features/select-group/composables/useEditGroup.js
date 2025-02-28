import { useRouter } from 'vue-router';
import { useGroupsAPI } from '@/features/dashboard/composables/useGroupsAPI';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';

export function useEditGroup() {
  const { state } = useDashboardState();
  const groupsAPI = useGroupsAPI();
  const router = useRouter();
  const editGroupState = {
    typingTimer: null
  };

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

  function updateMemory(newGroupData) {
    const groupToUpdate = state.allUserGroups.find(group => group._id === state.editingGroup._id);
    groupToUpdate.totalAvailableBalance = newGroupData.totalAvailableBalance;
    groupToUpdate.totalCurrentBalance = newGroupData.totalCurrentBalance;
  }

  function waitUntilTypingStops(ms=500) {
    return new Promise((resolve) => {
      clearTimeout(editGroupState.typingTimer);
      editGroupState.typingTimer = setTimeout(resolve, ms);
    });
  }

  async function deleteGroup() {
    if(!confirm('Remove Group?')) {
      return;
    }

    const idToRemove = state.editingGroup._id;
    router.back();
    state.editingGroup = null;
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
   * Enter edit mode for a group
   */
  function editGroup(group) {
    state.editingGroup = group;
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

  async function updateGroupName() {
    await waitUntilTypingStops();
    await groupsAPI.updateGroup(state.editingGroup._id, { 
      name: state.editingGroup.name
    });
  }

  async function updateGroup() {
    const accounts = formatAccounts(state.editingGroup.accounts);

    const newGroupData = {
      name: state.editingGroup.name,
      info: state.editingGroup.info,
      accounts,
      totalCurrentBalance: sumOf(accounts, 'current'),
      totalAvailableBalance: sumOf(accounts, 'available')
    };

    updateMemory(newGroupData);
    await groupsAPI.updateGroup(state.editingGroup._id, newGroupData);
  }

  return {
    createNewGroup,
    deleteGroup,
    editGroup,
    selectGroup,
    updateGroupName,
    updateGroup
  };
} 