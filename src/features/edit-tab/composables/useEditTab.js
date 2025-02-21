import { useApi } from '@/shared/composables/useApi';
import { useRouter } from 'vue-router';

export function useEditTab(state, editState, App) {
  const api = useApi();
  const router = useRouter();

  async function cloneRules(newTabId, currentTabId) {
    for(const rule of state.allUserRules) {
      if(!rule.applyForTabs.includes(currentTabId)) {
        continue;
      }

      const newRule = { 
        rule: rule.rule,
        _isImportant: rule._isImportant,
        orderOfExecution: rule.orderOfExecution,
        applyForTabs: [newTabId]
      };

      const savedRule = await api.post('rules', newRule);
      state.allUserRules.push(savedRule);
    }
  }

  async function createNewTab(tabName) {
    const selectedGroup = state.selected.group;
    const tabsForGroup = state.selected.tabsForGroup;

    const newTab = await api.post('tabs', {
      tabName: `${tabName} Copy`,
      showForGroup: [selectedGroup._id],
      isSelected: true,
      sort: tabsForGroup.length+1
    });

    return newTab;
  }

  function findTab(_id) {
    return state.allUserTabs.find(tab => tab._id === _id);
  }

  async function removeAndDeselectGroupFromCurrentTab() {
    const currentGroupId = state.selected.group._id;
    const showForGroup = selectedTab.value.showForGroup
      .filter(groupId => groupId !== currentGroupId);

    await api.put(`tabs/${selectedTab.value._id}`, {
      isSelected: false,
      showForGroup
    });

    selectedTab.value.isSelected = false;
    selectedTab.value.showForGroup = showForGroup;
  }

  async function updateTabName() {
    const tabId = selectedTab.value._id;
    const newName = editState.changeTabNameTo;

    await api.put(`tabs/${tabId}`, {
      tabName: newName
    });

    const existingTab = findTab(tabId);
    existingTab.tabName = newName;
  }

  function waitUntilTypingStops(ms=500) {
    return new Promise((resolve) => {
      clearTimeout(editState.typingTimer);
      editState.typingTimer = setTimeout(resolve, ms);
    });
  }

  const app = {
    changeTabName: async () => {
      if(editState.changeTabNameTo == selectedTab.value.tabName) {
        return;
      }

      await waitUntilTypingStops();
      await updateTabName();
    },
    deleteTab: async () => {
      if(!confirm('You sure?')) {
        return;
      }
      
      const selectedTabId = selectedTab.value._id;
      const tabIndex = state.allUserTabs.findIndex(tab => tab._id === selectedTabId);

      router.back();
      state.allUserTabs.splice(tabIndex, 1);
      await api.delete(`tabs/${selectedTabId}`);
    },
    duplicateTab: async () => {
      const tabName = selectedTab.value.tabName;
      const promptValue = prompt(`Please enter the tabName ('${tabName}') to duplicate.`);

      if(promptValue !== tabName) {
        return;
      }

      state.blueBar.message = 'Duplicating Tab';
      state.blueBar.loading = true;
      state.isLoading = true;
      router.back();

      nextTick(async () => {
        state.blueBar.message = 'Cloning Rules';
        const newTab = await createNewTab(tabName);
        await cloneRules(newTab._id, selectedTab.value._id);

        await api.put(`tabs/${selectedTab.value._id}`, {
          isSelected: false
        });

        selectedTab.value.isSelected = false;

        editState.ruleDetails = null;
        state.allUserTabs.push(newTab);
        state.blueBar.message = false;
        state.blueBar.loading = false;
        router.push({ name: 'edit-tab' });
        state.isLoading = false;
      });
    },
    makeTabUnique: async () => {
      const tabName = selectedTab.value.tabName;
      const promptValue = prompt(`Please enter the tabName ('${tabName}') to make this tab unique.`);

      if(promptValue !== tabName) {
        return;
      }

      state.blueBar.message = 'Making Tab Unique';
      state.blueBar.loading = true;
      state.isLoading = true;
      router.back();

      const currentTabId = selectedTab.value._id;
      const newTab = await createNewTab();

      nextTick(async () => {
        state.blueBar.message = 'Cloning Rules';
        await cloneRules(newTab._id, currentTabId);
        await removeAndDeselectGroupFromCurrentTab();

        editState.ruleDetails = null;
        state.allUserTabs.push(newTab);
        state.blueBar.message = false;
        state.blueBar.loading = false;
        router.push({ name: 'edit-tab' });
        state.isLoading = false;
      });
    },
    saveGroups: async () => {
      const { _id, showForGroup } = selectedTab.value;
      await api.put(`tabs/${_id}`, { showForGroup });
    },
    select: (ruleType) => {
      editState.selectedRuleType = editState.selectedRuleType === ruleType 
        ? '' 
        : ruleType;
    }
  };

  return { app };
} 