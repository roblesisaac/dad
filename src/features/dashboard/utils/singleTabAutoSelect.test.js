import { describe, expect, test } from 'vitest';

import { resolveSingleTabAutoSelectTarget } from './singleTabAutoSelect.js';

describe('resolveSingleTabAutoSelectTarget', () => {
  test('returns single tab target when tab selector view has one tab and none selected', () => {
    const onlyTab = { _id: 'tab-1', tabName: 'Primary' };

    const result = resolveSingleTabAutoSelectTarget({
      dashboardView: 'tab',
      selectedGroupId: 'group-1',
      selectedTabId: '',
      tabsForGroup: [onlyTab]
    });

    expect(result).toBe(onlyTab);
  });

  test('returns null when dashboard view is not tab', () => {
    const result = resolveSingleTabAutoSelectTarget({
      dashboardView: 'group',
      selectedGroupId: 'group-1',
      selectedTabId: '',
      tabsForGroup: [{ _id: 'tab-1' }]
    });

    expect(result).toBeNull();
  });

  test('returns null when a tab is already selected', () => {
    const result = resolveSingleTabAutoSelectTarget({
      dashboardView: 'tab',
      selectedGroupId: 'group-1',
      selectedTabId: 'tab-1',
      tabsForGroup: [{ _id: 'tab-1' }]
    });

    expect(result).toBeNull();
  });

  test('returns null when tab count is not exactly one', () => {
    expect(resolveSingleTabAutoSelectTarget({
      dashboardView: 'tab',
      selectedGroupId: 'group-1',
      selectedTabId: '',
      tabsForGroup: []
    })).toBeNull();

    expect(resolveSingleTabAutoSelectTarget({
      dashboardView: 'tab',
      selectedGroupId: 'group-1',
      selectedTabId: '',
      tabsForGroup: [{ _id: 'tab-1' }, { _id: 'tab-2' }]
    })).toBeNull();
  });
});
