import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../models/plaidTransactions.js', () => ({
  default: {
    findAll: vi.fn()
  }
}));

import plaidTransactions from '../../../models/plaidTransactions.js';
import transactionQueryService from '../transactionsCrudService.js';

describe('transactionQueryService.searchTransactions', () => {
  const user = { _id: 'user:1' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('matches keyword in transaction name', async () => {
    plaidTransactions.findAll.mockResolvedValue([
      { _id: 'tx-1', name: 'Coffee Shop', authorized_date: '2026-01-01' },
      { _id: 'tx-2', name: 'Groceries', authorized_date: '2026-01-02' }
    ]);

    const response = await transactionQueryService.searchTransactions(user, { keyword: 'coffee' });

    expect(response.items).toHaveLength(1);
    expect(response.items[0]._id).toBe('tx-1');
  });

  test('matches keyword in merchant name', async () => {
    plaidTransactions.findAll.mockResolvedValue([
      { _id: 'tx-1', merchant_name: 'Whole Foods', authorized_date: '2026-01-03' },
      { _id: 'tx-2', merchant_name: 'Target', authorized_date: '2026-01-04' }
    ]);

    const response = await transactionQueryService.searchTransactions(user, { keyword: 'whole' });

    expect(response.items).toHaveLength(1);
    expect(response.items[0]._id).toBe('tx-1');
  });

  test('matches keyword in notes and recategorizeAs', async () => {
    plaidTransactions.findAll.mockResolvedValue([
      {
        _id: 'tx-1',
        notes: 'Weekend market run',
        recategorizeAs: 'food',
        authorized_date: '2026-01-04'
      },
      {
        _id: 'tx-2',
        notes: 'Gym monthly fee',
        recategorizeAs: 'fitness',
        authorized_date: '2026-01-05'
      }
    ]);

    const notesMatch = await transactionQueryService.searchTransactions(user, { keyword: 'market' });
    const recategorizedMatch = await transactionQueryService.searchTransactions(user, { keyword: 'fitn' });

    expect(notesMatch.items).toHaveLength(1);
    expect(notesMatch.items[0]._id).toBe('tx-1');
    expect(recategorizedMatch.items).toHaveLength(1);
    expect(recategorizedMatch.items[0]._id).toBe('tx-2');
  });

  test('matches keyword in category and personal finance category fields', async () => {
    plaidTransactions.findAll.mockResolvedValue([
      {
        _id: 'tx-1',
        category: 'food,dining',
        authorized_date: '2026-01-02'
      },
      {
        _id: 'tx-2',
        personal_finance_category: {
          primary: 'GENERAL_MERCHANDISE',
          detailed: 'GENERAL_MERCHANDISE_SUPERSTORES'
        },
        authorized_date: '2026-01-03'
      }
    ]);

    const categoryMatch = await transactionQueryService.searchTransactions(user, { keyword: 'dining' });
    const pfcMatch = await transactionQueryService.searchTransactions(user, { keyword: 'superstore' });

    expect(categoryMatch.items).toHaveLength(1);
    expect(categoryMatch.items[0]._id).toBe('tx-1');
    expect(pfcMatch.items).toHaveLength(1);
    expect(pfcMatch.items[0]._id).toBe('tx-2');
  });

  test('matches case-insensitively', async () => {
    plaidTransactions.findAll.mockResolvedValue([
      { _id: 'tx-1', name: 'Trader Joes', authorized_date: '2026-01-04' }
    ]);

    const response = await transactionQueryService.searchTransactions(user, { keyword: 'trader' });

    expect(response.items).toHaveLength(1);
    expect(response.items[0]._id).toBe('tx-1');
  });

  test('sorts newest first with _id tie-breaker for same date', async () => {
    plaidTransactions.findAll.mockResolvedValue([
      { _id: 'tx-1', name: 'Coffee', authorized_date: '2026-01-02' },
      { _id: 'tx-2', name: 'Coffee', authorized_date: '2026-01-02' },
      { _id: 'tx-3', name: 'Coffee', authorized_date: '2026-01-04' }
    ]);

    const response = await transactionQueryService.searchTransactions(user, { keyword: 'coffee' });

    expect(response.items.map(item => item._id)).toEqual(['tx-3', 'tx-2', 'tx-1']);
  });

  test('returns paginated response with nextOffset and hasMore', async () => {
    plaidTransactions.findAll.mockResolvedValue([
      { _id: 'tx-1', name: 'Coffee', authorized_date: '2026-01-01' },
      { _id: 'tx-2', name: 'Coffee', authorized_date: '2026-01-02' },
      { _id: 'tx-3', name: 'Coffee', authorized_date: '2026-01-03' },
      { _id: 'tx-4', name: 'Coffee', authorized_date: '2026-01-04' }
    ]);

    const response = await transactionQueryService.searchTransactions(user, {
      keyword: 'coffee',
      offset: '1',
      limit: '2'
    });

    expect(response.items.map(item => item._id)).toEqual(['tx-3', 'tx-2']);
    expect(response.pagination).toEqual({
      offset: 1,
      limit: 2,
      nextOffset: 3,
      hasMore: true,
      total: 4
    });
  });

  test('rejects empty keyword and scopes fetch to current user collection', async () => {
    await expect(
      transactionQueryService.searchTransactions(user, { keyword: '   ' })
    ).rejects.toMatchObject({ code: 'INVALID_PARAMS' });

    plaidTransactions.findAll.mockResolvedValue([]);
    await transactionQueryService.searchTransactions(user, { keyword: 'x' });

    expect(plaidTransactions.findAll).toHaveBeenCalledWith(
      'plaidtransactions-user-1:*',
      { limit: 250 }
    );
  });
});
