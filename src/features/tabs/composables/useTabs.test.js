import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  state,
  processAllTabsForSelectedGroupMock,
  tabsApiMock,
  rulesApiMock
} = vi.hoisted(() => ({
  state: {
    allUserGroups: [],
    allUserTabs: [],
    allUserRules: [],
    blueBar: {
      loading: false,
      message: ''
    },
    selected: {
      tab: null,
      group: null,
      tabsForGroup: []
    }
  },
  processAllTabsForSelectedGroupMock: vi.fn(),
  tabsApiMock: {
    fetchUserTabs: vi.fn(),
    createTab: vi.fn(),
    updateTabSort: vi.fn(),
    updateTab: vi.fn()
  },
  rulesApiMock: {
    createRule: vi.fn()
  }
}));

vi.mock('@/features/dashboard/composables/useDashboardState.js', () => ({
  useDashboardState: () => ({ state })
}));

vi.mock('./useTabProcessing.js', () => ({
  useTabProcessing: () => ({
    processTabData: vi.fn(),
    processAllTabsForSelectedGroup: processAllTabsForSelectedGroupMock
  })
}));

vi.mock('./useTabsAPI.js', () => ({
  useTabsAPI: () => tabsApiMock
}));

vi.mock('@/features/rule-manager/composables/useRulesAPI.js', () => ({
  useRulesAPI: () => rulesApiMock
}));

import { useTabs } from './useTabs.js';

function resetState() {
  state.allUserGroups = [];
  state.allUserTabs = [];
  state.allUserRules = [];
  state.selected.tab = null;
  state.selected.tabsForGroup = [];
}

describe('useTabs ensureDefaultTabsForTabView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
  });

  test('does not create defaults when tabs already exist in state', async () => {
    state.allUserTabs = [{ _id: 'existing-tab' }];

    const { ensureDefaultTabsForTabView } = useTabs();
    const createdTabs = await ensureDefaultTabsForTabView();

    expect(createdTabs).toEqual([]);
    expect(tabsApiMock.fetchUserTabs).not.toHaveBeenCalled();
    expect(tabsApiMock.createTab).not.toHaveBeenCalled();
    expect(rulesApiMock.createRule).not.toHaveBeenCalled();
    expect(processAllTabsForSelectedGroupMock).not.toHaveBeenCalled();
  });

  test('hydrates tabs from API and skips creation when remote tabs exist', async () => {
    const remoteTabs = [{ _id: 'remote-tab-1', tabName: 'remote' }];
    tabsApiMock.fetchUserTabs.mockResolvedValue(remoteTabs);

    const { ensureDefaultTabsForTabView } = useTabs();
    const createdTabs = await ensureDefaultTabsForTabView();

    expect(createdTabs).toEqual([]);
    expect(state.allUserTabs).toEqual(remoteTabs);
    expect(tabsApiMock.createTab).not.toHaveBeenCalled();
    expect(rulesApiMock.createRule).not.toHaveBeenCalled();
    expect(processAllTabsForSelectedGroupMock).not.toHaveBeenCalled();
  });

  test('creates money in/out tabs and amount filters when no tabs exist', async () => {
    tabsApiMock.fetchUserTabs.mockResolvedValue([]);
    tabsApiMock.createTab
      .mockResolvedValueOnce({ _id: 'tab-money-in', tabName: 'money in' })
      .mockResolvedValueOnce({ _id: 'tab-money-out', tabName: 'money out' });
    rulesApiMock.createRule
      .mockResolvedValueOnce({ _id: 'rule-money-in' })
      .mockResolvedValueOnce({ _id: 'rule-money-out' });

    const { ensureDefaultTabsForTabView } = useTabs();
    const createdTabs = await ensureDefaultTabsForTabView();

    expect(createdTabs.map(tab => tab._id)).toEqual(['tab-money-in', 'tab-money-out']);
    expect(tabsApiMock.createTab).toHaveBeenNthCalledWith(1, {
      tabName: 'money in',
      showForGroup: ['_GLOBAL'],
      sort: 0
    });
    expect(tabsApiMock.createTab).toHaveBeenNthCalledWith(2, {
      tabName: 'money out',
      showForGroup: ['_GLOBAL'],
      sort: 1
    });

    expect(rulesApiMock.createRule).toHaveBeenNthCalledWith(1, {
      applyForTabs: ['tab-money-in'],
      rule: ['filter', 'amount', '>', '0', ''],
      filterJoinOperator: 'and',
      _isImportant: false,
      orderOfExecution: 0
    });
    expect(rulesApiMock.createRule).toHaveBeenNthCalledWith(2, {
      applyForTabs: ['tab-money-out'],
      rule: ['filter', 'amount', '<', '0', ''],
      filterJoinOperator: 'and',
      _isImportant: false,
      orderOfExecution: 0
    });

    expect(state.allUserTabs.map(tab => tab._id)).toEqual(['tab-money-in', 'tab-money-out']);
    expect(state.allUserRules.map(rule => rule._id)).toEqual(['rule-money-in', 'rule-money-out']);
    expect(processAllTabsForSelectedGroupMock).toHaveBeenCalledWith({ showLoading: false });
  });
});

describe('useTabs toggleTabForGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
  });

  test('disabling a global tab for one group removes _GLOBAL and enables all other groups', async () => {
    state.allUserGroups = [
      { _id: 'group-1' },
      { _id: 'group-2' },
      { _id: 'group-3' }
    ];
    state.allUserTabs = [
      { _id: 'tab-1', showForGroup: ['_GLOBAL'], sort: 0 }
    ];

    tabsApiMock.updateTab.mockResolvedValue({
      _id: 'tab-1',
      showForGroup: ['group-2', 'group-3'],
      sort: 0
    });

    const { toggleTabForGroup } = useTabs();
    const updatedTab = await toggleTabForGroup('tab-1', 'group-1');

    expect(tabsApiMock.updateTab).toHaveBeenCalledWith('tab-1', {
      showForGroup: ['group-2', 'group-3']
    });
    expect(updatedTab.showForGroup).toEqual(['group-2', 'group-3']);
    expect(tabsApiMock.updateTabSort).not.toHaveBeenCalled();
  });
});
