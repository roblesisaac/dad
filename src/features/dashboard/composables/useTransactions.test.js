import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  apiGetMock,
  extractDateRangeMock
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  extractDateRangeMock: vi.fn()
}));

vi.mock('@/shared/composables/useApi.js', () => ({
  useApi: () => ({
    get: apiGetMock
  })
}));

vi.mock('../../../shared/composables/useUtils.js', () => ({
  useUtils: () => ({
    extractDateRange: extractDateRangeMock
  })
}));

import { useTransactions } from './useTransactions.js';

function dateRangeFromUrl(url) {
  const queryString = url.split('?')[1] || '';
  const params = new URLSearchParams(queryString);
  return params.get('date');
}

describe('useTransactions batching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    extractDateRangeMock.mockImplementation((dateRangeState) => (
      `${dateRangeState.start}_${dateRangeState.end}`
    ));
  });

  test('splits a full year into 4-month batches for a single account', async () => {
    apiGetMock.mockImplementation(async (url) => {
      const range = dateRangeFromUrl(url);

      if (range === '2025-01-01_2025-04-30') {
        return [
          { transaction_id: 't-1' },
          { transaction_id: 'dup' }
        ];
      }

      if (range === '2025-05-01_2025-08-31') {
        return [
          { transaction_id: 't-2' },
          { transaction_id: 'dup' }
        ];
      }

      if (range === '2025-09-01_2025-12-31') {
        return [{ transaction_id: 't-3' }];
      }

      return [];
    });

    const { fetchTransactions } = useTransactions();
    const transactions = await fetchTransactions('acc-1', '2025-01-01_2025-12-31');

    expect(apiGetMock).toHaveBeenCalledTimes(3);
    expect(apiGetMock.mock.calls.map(([url]) => dateRangeFromUrl(url))).toEqual([
      '2025-01-01_2025-04-30',
      '2025-05-01_2025-08-31',
      '2025-09-01_2025-12-31'
    ]);
    expect(transactions.map(tx => tx.transaction_id).sort()).toEqual(['dup', 't-1', 't-2', 't-3']);
  });

  test('reports group fetch progress using completed and total fetch counts', async () => {
    apiGetMock.mockResolvedValue([]);

    const { fetchTransactionsForGroup } = useTransactions();
    const progressEvents = [];

    await fetchTransactionsForGroup(
      {
        accounts: [
          { account_id: 'acc-101' },
          { account_id: 'acc-202' }
        ]
      },
      {
        start: '2025-01-01',
        end: '2025-12-31'
      },
      {
        onProgress: (progress) => {
          progressEvents.push(progress);
        }
      }
    );

    expect(apiGetMock).toHaveBeenCalledTimes(6);
    expect(progressEvents[0]).toMatchObject({
      completedFetches: 0,
      totalFetches: 6,
      percentage: 0
    });

    const lastEvent = progressEvents[progressEvents.length - 1];
    expect(lastEvent).toMatchObject({
      completedFetches: 6,
      totalFetches: 6,
      percentage: 100,
      totalAccounts: 2,
      totalBatches: 3
    });
  });

  test('fetches account transactions when group account ids use accountId fallback', async () => {
    apiGetMock.mockResolvedValue([]);

    const { fetchTransactionsForGroup } = useTransactions();
    await fetchTransactionsForGroup(
      {
        accounts: [
          { accountId: 'acc-legacy-1' },
          { account_id: 'acc-modern-2' }
        ]
      },
      {
        start: '2025-03-01',
        end: '2025-03-31'
      }
    );

    const requestedAccountIds = apiGetMock.mock.calls
      .map(([url]) => new URLSearchParams(url.split('?')[1] || '').get('account_id'))
      .sort();

    expect(requestedAccountIds).toEqual(['acc-legacy-1', 'acc-modern-2']);
  });

  test('fetches virtual all-accounts group by date range without per-account ids', async () => {
    apiGetMock.mockResolvedValue([
      { transaction_id: 'all-1' }
    ]);

    const { fetchTransactionsForGroup } = useTransactions();
    const transactions = await fetchTransactionsForGroup(
      {
        _id: '_ALL_ACCOUNTS',
        isVirtualAllAccounts: true,
        accounts: []
      },
      {
        start: '2025-03-01',
        end: '2025-03-31'
      }
    );

    expect(transactions.map(item => item.transaction_id)).toEqual(['all-1']);
    expect(apiGetMock).toHaveBeenCalledTimes(1);
    const [requestUrl] = apiGetMock.mock.calls[0];
    const queryParams = new URLSearchParams(requestUrl.split('?')[1] || '');
    expect(queryParams.get('date')).toBe('2025-03-01_2025-03-31');
    expect(queryParams.get('account_id')).toBe('');
  });
});
