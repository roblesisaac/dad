import { useApi } from '@/shared/composables/useApi';

export function useSelectGroup(state, App, isEditing) {
  const api = useApi();

  async function createNewGroup() {
    if(!confirm('Are you sure you want to create a new group?')) {
      return;
    }

    const newGroupData = {
      accounts: [],
      isSelected: false,
      name: `New Group ${state.allUserGroups.length}`
    }

    const savedNewGroup = await api.post('groups', newGroupData);
    state.allUserGroups.push(savedNewGroup);
  }

  async function fetchLinkToken() {
    if(state.linkToken) {
      return;
    }
    
    try {
      const fetchedLinkToken = await api.post('plaid/connect/link');
      state.linkToken = fetchedLinkToken;
    } catch (err) {
      console.log(err);
    }
  }

  function createLink() {
    return Plaid.create({
      token: state.linkToken,
      onSuccess: async function(publicToken) {
        const { accounts, groups } = await api.post('plaid/exchange/token', { publicToken });
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
    state.editingGroup = group;
    isEditing.value = true;
  }

  async function selectGroup(groupToSelect) {
    const selectedGroup = state.selected.group;

    if(selectedGroup) {
      await api.put(`groups/${selectedGroup._id}`, { isSelected: false });          
      selectedGroup.isSelected = false;
    }

    await api.put(`groups/${groupToSelect._id}`, { isSelected: true });
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