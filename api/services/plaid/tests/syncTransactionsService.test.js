import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../plaidService.js', () => ({
  default: {}
}));

vi.mock('../itemService.js', () => ({
  default: {}
}));

vi.mock('../../../models/plaidItems.js', () => ({
  default: {
    update: vi.fn()
  }
}));

vi.mock('../transactionRecoveryService.js', () => ({
  default: {}
}));

vi.mock('../transactionsCrudService.js', () => ({
  default: {}
}));

vi.mock('../syncSessionService.js', () => ({
  default: {
    countsMatch: vi.fn(),
    updateSyncSessionLastNoChangesTime: vi.fn()
  }
}));

import plaidItems from '../../../models/plaidItems.js';
import syncSessionService from '../syncSessionService.js';
import syncTransactionsService from '../syncTransactionsService.js';

function buildCountsMatch(expected = {}, actual = {}) {
  return expected.added === actual.added
    && expected.modified === actual.modified
    && expected.removed === actual.removed;
}

describe('syncTransactionsService delta responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncSessionService.countsMatch.mockImplementation(({ expected, actual }) =>
      buildCountsMatch(expected, actual)
    );
  });

  test('returns modified/removed deltas when batch counts match', async () => {
    const processAddedSpy = vi.spyOn(syncTransactionsService, '_processAddedTransactions')
      .mockResolvedValue({ successCount: 1, failedTransactions: [] });
    const processModifiedSpy = vi.spyOn(syncTransactionsService, '_processModifiedTransactions')
      .mockResolvedValue({ successCount: 1, failedTransactions: [] });
    const processRemovedSpy = vi.spyOn(syncTransactionsService, '_processRemovedTransactions')
      .mockResolvedValue({ successCount: 1, failedTransactions: [] });

    const plaidData = {
      added: [{ transaction_id: 'added-1' }],
      modified: [{ transaction_id: 'modified-1' }],
      removed: [{ transaction_id: 'removed-1' }],
      has_more: false,
      next_cursor: 'next-cursor'
    };

    const result = await syncTransactionsService._processSyncData(
      { itemId: 'item-1' },
      { _id: 'user-1' },
      'cursor-1',
      Date.now(),
      plaidData
    );

    expect(processAddedSpy).toHaveBeenCalledTimes(1);
    expect(processModifiedSpy).toHaveBeenCalledTimes(1);
    expect(processRemovedSpy).toHaveBeenCalledTimes(1);
    expect(result.modifiedTransactions).toEqual(plaidData.modified);
    expect(result.removedTransactions).toEqual(plaidData.removed);
  });

  test('returns empty modified/removed deltas when counts mismatch', async () => {
    vi.spyOn(syncTransactionsService, '_processAddedTransactions')
      .mockResolvedValue({ successCount: 1, failedTransactions: [] });
    vi.spyOn(syncTransactionsService, '_processModifiedTransactions')
      .mockResolvedValue({ successCount: 0, failedTransactions: [] });
    vi.spyOn(syncTransactionsService, '_processRemovedTransactions')
      .mockResolvedValue({ successCount: 1, failedTransactions: [] });

    const result = await syncTransactionsService._processSyncData(
      { itemId: 'item-1' },
      { _id: 'user-1' },
      'cursor-1',
      Date.now(),
      {
        added: [{ transaction_id: 'added-1' }],
        modified: [{ transaction_id: 'modified-1' }],
        removed: [{ transaction_id: 'removed-1' }],
        has_more: false,
        next_cursor: 'next-cursor'
      }
    );

    expect(result.modifiedTransactions).toEqual([]);
    expect(result.removedTransactions).toEqual([]);
  });

  test('builds sync response including modified/removed transaction arrays', () => {
    const response = syncTransactionsService._buildSyncResponse(
      {
        addedCount: 1,
        addedTransactions: [{ transaction_id: 'added-1' }],
        modifiedCount: 1,
        modifiedTransactions: [{ transaction_id: 'modified-1' }],
        removedCount: 1,
        removedTransactions: [{ transaction_id: 'removed-1' }],
        hasMore: false,
        cursor: 'cursor-1',
        nextCursor: 'cursor-2',
        expectedCounts: { added: 1, modified: 1, removed: 1 },
        actualCounts: { added: 1, modified: 1, removed: 1 },
        syncCounts: {
          expected: { added: 1, modified: 1, removed: 1 },
          actual: { added: 1, modified: 1, removed: 1 }
        },
        hasFailures: false
      },
      123,
      1
    );

    expect(response.addedTransactions).toEqual([{ transaction_id: 'added-1' }]);
    expect(response.modifiedTransactions).toEqual([{ transaction_id: 'modified-1' }]);
    expect(response.removedTransactions).toEqual([{ transaction_id: 'removed-1' }]);
  });

  test('builds recovery response with empty delta arrays', () => {
    const response = syncTransactionsService._buildRecoveryResponse({
      removedCount: 4,
      revertedTo: 'sync-session-1'
    });

    expect(response.recovery.performed).toBe(true);
    expect(response.addedTransactions).toEqual([]);
    expect(response.modifiedTransactions).toEqual([]);
    expect(response.removedTransactions).toEqual([]);
  });

  test('returns no-change response with empty delta arrays', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(12345);

    const response = await syncTransactionsService._handleNoChangesCase(
      { _id: 'sync-session-1', syncTime: 11111 },
      { _id: 'plaid-item-1' },
      { _id: 'user-1' },
      { has_more: false, next_cursor: 'next-cursor' }
    );

    expect(syncSessionService.updateSyncSessionLastNoChangesTime).toHaveBeenCalledWith('sync-session-1', 12345);
    expect(plaidItems.update).toHaveBeenCalledWith('plaid-item-1', { status: 'complete' });
    expect(response.addedTransactions).toEqual([]);
    expect(response.modifiedTransactions).toEqual([]);
    expect(response.removedTransactions).toEqual([]);

    nowSpy.mockRestore();
  });
});
