function normalizeStringValue(value) {
  return String(value || '').trim();
}

export function resolveSingleTabAutoSelectTarget({
  dashboardView = '',
  selectedGroupId = '',
  selectedTabId = '',
  tabsForGroup = []
} = {}) {
  if (normalizeStringValue(dashboardView) !== 'tab') {
    return null;
  }

  if (!normalizeStringValue(selectedGroupId)) {
    return null;
  }

  if (normalizeStringValue(selectedTabId)) {
    return null;
  }

  if (!Array.isArray(tabsForGroup) || tabsForGroup.length !== 1) {
    return null;
  }

  const [singleTab] = tabsForGroup;
  if (!normalizeStringValue(singleTab?._id)) {
    return null;
  }

  return singleTab;
}
