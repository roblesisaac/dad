import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../services/plaid/itemService.js', () => ({
  default: {}
}));

vi.mock('../../../services/plaid/transactionsCrudService.js', () => ({
  default: {
    searchTransactions: vi.fn(),
    fetchTransactionById: vi.fn(),
    fetchTransactions: vi.fn()
  }
}));

vi.mock('../../../services/plaid/syncTransactionsService.js', () => ({
  default: {}
}));

vi.mock('../../../services/plaid/syncSessionService.js', () => ({
  default: {}
}));

vi.mock('../../../services/plaid/customError.js', () => ({
  CustomError: class extends Error {}
}));

import transactionQueryService from '../../../services/plaid/transactionsCrudService.js';
import transactionController from '../transactionController.js';

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
}

describe('transactionController.searchTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns 400 when keyword is empty', async () => {
    const req = {
      user: { _id: 'user-1' },
      query: { keyword: '   ' }
    };
    const res = createResponse();

    await transactionController.searchTransactions(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INVALID_PARAMS',
      message: 'Keyword is required'
    });
    expect(transactionQueryService.searchTransactions).not.toHaveBeenCalled();
  });

  test('returns service response for valid search', async () => {
    const expectedResponse = {
      items: [{ _id: 'tx-1' }],
      pagination: {
        limit: 100,
        nextCursor: null,
        hasMore: false
      }
    };
    transactionQueryService.searchTransactions.mockResolvedValue(expectedResponse);

    const req = {
      user: { _id: 'user-1' },
      query: { keyword: 'coffee', cursor: 'abc123', limit: '100' }
    };
    const res = createResponse();

    await transactionController.searchTransactions(req, res);

    expect(transactionQueryService.searchTransactions).toHaveBeenCalledWith(req.user, req.query);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('maps service cursor validation errors to 400 response', async () => {
    transactionQueryService.searchTransactions.mockRejectedValue({
      code: 'INVALID_CURSOR',
      message: 'Invalid cursor'
    });

    const req = {
      user: { _id: 'user-1' },
      query: { keyword: 'coffee', cursor: 'invalid' }
    };
    const res = createResponse();

    await transactionController.searchTransactions(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INVALID_CURSOR',
      message: 'Invalid cursor'
    });
  });
});
