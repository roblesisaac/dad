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
});
