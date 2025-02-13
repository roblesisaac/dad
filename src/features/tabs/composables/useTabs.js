import { useAppStore } from '@/stores/state';

export function useTabs() {
  const { api } = useAppStore();

  async function selectTab(tabToSelect, currentlySelectedTab, goBack) {
    if(tabToSelect.isSelected) {
      goBack();
      return;
    }

    if(currentlySelectedTab) {
      currentlySelectedTab.isSelected = false;
      await api.put(`api/tabs/${currentlySelectedTab._id}`, { isSelected: false });
    }

    tabToSelect.isSelected = true;
    await api.put(`api/tabs/${tabToSelect._id}`, { isSelected: true });
    goBack();
  }

  async function updateTabSort(tabId, newSort) {
    await api.put(`api/tabs/${tabId}`, { sort: newSort });
  }

  async function createNewTab(createTabFn, goBack) {
    await createTabFn();
    goBack();
  }

  return {
    selectTab,
    updateTabSort,
    createNewTab
  };
} 