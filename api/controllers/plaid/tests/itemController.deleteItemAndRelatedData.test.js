import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../services/plaid/plaidService.js', () => ({
  default: {}
}));

vi.mock('../../../services/plaid/itemService.js', () => ({
  default: {}
}));

vi.mock('../../../services/plaid/accountService.js', () => ({
  default: {}
}));

vi.mock('../../../services/plaid/dataExportService.js', () => ({
  default: {}
}));

vi.mock('../../../services/plaid/dataDeletionService.js', () => ({
  default: {}
}));

vi.mock('../../../services/plaid/itemDeletionService.js', () => ({
  default: {
    deleteItemAndRelatedData: vi.fn()
  }
}));

vi.mock('../../../utils/scrub', () => ({
  default: value => value
}));

import itemDeletionService from '../../../services/plaid/itemDeletionService.js';
import itemController from '../itemController.js';

describe('itemController.deleteItemAndRelatedData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createResponse() {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  }

  test('returns 200 and delegates deletion with defaults', async () => {
    const req = {
      params: { _id: 'item-1' },
      body: {},
      query: {},
      user: { _id: 'user-1' }
    };
    const res = createResponse();
    const serviceResponse = { deleted: true, itemId: 'item-1' };

    itemDeletionService.deleteItemAndRelatedData.mockResolvedValue(serviceResponse);

    await itemController.deleteItemAndRelatedData(req, res);

    expect(itemDeletionService.deleteItemAndRelatedData).toHaveBeenCalledWith({
      itemId: 'item-1',
      user: req.user,
      revokeAtPlaid: true,
      batchSize: undefined
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(serviceResponse);
  });

  test('parses revokeAtPlaid and batchSize from payload', async () => {
    const req = {
      params: { _id: 'item-1' },
      body: { revokeAtPlaid: 'false', batchSize: 250 },
      query: {},
      user: { _id: 'user-1' }
    };
    const res = createResponse();

    itemDeletionService.deleteItemAndRelatedData.mockResolvedValue({ deleted: true, itemId: 'item-1' });

    await itemController.deleteItemAndRelatedData(req, res);

    expect(itemDeletionService.deleteItemAndRelatedData).toHaveBeenCalledWith({
      itemId: 'item-1',
      user: req.user,
      revokeAtPlaid: false,
      batchSize: 250
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 200 for idempotent not-found responses', async () => {
    const req = {
      params: { _id: 'item-1' },
      body: {},
      query: {},
      user: { _id: 'user-1' }
    };
    const res = createResponse();
    const serviceResponse = { deleted: false, reason: 'not_found', itemId: 'item-1' };

    itemDeletionService.deleteItemAndRelatedData.mockResolvedValue(serviceResponse);

    await itemController.deleteItemAndRelatedData(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(serviceResponse);
  });

  test('returns 400 when item id is missing', async () => {
    const req = {
      params: {},
      body: {},
      query: {},
      user: { _id: 'user-1' }
    };
    const res = createResponse();

    await itemController.deleteItemAndRelatedData(req, res);

    expect(itemDeletionService.deleteItemAndRelatedData).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INVALID_PARAMS',
      message: 'Item ID is required'
    });
  });

  test('returns 400 with parsed service error code and message', async () => {
    const req = {
      params: { _id: 'item-1' },
      body: {},
      query: {},
      user: { _id: 'user-1' }
    };
    const res = createResponse();

    itemDeletionService.deleteItemAndRelatedData.mockRejectedValue(
      new Error('ITEM_DELETE_ERROR: Something failed')
    );

    await itemController.deleteItemAndRelatedData(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'ITEM_DELETE_ERROR',
      message: 'Something failed'
    });
  });
});
