export function useUtils() {
  function sortBy(prop) {
    return (a, b) => a[prop] - b[prop];
  }

  function extractDateRange(state) {
    const { date : { start, end } } = state;
    return `${yyyyMmDd(start)}_${yyyyMmDd(end)}`;
  }

  function yyyyMmDd(dateObject) {
    if(!dateObject) return;
    const year = dateObject.getFullYear();
    const month = String(dateObject.getMonth() + 1).padStart(2, '0');
    const day = String(dateObject.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  function selectFirstGroup(state, api) {
    const firstGroup = state.allUserGroups[0];
    if (!firstGroup) return null;
    
    firstGroup.isSelected = true;
    api.put(`api/groups/${firstGroup._id}`, { isSelected: true });
    return firstGroup;
  }

  function selectFirstTab(tabsForGroup, api) {
    const firstTab = tabsForGroup[0];
    if (!firstTab) return;

    firstTab.isSelected = true;
    api.put(`api/tabs/${firstTab._id}`, { isSelected: true });
  }

  function selectedTabsInGroup(tabsForGroup) {
    return tabsForGroup?.filter(tab => tab.isSelected) || [];
  }

  async function deselectOtherTabs(selectedTabs, api) {
    if (!selectedTabs?.length) return;
    
    for(const tab of selectedTabs.splice(1)) {
      tab.isSelected = false;
      await api.put(`api/tabs/${tab._id}`, { isSelected: false });
    }
  }

  return {
    sortBy,
    extractDateRange,
    selectFirstGroup,
    selectFirstTab,
    selectedTabsInGroup,
    deselectOtherTabs
  };
} 