import { useAppStore } from '@/stores/state';

export function useSelectGroup(state, App, isEditing) {
  const { api } = useAppStore();

  async function createNewGroup() {
    if(!confirm('Are you sure you want to create a new group?')) {
      return;
    }

    const newGroupData = {
      accounts: [],
      isSelected: false,
      name: `New Group ${state.allUserGroups.length}`
    }

    const savedNewGroup = await api.post('api/groups', newGroupData);
    state.allUserGroups.push(savedNewGroup);
  }

  async function fetchLinkToken() {
    if(state.linkToken) {
      return;
    }
    
    try {
      const fetchedLinkToken = await api.post('api/plaid/connect/link');
      state.linkToken = fetchedLinkToken;
    } catch (err) {
      console.log(err);
    }
  }

  function createLink() {
    return Plaid.create({
      token: state.linkToken,
      onSuccess: async function(publicToken) {
        const { accounts, groups } = await api.post('api/plaid/exchange/token', { publicToken });
        state.allUserGroups = [ ...state.allUserGroups, ...groups ];
        state.allUserAccounts = [ ...state.allUserAccounts, ...accounts ];
        App.checkSyncStatus();
      },
      onExit: function(err, metadata) {
        console.log('Link exit:', { err, metadata });
      },
    });
  }

  function editGroup(group) {
    console.log('editGroup', group);
    state.editingGroup = group;
    isEditing.value = true;
  }

  async function selectGroup(groupToSelect) {
    const selectedGroup = state.selected.group;

    if(selectedGroup) {
      await api.put(`api/groups/${selectedGroup._id}`, { isSelected: false });          
      selectedGroup.isSelected = false;
    }

    await api.put(`api/groups/${groupToSelect._id}`, { isSelected: true });
    groupToSelect.isSelected = true;
    App.goBack();
  }

  async function linkNewAccount() {
    const link = createLink();
    link.open();
  }

  async function init() {
    await fetchLinkToken();
  }

  return {
    createNewGroup,
    editGroup,
    init,
    linkNewAccount,
    selectGroup
  };
} 