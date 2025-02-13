import { computed } from 'vue';
import { dateUtils } from '@/utils';

export function useUtils(state) {
  const selectedDateRange = computed(() => {
    if (!state?.selected?.fromDate || !state?.selected?.toDate) {
      return '';
    }
    const fromDate = dateUtils.formatDisplay(state.selected.fromDate);
    const toDate = dateUtils.formatDisplay(state.selected.toDate);
    return `${fromDate} - ${toDate}`;
  });

  const defaultDates = {
    fromDate: dateUtils.firstOfMonth(),
    toDate: dateUtils.today()
  };

  function initializeDates() {
    if (!state?.selected) {
      state.selected = {};
    }
    if (!state.selected.fromDate) {
      state.selected.fromDate = defaultDates.fromDate;
    }
    if (!state.selected.toDate) {
      state.selected.toDate = defaultDates.toDate;
    }
  }

  function sortBy(prop) {
    return (a, b) => a[prop] - b[prop];
  }

  function extractDateRange(state) {
    if (!state?.date?.start || !state?.date?.end) {
      return '';
    }
    return `${yyyyMmDd(state.date.start)}_${yyyyMmDd(state.date.end)}`;
  }

  function yyyyMmDd(dateObject) {
    if (!dateObject || typeof dateObject.getFullYear !== 'function') {
      return dateUtils.today();
    }
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

  function getDayOfWeekPST(dateString) {
    let date = new Date(dateString + 'T00:00:00');
    let dayOfWeek = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      timeZone: 'America/Los_Angeles' 
    });
    return dayOfWeek;
  }

  return {
    selectedDateRange,
    defaultDates,
    initializeDates,
    sortBy,
    extractDateRange,
    selectFirstGroup,
    selectFirstTab,
    selectedTabsInGroup,
    deselectOtherTabs,
    getDayOfWeekPST
  };
} 