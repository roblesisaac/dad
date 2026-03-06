import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../models/plaidTransactions.js', () => ({
  default: {
    find: vi.fn()
  }
}));

import plaidTransactions from '../../../models/plaidTransactions.js';
import transactionQueryService from '../transactionsCrudService.js';

function decodeCursor(cursor) {
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  return JSON.parse(decoded).lastKey;
}

describe('transactionQueryService.searchTransactions', () => {
  const user = { _id: 'user:1' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns first non-empty page and cursor for more results', async () => {
    plaidTransactions.find.mockResolvedValue({
      items: [
        { _id: 'tx-1', name: 'Coffee Shop', authorized_date: '2026-01-01' },
        { _id: 'tx-2', name: 'Groceries', authorized_date: '2026-01-02' }
      ],
      lastKey: 'cursor-1'
    });

    const response = await transactionQueryService.searchTransactions(user, { keyword: 'coffee' });

    expect(response.items).toHaveLength(1);
    expect(response.items[0]._id).toBe('tx-1');
    expect(response.pagination).toEqual({
      limit: 100,
      hasMore: true,
      nextCursor: response.pagination.nextCursor
    });
    expect(decodeCursor(response.pagination.nextCursor)).toBe('cursor-1');
    expect(plaidTransactions.find).toHaveBeenCalledTimes(1);
    expect(plaidTransactions.find).toHaveBeenCalledWith(
      { userId: 'user:1', date: '*' },
      { limit: 250, reverse: true }
    );
  });

  test('keeps scanning until the first non-empty match page and returns next cursor', async () => {
    plaidTransactions.find
      .mockResolvedValueOnce({
        items: [{ _id: 'tx-1', name: 'Groceries', authorized_date: '2026-01-05' }],
        lastKey: 'cursor-1'
      })
      .mockResolvedValueOnce({
        items: [{ _id: 'tx-2', notes: 'Coffee beans', authorized_date: '2026-01-04' }],
        lastKey: 'cursor-2'
      });

    const response = await transactionQueryService.searchTransactions(user, { keyword: 'coffee', limit: '50' });

    expect(response.items.map(item => item._id)).toEqual(['tx-2']);
    expect(response.pagination.limit).toBe(50);
    expect(response.pagination.hasMore).toBe(true);
    expect(decodeCursor(response.pagination.nextCursor)).toBe('cursor-2');
    expect(plaidTransactions.find).toHaveBeenCalledTimes(2);
    expect(plaidTransactions.find).toHaveBeenNthCalledWith(
      2,
      { userId: 'user:1', date: '*' },
      { limit: 250, reverse: true, start: 'cursor-1' }
    );
  });

  test('returns empty with cursor when scan cap is reached', async () => {
    const pageResponses = Array.from({ length: 24 }, (_, index) => ({
      items: [{ _id: `tx-${index}`, name: 'Groceries', authorized_date: '2026-01-01' }],
      lastKey: `cursor-${index + 1}`
    }));
    let cursor = 0;

    plaidTransactions.find.mockImplementation(async () => {
      const response = pageResponses[cursor];
      cursor += 1;
      return response;
    });

    const response = await transactionQueryService.searchTransactions(user, { keyword: 'coffee' });

    expect(response.items).toEqual([]);
    expect(response.pagination.limit).toBe(100);
    expect(response.pagination.hasMore).toBe(true);
    expect(decodeCursor(response.pagination.nextCursor)).toBe('cursor-24');
    expect(plaidTransactions.find).toHaveBeenCalledTimes(24);
  });

  test('returns empty without cursor when data is exhausted', async () => {
    plaidTransactions.find.mockResolvedValue({
      items: [{ _id: 'tx-1', name: 'Groceries', authorized_date: '2026-01-01' }],
      lastKey: null
    });

    const response = await transactionQueryService.searchTransactions(user, { keyword: 'coffee' });

    expect(response.items).toEqual([]);
    expect(response.pagination).toEqual({
      limit: 100,
      hasMore: false,
      nextCursor: null
    });
    expect(plaidTransactions.find).toHaveBeenCalledTimes(1);
  });

  test('rejects invalid cursor', async () => {
    await expect(
      transactionQueryService.searchTransactions(user, {
        keyword: 'coffee',
        cursor: 'not-valid-base64url'
      })
    ).rejects.toMatchObject({ code: 'INVALID_CURSOR' });

    expect(plaidTransactions.find).not.toHaveBeenCalled();
  });

  test('sorts newest first with _id tie-breaker for same date', async () => {
    plaidTransactions.find.mockResolvedValue({
      items: [
        { _id: 'tx-1', name: 'Coffee', authorized_date: '2026-01-02' },
        { _id: 'tx-2', name: 'Coffee', authorized_date: '2026-01-04' },
        { _id: 'tx-3', name: 'Coffee', authorized_date: '2026-01-04' }
      ],
      lastKey: null
    });

    const response = await transactionQueryService.searchTransactions(user, { keyword: 'coffee' });

    expect(response.items.map(item => item._id)).toEqual(['tx-3', 'tx-2', 'tx-1']);
  });

  test('rejects when pagination cursor repeats during search', async () => {
    plaidTransactions.find
      .mockResolvedValueOnce({
        items: [{ _id: 'tx-1', name: 'Groceries', authorized_date: '2026-01-01' }],
        lastKey: 'repeat-cursor'
      })
      .mockResolvedValueOnce({
        items: [{ _id: 'tx-2', name: 'Groceries', authorized_date: '2026-01-02' }],
        lastKey: 'repeat-cursor'
      });

    await expect(
      transactionQueryService.searchTransactions(user, { keyword: 'coffee' })
    ).rejects.toMatchObject({ code: 'PAGINATION_CURSOR_LOOP' });

    expect(plaidTransactions.find).toHaveBeenCalledTimes(2);
  });

  test('rejects empty keyword and scopes search to the current user', async () => {
    await expect(transactionQueryService.searchTransactions(user, { keyword: '   ' }))
      .rejects
      .toMatchObject({ code: 'INVALID_PARAMS' });

    plaidTransactions.find.mockResolvedValue({ items: [], lastKey: null });
    await transactionQueryService.searchTransactions(user, { keyword: 'x' });

    expect(plaidTransactions.find).toHaveBeenCalledWith(
      { userId: 'user:1', date: '*' },
      { limit: 250, reverse: true }
    );
  });
});
