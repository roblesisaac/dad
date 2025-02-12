import { useAppStore } from '@/stores/state';

export function useSelectGroup(state) {
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
      },
      onExit: function(err, metadata) {
        console.log('Link exit:', { err, metadata });
      },
    });
  }

  return {
    createNewGroup,
    fetchLinkToken,
    createLink
  };
} 