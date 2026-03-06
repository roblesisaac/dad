import { describe, expect, test } from 'vitest';

import { ALL_ACCOUNTS_GROUP_ID } from '@/features/dashboard/constants/groups.js';
import {
  getTabSortForScope,
  normalizeSortByGroup,
  resolveTabOrderScopeId,
  setTabSortForScope
} from './tabOrder.js';

describe('tabOrder utilities', () => {
  test('normalizeSortByGroup keeps only numeric values with non-empty scope keys', () => {
    expect(normalizeSortByGroup({
      'group-1': 3,
      'group-2': '4',
      '': 1,
      'group-3': 'abc'
    })).toEqual({
      'group-1': 3,
      'group-2': 4
    });
  });

  test('resolveTabOrderScopeId resolves all-accounts groups to system scope id', () => {
    expect(resolveTabOrderScopeId({ isVirtualAllAccounts: true })).toBe(ALL_ACCOUNTS_GROUP_ID);
    expect(resolveTabOrderScopeId({ _id: ALL_ACCOUNTS_GROUP_ID })).toBe(ALL_ACCOUNTS_GROUP_ID);
    expect(resolveTabOrderScopeId({ _id: 'group-1' })).toBe('group-1');
    expect(resolveTabOrderScopeId('group-2')).toBe('group-2');
  });

  test('getTabSortForScope prefers scoped order and falls back to legacy sort', () => {
    const tab = {
      sort: 10,
      sortByGroup: {
        'group-1': 2
      }
    };

    expect(getTabSortForScope(tab, 'group-1')).toBe(2);
    expect(getTabSortForScope(tab, 'group-2')).toBe(10);
  });

  test('setTabSortForScope writes scoped order without mutating legacy sort', () => {
    const tab = {
      sort: 5,
      sortByGroup: {
        'group-1': 1
      }
    };

    setTabSortForScope(tab, 'group-2', 7);

    expect(tab.sort).toBe(5);
    expect(tab.sortByGroup).toEqual({
      'group-1': 1,
      'group-2': 7
    });
  });
});
