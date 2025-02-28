import { useRouter } from 'vue-router';
import { useTabs } from '@/features/tabs/composables/useTabs.js';

export function useEditTab(state, editState) {
  const router = useRouter();
  const { 
    duplicateTab, 
    makeTabUnique, 
    updateTabName, 
    deleteTab, 
    saveTabGroups 
  } = useTabs();

  const selectedTab = {
    get value() {
      return state.selected.tab;
    }
  };

  const app = {
    /**
     * Change the tab name
     */
    changeTabName: async () => {
      await updateTabName(
        selectedTab.value, 
        editState.changeTabNameTo
      );
    },

    /**
     * Delete the current tab
     */
    deleteTab: async () => {
      await deleteTab(
        selectedTab.value, 
        state.allUserTabs
      );
    },

    /**
     * Duplicate the current tab with all its rules
     */
    duplicateTab: async () => {
      const callbacks = {
        onStart: () => {
          state.blueBar.message = 'Duplicating Tab';
          state.blueBar.loading = true;
          state.isLoading = true;
        },
        onNavigateBack: () => router.back(),
        onCloneStart: () => {
          state.blueBar.message = 'Cloning Rules';
        },
        onComplete: () => {
          editState.ruleDetails = null;
          state.blueBar.message = false;
          state.blueBar.loading = false;
          router.push({ name: 'edit-tab' });
          state.isLoading = false;
        }
      };

      await duplicateTab(
        selectedTab.value, 
        state.allUserTabs, 
        state.allUserRules,
        callbacks
      );
    },

    /**
     * Make current tab unique by duplicating and removing from original group
     */
    makeTabUnique: async () => {
      if (!state.selected.group) return;

      const callbacks = {
        onStart: () => {
          state.blueBar.message = 'Making Tab Unique';
          state.blueBar.loading = true;
          state.isLoading = true;
        },
        onNavigateBack: () => router.back(),
        onCloneStart: () => {
          state.blueBar.message = 'Cloning Rules';
        },
        onComplete: () => {
          editState.ruleDetails = null;
          state.blueBar.message = false;
          state.blueBar.loading = false;
          router.push({ name: 'edit-tab' });
          state.isLoading = false;
        }
      };

      await makeTabUnique(
        selectedTab.value, 
        state.selected.group,
        state.allUserTabs, 
        state.allUserRules,
        callbacks
      );
    },

    /**
     * Save the groups assigned to the tab
     */
    saveGroups: async () => {
      await saveTabGroups(selectedTab.value);
    },

    /**
     * Toggle rule type selection
     */
    select: (ruleType) => {
      editState.selectedRuleType = editState.selectedRuleType === ruleType 
        ? '' 
        : ruleType;
    }
  };

  return { app };
} 