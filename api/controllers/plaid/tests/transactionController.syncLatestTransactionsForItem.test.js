import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../services/plaid/itemService.js', () => ({
  default: {
    getItem: vi.fn()
  }
}));

vi.mock('../../../services/plaid/transactionsCrudService.js', () => ({
  default: {
    fetchTransactionById: vi.fn(),
    fetchTransactions: vi.fn()
  }
}));

vi.mock('../../../services/plaid/syncTransactionsService.js', () => ({
  default: {
    syncTransactions: vi.fn()
  }
}));

vi.mock('../../../services/plaid/syncSessionService.js', () => ({
  default: {}
}));

vi.mock('../../../services/plaid/customError.js', () => ({
  CustomError: class extends Error {}
}));

import itemService from '../../../services/plaid/itemService.js';
import syncTransactionsService from '../../../services/plaid/syncTransactionsService.js';
import transactionController from '../transactionController.js';

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
}

describe('transactionController.syncLatestTransactionsForItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns delta arrays from sync result', async () => {
    itemService.getItem.mockResolvedValue({ _id: 'item-1', itemId: 'item-1' });
    syncTransactionsService.syncTransactions.mockResolvedValue({
      hasMore: false,
      cursor: 'cursor-1',
      added: 1,
      modified: 1,
      removed: 1,
      addedTransactions: [{ transaction_id: 'added-1' }],
      modifiedTransactions: [{ transaction_id: 'modified-1' }],
      removedTransactions: [{ transaction_id: 'removed-1' }]
    });

    const req = {
      params: { itemId: 'item-1' },
      user: { _id: 'user-1' }
    };
    const res = createResponse();

    await transactionController.syncLatestTransactionsForItem(req, res);

    expect(res.json).toHaveBeenCalledWith({
      hasMore: false,
      cursor: 'cursor-1',
      batchResults: {
        added: 1,
        modified: 1,
        removed: 1
      },
      addedTransactions: [{ transaction_id: 'added-1' }],
      modifiedTransactions: [{ transaction_id: 'modified-1' }],
      removedTransactions: [{ transaction_id: 'removed-1' }]
    });
  });

  test('defaults delta arrays to empty lists when missing from service response', async () => {
    itemService.getItem.mockResolvedValue({ _id: 'item-1', itemId: 'item-1' });
    syncTransactionsService.syncTransactions.mockResolvedValue({
      hasMore: false,
      cursor: 'cursor-1',
      added: 0,
      modified: 0,
      removed: 0
    });

    const req = {
      params: { itemId: 'item-1' },
      user: { _id: 'user-1' }
    };
    const res = createResponse();

    await transactionController.syncLatestTransactionsForItem(req, res);

    expect(res.json).toHaveBeenCalledWith({
      hasMore: false,
      cursor: 'cursor-1',
      batchResults: {
        added: 0,
        modified: 0,
        removed: 0
      },
      addedTransactions: [],
      modifiedTransactions: [],
      removedTransactions: []
    });
  });
});
