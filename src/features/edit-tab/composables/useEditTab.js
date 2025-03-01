import { useRouter } from 'vue-router';
import { useUtils } from '@/features/dashboard/composables/useUtils.js';
import { useTabsAPI } from '../../tabs/composables/useTabsAPI';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { computed } from 'vue';

export function useEditTab(editState) {
  const { state } = useDashboardState();
  const router = useRouter();
  const { waitUntilTypingStops } = useUtils();
  const tabsAPI = useTabsAPI();

  /**
   * Selected tab computed property
   */
  const selectedTab = computed(() => state.selected.tab);

  /**
   * Computed property for groups not included in the tab
   */
  const unselectedGroupsInTab = computed(() => {
    return state.allUserGroups
      .filter(group => !selectedTab.value.showForGroup.includes(group._id))
      .map(group => group._id);
  });

  /**
   * Get a group name by its ID
   */
  function getGroupName(groupId) {
    return state.allUserGroups.find(group => group._id === groupId)?.name;
  }

  /**
   * Toggle rule type selection
   */
  function select(ruleType) {
    if (!editState) return;
    
    editState.selectedRuleType = editState.selectedRuleType === ruleType 
      ? '' 
      : ruleType;
  }

  /**
   * Clone rules from one tab to another
   */
  async function cloneRules(newTabId, sourceTabId, allUserRules) {
    const newRules = [];
    
    for(const rule of allUserRules) {
      if(!rule.applyForTabs.includes(sourceTabId)) {
        continue;
      }

      const newRule = { 
        rule: rule.rule,
        _isImportant: rule._isImportant,
        orderOfExecution: rule.orderOfExecution,
        applyForTabs: [newTabId]
      };

      const savedRule = await rulesAPI.createRule(newRule);
      newRules.push(savedRule);
    }
    
    return newRules;
  }

  /**
   * Create a copy of a tab
   */
  async function createNewTabCopy(sourceTab, baseName) {
    return await tabsAPI.createTab({
      tabName: `${baseName} Copy`,
      showForGroup: [...sourceTab.showForGroup],
      isSelected: true,
      sort: sourceTab.sort + 1
    });
  }

  /**
   * Delete a tab
   */
  async function deleteTab() {
    if(!confirm('You sure?')) {
      return;
    }
    const tab = state.selected.tab;
    const tabIndex = state.allUserTabs.findIndex(t => t._id === tab._id);
    
    state.allUserTabs.splice(tabIndex, 1);
    tabsAPI.deleteTab(tab._id);
    const firstTab = state.selected.tabsForGroup[0];
    firstTab.isSelected = true;
    tabsAPI.updateTabSelection(firstTab._id, true);

    router.push({ name: 'dashboard' });
  }

  /**
   * Duplicate a tab with its rules
   */
  async function duplicateTab(tab, allUserTabs, allUserRules) {
    const tabName = tab.tabName;
    const promptValue = prompt(`Please enter the tabName ('${tabName}') to duplicate.`);

    if(promptValue !== tabName) {
      return;
    }

    state.blueBar.message = 'Duplicating Tab';
    state.blueBar.loading = true;
    state.isLoading = true;
    router.back()

    // Create a new tab
    const newTab = await createNewTabCopy(tab, tabName);
    
    state.blueBar.message = 'Cloning Rules';
    
    // Clone rules for the new tab
    await cloneRules(newTab._id, tab._id, allUserRules);

    // Deselect the current tab
    await tabsAPI.updateTabSelection(tab._id, false);
    tab.isSelected = false;

    // Add the new tab to the list
    allUserTabs.push(newTab);
    editState.ruleDetails = null;
    state.blueBar.message = false;
    state.blueBar.loading = false;
    router.push({ name: 'edit-tab' });
    state.isLoading = false;
    
    return newTab;
  }

  /**
   * Update a tab's name
   */
  async function updateTabName(tab, newName) {
    if(!tab) return;

    if(newName === tab.tabName) {
      return;
    }

    await waitUntilTypingStops();
    
    await tabsAPI.updateTab(tab._id, {
      tabName: newName
    });

    tab.tabName = newName;
  }

  /**
   * Remove and deselect a group from a tab
   */
  async function removeAndDeselectGroupFromTab(tab, groupId) {
    const showForGroup = tab.showForGroup
      .filter(id => id !== groupId);

    await tabsAPI.updateTab(tab._id, {
      isSelected: false,
      showForGroup
    });

    tab.isSelected = false;
    tab.showForGroup = showForGroup;
  }

  /**
   * Save the groups associated with a tab
   * Called after drag and drop operations
   */
  async function saveTabGroups() {
    const tab = selectedTab.value;
    if (!tab) return;
    
    try {
      state.blueBar.loading = true;
      state.blueBar.message = 'Saving tab sharing settings...';
      
      await tabsAPI.updateTab(tab._id, { 
        showForGroup: tab.showForGroup 
      });
      
      state.blueBar.message = 'Tab sharing updated successfully';
      setTimeout(() => {
        state.blueBar.message = false;
        state.blueBar.loading = false;
      }, 1500);
    } catch (error) {
      console.error('Error saving tab groups:', error);
      state.blueBar.message = 'Error saving tab sharing settings';
      setTimeout(() => {
        state.blueBar.message = false;
        state.blueBar.loading = false;
      }, 3000);
    }
  }

  /**
   * Make a tab unique by duplicating it and removing the original group
   */
  async function makeTabUnique() {
    const tab = selectedTab.value;
    const selectedGroup = state.selected.group;
    
    if (!selectedGroup) return;
    const tabName = tab.tabName;
    const promptValue = prompt(`Please enter the tabName ('${tabName}') to make this tab unique.`);

    if(promptValue !== tabName) {
      return;
    }

    state.blueBar.message = 'Making Tab Unique';
    state.blueBar.loading = true;
    state.isLoading = true;
    router.back()

    // Create a new tab
    const newTab = await createNewTabCopy(tab, tabName);
    
    state.blueBar.message = 'Cloning Rules';
    
    // Clone rules
    await cloneRules(newTab._id, tab._id, state.allUserRules);
    
    // Remove and deselect group from current tab
    await removeAndDeselectGroupFromTab(tab, selectedGroup._id);

    // Add new tab to list
    state.allUserTabs.push(newTab);
    if (editState) {
      editState.ruleDetails = null;
    }
    state.blueBar.message = false;
    state.blueBar.loading = false;
    router.push({ name: 'edit-tab' });
    state.isLoading = false;
    
    return newTab;
  }

  return {
    cloneRules,
    createNewTabCopy,
    deleteTab,
    duplicateTab,
    getGroupName,
    makeTabUnique,
    removeAndDeselectGroupFromTab,
    saveTabGroups,
    select,
    selectedTab,
    unselectedGroupsInTab,
    updateTabName
  };
} 