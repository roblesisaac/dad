import { useApi } from '@/shared/composables/useApi';

export function useEditGroup(state) {
  const api = useApi();
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
    state.views.pop();
    state.editingGroup = null;
    state.allUserGroups = state.allUserGroups.filter(group => group._id !== idToRemove);
    await api.delete(`api/groups/${idToRemove}`);
  }

  async function updateGroupName() {
    await waitUntilTypingStops();
    await api.put(`api/groups/${state.editingGroup._id}`, {
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
    await api.put(`api/groups/${state.editingGroup._id}`, newGroupData);
  }

  return {
    deleteGroup,
    updateGroupName,
    updateGroup
  };
} 