import { ALL_ACCOUNTS_GROUP_ID } from '@/features/dashboard/constants/groups.js';

const MAX_SORT_FALLBACK = Number.MAX_SAFE_INTEGER;

export function normalizeSortByGroup(sortByGroup) {
  if (!sortByGroup || typeof sortByGroup !== 'object' || Array.isArray(sortByGroup)) {
    return {};
  }

  return Object.entries(sortByGroup).reduce((acc, [scopeId, rawSort]) => {
    const normalizedScopeId = String(scopeId || '').trim();
    const normalizedSort = Number(rawSort);

    if (!normalizedScopeId || !Number.isFinite(normalizedSort)) {
      return acc;
    }

    acc[normalizedScopeId] = normalizedSort;
    return acc;
  }, {});
}

export function resolveTabOrderScopeId(groupOrScopeId) {
  if (typeof groupOrScopeId === 'string') {
    return String(groupOrScopeId || '').trim();
  }

  if (!groupOrScopeId || typeof groupOrScopeId !== 'object') {
    return '';
  }

  if (groupOrScopeId.isVirtualAllAccounts || groupOrScopeId._id === ALL_ACCOUNTS_GROUP_ID) {
    return ALL_ACCOUNTS_GROUP_ID;
  }

  return String(groupOrScopeId._id || '').trim();
}

export function getTabSortForScope(tab, groupOrScopeId, fallbackSort = MAX_SORT_FALLBACK) {
  const scopeId = resolveTabOrderScopeId(groupOrScopeId);
  const sortByGroup = normalizeSortByGroup(tab?.sortByGroup);

  if (scopeId && Number.isFinite(sortByGroup[scopeId])) {
    return Number(sortByGroup[scopeId]);
  }

  const legacySort = Number(tab?.sort);
  if (Number.isFinite(legacySort)) {
    return legacySort;
  }

  return Number.isFinite(Number(fallbackSort))
    ? Number(fallbackSort)
    : MAX_SORT_FALLBACK;
}

export function setTabSortForScope(tab, groupOrScopeId, sort) {
  if (!tab || typeof tab !== 'object') {
    return tab;
  }

  const scopeId = resolveTabOrderScopeId(groupOrScopeId);
  const nextSort = Number(sort);

  if (!scopeId || !Number.isFinite(nextSort)) {
    return tab;
  }

  const normalizedSortByGroup = normalizeSortByGroup(tab.sortByGroup);
  tab.sortByGroup = {
    ...normalizedSortByGroup,
    [scopeId]: nextSort
  };

  return tab;
}
