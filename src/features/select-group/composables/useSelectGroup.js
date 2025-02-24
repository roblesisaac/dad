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

  return {
    createNewGroup,
    editGroup,
    selectGroup
  };
} 