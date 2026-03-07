import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  state,
  fetchTransactionsForGroupMock,
  processAllTabsForSelectedGroupMock,
  extractDateRangeMock,
  groupsApiMock
} = vi.hoisted(() => ({
  state: {
    allUserGroups: [],
    allUserTabs: [],
    date: { start: '2025-01-01', end: '2025-04-30' },
    isLoading: false,
    blueBar: { message: null, loading: false },
    selected: {
      groupOverride: null,
      group: {
        _id: 'group-1',
        isLabel: true,
        accounts: [{ account_id: 'acc-1' }]
      },
      tabsForGroup: [],
      allGroupTransactions: []
    }
  },
  fetchTransactionsForGroupMock: vi.fn(),
  processAllTabsForSelectedGroupMock: vi.fn(),
  extractDateRangeMock: vi.fn(),
  groupsApiMock: {
    fetchGroupsAndAccounts: vi.fn(),
    updateGroup: vi.fn(),
    deleteGroup: vi.fn(),
    createGroup: vi.fn(),
    updateGroupSort: vi.fn()
  }
}));

vi.mock('@/features/dashboard/composables/useDashboardState', () => ({
  useDashboardState: () => ({ state })
}));

vi.mock('@/features/dashboard/composables/useTransactions.js', () => ({
  useTransactions: () => ({
    fetchTransactionsForGroup: fetchTransactionsForGroupMock
  })
}));

vi.mock('@/features/tabs/composables/useTabProcessing.js', () => ({
  useTabProcessing: () => ({
    processAllTabsForSelectedGroup: processAllTabsForSelectedGroupMock
  })
}));

vi.mock('@/shared/composables/useUtils', () => ({
  useUtils: () => ({
    sortBy: vi.fn(),
    waitUntilTypingStops: vi.fn(),
    extractDateRange: extractDateRangeMock
  })
}));

vi.mock('./useGroupsAPI', () => ({
  useGroupsAPI: () => groupsApiMock
}));

import { useSelectGroup } from './useSelectGroup.js';

function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

describe('useSelectGroup handleGroupChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    state.date = { start: '2025-01-01', end: '2025-04-30' };
    state.isLoading = false;
    state.blueBar = { message: null, loading: false };
    state.selected.groupOverride = null;
    state.selected.group = {
      _id: 'group-1',
      isLabel: true,
      accounts: [{ account_id: 'acc-1' }]
    };
    state.selected.tabsForGroup = [];
    state.selected.allGroupTransactions = [];

    extractDateRangeMock.mockImplementation((dateState) => `${dateState.start}_${dateState.end}`);
  });

  test('does not apply stale results when a newer date-range fetch is still in flight', async () => {
    const firstRequest = deferred();
    const secondRequest = deferred();

    fetchTransactionsForGroupMock
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise);

    const { handleGroupChange } = useSelectGroup();

    const firstPromise = handleGroupChange();
    expect(state.isLoading).toBe(true);

    state.date = { start: '2025-05-01', end: '2025-08-31' };
    const secondPromise = handleGroupChange();

    firstRequest.resolve([{ transaction_id: 'tx-old' }]);
    await firstPromise;

    expect(state.isLoading).toBe(true);
    expect(state.selected.allGroupTransactions).toEqual([]);

    secondRequest.resolve([{ transaction_id: 'tx-new' }]);
    await secondPromise;

    expect(state.isLoading).toBe(false);
    expect(state.selected.allGroupTransactions).toEqual([{ transaction_id: 'tx-new' }]);
  });

  test('clears selected-group transactions when the latest fetch fails', async () => {
    state.selected.tabsForGroup = [{ _id: 'tab-1', isSelected: true }];
    state.selected.allGroupTransactions = [{ transaction_id: 'tx-old' }];
    fetchTransactionsForGroupMock.mockRejectedValueOnce(new Error('network error'));

    const { handleGroupChange } = useSelectGroup();

    await expect(handleGroupChange()).rejects.toThrow('network error');
    expect(state.selected.allGroupTransactions).toEqual([]);
    expect(processAllTabsForSelectedGroupMock).toHaveBeenCalledWith({ showLoading: false });
    expect(state.isLoading).toBe(false);
  });
});
