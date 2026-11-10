import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../services/plaid/itemService.js', () => ({
  default: {
    savePlaidAccessData: vi.fn(),
    migrateAndCleanupOldItems: vi.fn()
  }
}));
vi.mock('../../../services/plaid/linkService.js', () => ({
  default: { exchangePublicToken: vi.fn(), createLinkToken: vi.fn() }
}));

import itemService from '../../../services/plaid/itemService.js';
import linkService from '../../../services/plaid/linkService.js';
import linkController from '../linkController.js';

describe('linkController.exchangeTokenAndSavePlaidItem', () => {
  beforeEach(() => vi.clearAllMocks());

  test('never auto-migrates or deletes other banks when linking an Item', async () => {
    linkService.exchangePublicToken.mockResolvedValue({
      access_token: 'new-token', item_id: 'new-item'
    });
    itemService.savePlaidAccessData.mockResolvedValue({ itemId: 'new-item' });
    const req = { body: { publicToken: 'public-token' }, user: { _id: 'user-1' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    await linkController.exchangeTokenAndSavePlaidItem(req, res);

    expect(itemService.migrateAndCleanupOldItems).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: {
        itemId: 'new-item',
        status: 'pending',
        message: 'Item connected successfully',
        migration: null
      }
    });
  });
});
