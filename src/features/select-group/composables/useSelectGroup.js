import { useGroupsAPI } from '@/features/dashboard/composables/useGroupsAPI.js';
import { useRoute } from 'vue-router';

export function useSelectGroup(state, isEditing) {
  const route = useRoute();
  const groupsAPI = useGroupsAPI();
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
    isEditing.value = true;
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
    route.back();
  }

  /**
   * Update a group's properties
   */
  async function updateGroup(group, groupData) {
    await groupsAPI.updateGroup(group._id, groupData);
    
    // Update the group object with new data
    Object.assign(group, groupData);
  }

  return {
    createNewGroup,
    editGroup,
    selectGroup,
    updateGroup
  };
} 