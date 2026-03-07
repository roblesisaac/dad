import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockState,
  evaluateTabDataMock,
  combinedRulesForTabMock
} = vi.hoisted(() => ({
  mockState: {
    isInitialized: true,
    isLoading: false,
    date: { start: '2024-01-01', end: '2024-01-31' },
    selected: {
      group: null,
      allGroupTransactions: [],
      tabsForGroup: []
    }
  },
  evaluateTabDataMock: vi.fn(),
  combinedRulesForTabMock: vi.fn()
}));

vi.mock('@/features/dashboard/composables/useDashboardState.js', () => ({
  useDashboardState: () => ({ state: mockState })
}));

vi.mock('@/features/tabs/composables/useTabRules.js', () => ({
  useTabRules: () => ({
    ruleMethods: {},
    combinedRulesForTab: combinedRulesForTabMock
  })
}));

vi.mock('@/shared/composables/useUtils.js', () => ({
  useUtils: () => ({
    getDayOfWeekPST: () => 'monday'
  })
}));

vi.mock('@/features/tabs/utils/tabEvaluator.js', () => ({
  evaluateTabData: (input) => evaluateTabDataMock(input)
}));

import { useTabProcessing } from './useTabProcessing.js';

function createTransaction(transactionId, overrides = {}) {
  return {
    transaction_id: transactionId,
    account_id: 'acc-1',
    date: '2024-01-10',
    amount: 10,
    name: `Transaction ${transactionId}`,
    personal_finance_category: { primary: 'FOOD_AND_DRINK' },
    ...overrides
  };
}

function resetMockState() {
  const tab = {
    _id: 'tab-1',
    isSelected: true,
    total: 0,
    categorizedItems: [['existing', []]]
  };

  mockState.isInitialized = true;
  mockState.isLoading = false;
  mockState.date = { start: '2024-01-01', end: '2024-01-31' };
  mockState.selected = {
    group: {
      _id: 'group-1',
      accounts: [{ account_id: 'acc-1' }]
    },
    allGroupTransactions: [createTransaction('t1')],
    tabsForGroup: [tab]
  };

  combinedRulesForTabMock.mockReturnValue([]);
  evaluateTabDataMock.mockImplementation(({ transactions }) => ({
    tabTotal: transactions.length,
    categorizedItems: [['all', transactions, transactions.length]],
    hiddenItems: [],
    groupByMode: 'none'
  }));
}

describe('useTabProcessing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockState();
  });

  test('applyTransactionSyncDelta inserts added transactions and recomputes totals without toggling loading', async () => {
    const { applyTransactionSyncDelta } = useTabProcessing();

    const result = await applyTransactionSyncDelta(
      { addedTransactions: [createTransaction('t2')] },
      { showLoading: false }
    );

    expect(result).toEqual({
      added: 1,
      modified: 0,
      removed: 0,
      totalChanged: 1
    });
    expect(mockState.selected.allGroupTransactions.map(tx => tx.transaction_id).sort()).toEqual(['t1', 't2']);
    expect(mockState.selected.tabsForGroup[0].total).toBe(2);
    expect(mockState.isLoading).toBe(false);
  });

  test('applyTransactionSyncDelta updates and removes modified transactions based on filters', async () => {
    const { applyTransactionSyncDelta } = useTabProcessing();

    const updateResult = await applyTransactionSyncDelta(
      {
        modifiedTransactions: [
          createTransaction('t1', { amount: 55, account_id: 'acc-1', date: '2024-01-12' })
        ]
      },
      { showLoading: false }
    );

    expect(updateResult.modified).toBe(1);
    expect(mockState.selected.allGroupTransactions[0].amount).toBe(55);

    const removeOutOfScopeResult = await applyTransactionSyncDelta(
      {
        modifiedTransactions: [
          createTransaction('t1', { account_id: 'acc-2', date: '2024-01-12' })
        ]
      },
      { showLoading: false }
    );

    expect(removeOutOfScopeResult.modified).toBe(1);
    expect(mockState.selected.allGroupTransactions).toEqual([]);
  });

  test('applyTransactionSyncDelta removes transactions and recomputes totals', async () => {
    mockState.selected.allGroupTransactions = [
      createTransaction('t1'),
      createTransaction('t2')
    ];

    const { applyTransactionSyncDelta } = useTabProcessing();
    const result = await applyTransactionSyncDelta(
      { removedTransactions: [{ transaction_id: 't2' }] },
      { showLoading: false }
    );

    expect(result).toEqual({
      added: 0,
      modified: 0,
      removed: 1,
      totalChanged: 1
    });
    expect(mockState.selected.allGroupTransactions.map(tx => tx.transaction_id)).toEqual(['t1']);
    expect(mockState.selected.tabsForGroup[0].total).toBe(1);
  });

  test('processAllTabsForSelectedGroup does not clear categorized items to an empty array before assignment', async () => {
    const assignments = [];
    const tab = {
      _id: 'tab-1',
      isSelected: true,
      total: 0,
      _categorizedItems: [['existing', ['t1']]]
    };

    Object.defineProperty(tab, 'categorizedItems', {
      configurable: true,
      get() {
        return this._categorizedItems;
      },
      set(value) {
        assignments.push(value);
        this._categorizedItems = value;
      }
    });

    mockState.selected.tabsForGroup = [tab];

    const { processAllTabsForSelectedGroup } = useTabProcessing();
    await processAllTabsForSelectedGroup({ showLoading: false });

    const assignedEmptyArray = assignments.some(value => Array.isArray(value) && value.length === 0);
    expect(assignedEmptyArray).toBe(false);
    expect(mockState.isLoading).toBe(false);
  });
});
