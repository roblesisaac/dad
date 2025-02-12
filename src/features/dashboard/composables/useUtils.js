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
    firstGroup.isSelected = true;
    api.put(`api/groups/${firstGroup._id}`, { isSelected: true });
    return firstGroup;
  }

  return {
    sortBy,
    extractDateRange,
    selectFirstGroup
  };
} 