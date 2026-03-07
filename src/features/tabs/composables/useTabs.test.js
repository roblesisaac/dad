import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  state,
  processAllTabsForSelectedGroupMock,
  tabsApiMock
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

import { useTabs } from './useTabs.js';

function resetState() {
  state.allUserGroups = [];
  state.allUserTabs = [];
  state.allUserRules = [];
  state.selected.tab = null;
  state.selected.tabsForGroup = [];
}

function levelZeroFor(tabPayload) {
  return tabPayload?.drillSchema?.levels?.[0] || null;
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
    expect(processAllTabsForSelectedGroupMock).not.toHaveBeenCalled();
  });

  test('creates money in/out tabs and amount filters when no tabs exist', async () => {
    tabsApiMock.fetchUserTabs.mockResolvedValue([]);
    tabsApiMock.createTab
      .mockResolvedValueOnce({ _id: 'tab-money-in', tabName: 'money in' })
      .mockResolvedValueOnce({ _id: 'tab-money-out', tabName: 'money out' });

    const { ensureDefaultTabsForTabView } = useTabs();
    const createdTabs = await ensureDefaultTabsForTabView();

    expect(createdTabs.map(tab => tab._id)).toEqual(['tab-money-in', 'tab-money-out']);
    expect(tabsApiMock.createTab).toHaveBeenNthCalledWith(1, expect.objectContaining({
      tabName: 'money in',
      showForGroup: ['_GLOBAL'],
      sort: 0,
      sortByGroup: {
        _ALL_ACCOUNTS: 0
      },
      drillSchema: expect.objectContaining({ version: 1 })
    }));
    expect(tabsApiMock.createTab).toHaveBeenNthCalledWith(2, expect.objectContaining({
      tabName: 'money out',
      showForGroup: ['_GLOBAL'],
      sort: 1,
      sortByGroup: {
        _ALL_ACCOUNTS: 1
      },
      drillSchema: expect.objectContaining({ version: 1 })
    }));

    const moneyInLevel = levelZeroFor(tabsApiMock.createTab.mock.calls[0][0]);
    const moneyOutLevel = levelZeroFor(tabsApiMock.createTab.mock.calls[1][0]);
    expect(moneyInLevel.filterRules[0]).toEqual(expect.objectContaining({
      rule: ['filter', 'amount', '>', '0', ''],
      filterJoinOperator: 'and',
      orderOfExecution: 0
    }));
    expect(moneyOutLevel.filterRules[0]).toEqual(expect.objectContaining({
      rule: ['filter', 'amount', '<', '0', ''],
      filterJoinOperator: 'and',
      orderOfExecution: 0
    }));

    expect(state.allUserTabs.map(tab => tab._id)).toEqual(['tab-money-in', 'tab-money-out']);
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

  test('enabling a tab appends its scoped order for that group only', async () => {
    state.allUserGroups = [{ _id: 'group-1' }];
    state.allUserTabs = [
      {
        _id: 'tab-enabled',
        showForGroup: ['group-1'],
        sort: 0,
        sortByGroup: { 'group-1': 3 }
      },
      {
        _id: 'tab-hidden',
        showForGroup: [],
        sort: 0,
        sortByGroup: {}
      }
    ];

    tabsApiMock.updateTab.mockResolvedValue({
      _id: 'tab-hidden',
      showForGroup: ['group-1'],
      sort: 0,
      sortByGroup: {}
    });
    tabsApiMock.updateTabSort.mockResolvedValue({
      _id: 'tab-hidden',
      showForGroup: ['group-1'],
      sort: 0,
      sortByGroup: { 'group-1': 4 }
    });

    const { toggleTabForGroup } = useTabs();
    await toggleTabForGroup('tab-hidden', 'group-1');

    expect(tabsApiMock.updateTabSort).toHaveBeenCalledWith('tab-hidden', 4, 'group-1');
  });
});

describe('useTabs createTabWithWizardConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
  });

  test('creates a tab and persists filter/categorize/sort/group rules with AND/OR support', async () => {
    state.selected.group = { _id: 'group-1' };
    state.selected.tabsForGroup = [{ _id: 'existing-tab' }];

    tabsApiMock.createTab.mockResolvedValue({
      _id: 'new-tab',
      tabName: 'Travel Tracker',
      showForGroup: ['group-1'],
      sort: 2
    });

    const { createTabWithWizardConfig } = useTabs();

    const createdTab = await createTabWithWizardConfig({
      tabName: 'Travel Tracker',
      filters: [
        {
          joinOperator: 'and',
          property: 'amount',
          method: '>',
          value: '50',
          conditions: [
            { combinator: 'and', property: 'name', method: 'includes', value: 'flight' }
          ]
        },
        {
          joinOperator: 'or',
          property: 'date',
          method: 'is after',
          value: '2026-01-01',
          conditions: [
            { combinator: 'or', property: 'category', method: 'contains', value: 'travel' }
          ]
        }
      ],
      categorizeRules: [
        {
          property: 'name',
          method: 'contains',
          value: 'uber',
          category: 'transportation',
          conditions: [
            { combinator: 'or', property: 'category', method: '=', value: 'transport' }
          ]
        }
      ],
      organize: {
        sortKey: 'date',
        sortDirection: 'desc',
        groupBy: 'none'
      }
    });

    expect(createdTab?._id).toBe('new-tab');
    expect(tabsApiMock.createTab).toHaveBeenCalledWith(expect.objectContaining({
      tabName: 'Travel Tracker',
      showForGroup: ['group-1'],
      sort: 2,
      sortByGroup: {
        'group-1': 2
      },
      drillSchema: expect.objectContaining({ version: 1 })
    }));

    const newTabPayload = tabsApiMock.createTab.mock.calls[0][0];
    const levelZero = levelZeroFor(newTabPayload);
    expect(levelZero.filterRules).toHaveLength(2);
    expect(levelZero.filterRules[0]).toEqual(expect.objectContaining({
      rule: [
        'filter', 'amount', '>', '50', '',
        'and', 'name', 'includes', 'flight'
      ],
      filterJoinOperator: 'and',
      orderOfExecution: 0
    }));
    expect(levelZero.filterRules[1]).toEqual(expect.objectContaining({
      rule: [
        'filter', 'date', 'is after', '2026-01-01', '',
        'or', 'category', 'includes', 'travel'
      ],
      filterJoinOperator: 'or',
      orderOfExecution: 1
    }));
    expect(levelZero.categorizeRules[0]).toEqual(expect.objectContaining({
      rule: [
        'categorize', 'name', 'includes', 'uber', 'transportation',
        'or', 'category', '=', 'transport'
      ],
      filterJoinOperator: 'and',
      orderOfExecution: 0
    }));
    expect(levelZero.sortRules[0]).toEqual(expect.objectContaining({
      rule: ['sort', 'date', 'desc', '', '']
    }));
    expect(levelZero.groupByRules[0]).toEqual(expect.objectContaining({
      rule: ['groupBy', 'none', '', '', '']
    }));

    expect(processAllTabsForSelectedGroupMock).toHaveBeenCalled();
    expect(state.allUserTabs.some(tab => tab._id === 'new-tab')).toBe(true);
  });

  test('uses organize defaults when omitted', async () => {
    state.selected.group = { _id: 'group-1' };
    state.selected.tabsForGroup = [];

    tabsApiMock.createTab.mockResolvedValue({
      _id: 'new-tab-default-organize',
      tabName: 'New Tab'
    });

    const { createTabWithWizardConfig } = useTabs();
    await createTabWithWizardConfig({
      tabName: 'New Tab',
      filters: [{ property: '', method: '', value: '' }],
      categorizeRules: [{ property: '', method: '', value: '', category: '' }]
    });

    const newTabPayload = tabsApiMock.createTab.mock.calls[0][0];
    const levelZero = levelZeroFor(newTabPayload);
    expect(levelZero.sortRules[0]).toEqual(expect.objectContaining({
      rule: ['sort', 'date', 'desc', '', '']
    }));
    expect(levelZero.groupByRules[0]).toEqual(expect.objectContaining({
      rule: ['groupBy', 'none', '', '', '']
    }));
    expect(levelZero.filterRules).toEqual([]);
    expect(levelZero.categorizeRules).toEqual([]);
  });

  test('returns and selects the state-backed tab instance after processing', async () => {
    state.selected.group = { _id: 'group-1' };
    state.selected.tabsForGroup = [];

    tabsApiMock.createTab.mockResolvedValue({
      _id: 'new-tab-reactive',
      tabName: 'Reactive Tab'
    });

    const processedTabInstance = {
      _id: 'new-tab-reactive',
      tabName: 'Reactive Tab',
      isSelected: false,
      categorizedItems: []
    };

    processAllTabsForSelectedGroupMock.mockImplementationOnce(async () => {
      state.selected.tabsForGroup = [processedTabInstance];
      state.allUserTabs = [processedTabInstance];
    });

    const { createTabWithWizardConfig } = useTabs();
    const createdTab = await createTabWithWizardConfig({
      tabName: 'Reactive Tab',
      filters: [],
      categorizeRules: [],
      organize: {
        sortKey: 'date',
        sortDirection: 'desc',
        groupBy: 'none'
      }
    });

    expect(createdTab).toBe(processedTabInstance);
    expect(processedTabInstance.isSelected).toBe(true);
  });
});

describe('useTabs copyTabSchemaToGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
  });

  test('copies full drill schema to target group with unique copy-of naming', async () => {
    const sourceDrillSchema = {
      version: 1,
      levels: [{
        id: 'level-1',
        sortRules: [{
          _id: 'sort-1',
          rule: ['sort', 'date', 'desc', '', ''],
          filterJoinOperator: 'and',
          _isImportant: false,
          orderOfExecution: 0
        }],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [{
          _id: 'group-1',
          rule: ['groupBy', 'category', '', '', ''],
          filterJoinOperator: 'and',
          _isImportant: false,
          orderOfExecution: 0
        }]
      }]
    };

    state.allUserTabs = [
      {
        _id: 'source-tab',
        tabName: 'Travel',
        showForGroup: ['group-1'],
        sortByGroup: { 'group-1': 0 },
        drillSchema: sourceDrillSchema
      },
      {
        _id: 'target-existing-1',
        tabName: 'copy of Travel',
        showForGroup: ['group-2'],
        sortByGroup: { 'group-2': 1 }
      },
      {
        _id: 'target-existing-2',
        tabName: 'copy of Travel 2',
        showForGroup: ['group-2'],
        sortByGroup: { 'group-2': 4 }
      }
    ];

    tabsApiMock.createTab.mockResolvedValue({
      _id: 'copied-tab',
      tabName: 'copy of Travel 3',
      showForGroup: ['group-2'],
      sortByGroup: { 'group-2': 5 },
      drillSchema: sourceDrillSchema
    });

    const { copyTabSchemaToGroup } = useTabs();
    const copiedTab = await copyTabSchemaToGroup('source-tab', 'group-2');

    expect(tabsApiMock.createTab).toHaveBeenCalledWith({
      tabName: 'copy of Travel 3',
      showForGroup: ['group-2'],
      sort: 5,
      sortByGroup: { 'group-2': 5 },
      drillSchema: {
        ...sourceDrillSchema,
        levels: sourceDrillSchema.levels.map((level) => ({
          ...level,
          honorRecategorizeAs: false,
          recategorizeBehaviorDecision: ''
        })),
        pathLevels: []
      }
    });
    expect(copiedTab?._id).toBe('copied-tab');
    expect(state.allUserTabs.some(tab => tab._id === 'copied-tab')).toBe(true);
    expect(processAllTabsForSelectedGroupMock).toHaveBeenCalledWith({ showLoading: false });
  });
});

describe('useTabs drill schema updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
  });

  test('preserves selected tab runtime state when persisting drill schema', async () => {
    const selectedTab = {
      _id: 'tab-1',
      tabName: 'all',
      isSelected: true,
      total: 42,
      groupByMode: 'none',
      categorizedItems: [['all transactions', [{ transaction_id: 't1' }], 42]],
      hiddenItems: [],
      showForGroup: ['group-1'],
      drillSchema: {
        version: 1,
        levels: [{
          id: 'level-1',
          sortRules: [],
          categorizeRules: [],
          filterRules: [],
          groupByRules: [{
            _id: 'group-by-1',
            rule: ['groupBy', 'none', '', '', ''],
            filterJoinOperator: 'and',
            _isImportant: false,
            orderOfExecution: 0
          }]
        }]
      }
    };

    state.selected.group = { _id: 'group-1' };
    state.selected.tab = selectedTab;
    state.allUserTabs = [selectedTab];
    state.selected.tabsForGroup = [selectedTab];

    tabsApiMock.updateTab.mockResolvedValue({
      _id: 'tab-1',
      tabName: 'all',
      showForGroup: ['group-1'],
      drillSchema: {
        version: 1,
        levels: [{
          id: 'level-1',
          sortRules: [],
          categorizeRules: [],
          filterRules: [],
          groupByRules: [{
            _id: 'group-by-updated',
            rule: ['groupBy', 'category', '', '', ''],
            filterJoinOperator: 'and',
            _isImportant: false,
            orderOfExecution: 0
          }]
        }]
      }
    });

    const { updateTabDrillSchemaAtDepth } = useTabs();
    await updateTabDrillSchemaAtDepth('tab-1', 0, {
      groupByRules: [{
        _id: 'group-by-local',
        rule: ['groupBy', 'category', '', '', ''],
        filterJoinOperator: 'and',
        _isImportant: false,
        orderOfExecution: 0
      }]
    });

    expect(tabsApiMock.updateTab).toHaveBeenCalledTimes(1);
    expect(state.allUserTabs[0].isSelected).toBe(true);
    expect(state.allUserTabs[0].total).toBe(42);
    expect(state.allUserTabs[0].groupByMode).toBe('none');
    expect(processAllTabsForSelectedGroupMock).toHaveBeenCalledWith({ showLoading: false });
  });

  test('writes non-root edits as path-level drill schema overrides', async () => {
    const selectedTab = {
      _id: 'tab-2',
      tabName: 'all',
      isSelected: true,
      showForGroup: ['group-1'],
      drillSchema: {
        version: 1,
        levels: [{
          id: 'level-1',
          sortRules: [],
          categorizeRules: [],
          filterRules: [],
          groupByRules: [{
            _id: 'group-by-root',
            rule: ['groupBy', 'category', '', '', ''],
            filterJoinOperator: 'and',
            _isImportant: false,
            orderOfExecution: 0
          }]
        }, {
          id: 'level-2',
          sortRules: [],
          categorizeRules: [],
          filterRules: [],
          groupByRules: [{
            _id: 'group-by-depth-two',
            rule: ['groupBy', 'none', '', '', ''],
            filterJoinOperator: 'and',
            _isImportant: false,
            orderOfExecution: 0
          }]
        }]
      }
    };

    state.selected.group = { _id: 'group-1' };
    state.selected.tab = selectedTab;
    state.allUserTabs = [selectedTab];
    state.selected.tabsForGroup = [selectedTab];

    tabsApiMock.updateTab.mockResolvedValue({
      _id: 'tab-2',
      tabName: 'all',
      showForGroup: ['group-1'],
      drillSchema: {
        version: 1,
        levels: selectedTab.drillSchema.levels,
        pathLevels: [{
          id: 'path-dining',
          path: ['dining'],
          sortRules: [],
          categorizeRules: [],
          filterRules: [],
          groupByRules: [{
            _id: 'group-by-dining',
            rule: ['groupBy', 'category', '', '', ''],
            filterJoinOperator: 'and',
            _isImportant: false,
            orderOfExecution: 0
          }]
        }]
      }
    });

    const { updateTabDrillSchemaAtPath } = useTabs();
    await updateTabDrillSchemaAtPath('tab-2', ['dining'], {
      groupByRules: [{
        _id: 'group-by-branch-local',
        rule: ['groupBy', 'category', '', '', ''],
        filterJoinOperator: 'and',
        _isImportant: false,
        orderOfExecution: 0
      }]
    });

    const payload = tabsApiMock.updateTab.mock.calls[0][1];
    expect(payload.drillSchema.pathLevels).toHaveLength(1);
    expect(payload.drillSchema.pathLevels[0].path).toEqual(['dining']);
    expect(payload.drillSchema.levels[1].groupByRules[0].rule[1]).toBe('none');
  });
});
