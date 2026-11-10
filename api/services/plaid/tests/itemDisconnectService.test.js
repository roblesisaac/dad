import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../models/plaidItems.js', () => ({
  default: { update: vi.fn() }
}));
vi.mock('../itemService.js', () => ({
  default: { getItem: vi.fn(), decryptAccessToken: vi.fn() }
}));
vi.mock('../plaidService.js', () => ({
  default: { removeItem: vi.fn() }
}));

import plaidItems from '../../../models/plaidItems.js';
import itemService from '../itemService.js';
import plaidService from '../plaidService.js';
import disconnectService from '../itemDisconnectService.js';

describe('itemDisconnectService.disconnectItem', () => {
  const user = { _id: 'user-1', encryptedKey: 'key' };

  beforeEach(() => {
    vi.clearAllMocks();
    itemService.getItem.mockResolvedValue({
      _id: 'item-db-id', itemId: 'plaid-item-1', accessToken: 'encrypted'
    });
    itemService.decryptAccessToken.mockReturnValue('access-token');
    plaidService.removeItem.mockResolvedValue({});
    plaidItems.update.mockResolvedValue({ _id: 'item-db-id' });
  });

  test('revokes Plaid first and retains all financial records', async () => {
    const result = await disconnectService.disconnectItem('plaid-item-1', user);
    expect(result).toMatchObject({ disconnected: true, alreadyDisconnected: false });
    expect(result.disconnectedAt).toEqual(expect.any(Number));
    expect(plaidService.removeItem).toHaveBeenCalledWith('access-token');
    expect(plaidItems.update).toHaveBeenCalledWith(
      { itemId: 'plaid-item-1', userId: 'user-1' },
      { status: 'disconnected', disconnectedAt: result.disconnectedAt, accessToken: '' }
    );
    expect(plaidService.removeItem.mock.invocationCallOrder[0])
      .toBeLessThan(plaidItems.update.mock.invocationCallOrder[0]);
  });

  test('never marks a bank disconnected when Plaid removal fails', async () => {
    plaidService.removeItem.mockRejectedValue(new Error('Plaid unavailable'));
    await expect(disconnectService.disconnectItem('plaid-item-1', user))
      .rejects.toThrow('PLAID_REVOKE_FAILED');
    expect(plaidItems.update).not.toHaveBeenCalled();
  });

  test('does not revoke again if already disconnected', async () => {
    itemService.getItem.mockResolvedValue({
      itemId: 'plaid-item-1', status: 'disconnected', disconnectedAt: 123
    });
    expect(await disconnectService.disconnectItem('plaid-item-1', user)).toEqual({
      disconnected: true,
      alreadyDisconnected: true,
      itemId: 'plaid-item-1',
      disconnectedAt: 123
    });
    expect(plaidService.removeItem).not.toHaveBeenCalled();
    expect(plaidItems.update).not.toHaveBeenCalled();
  });

  test('rejects missing and cross-user Items', async () => {
    itemService.getItem.mockResolvedValue(null);
    await expect(disconnectService.disconnectItem('plaid-item-1', user))
      .rejects.toThrow('ITEM_NOT_FOUND');
    expect(itemService.getItem).toHaveBeenCalledWith('plaid-item-1', 'user-1');
    expect(plaidService.removeItem).not.toHaveBeenCalled();
  });

  test('reports local persistence errors after Plaid revoke', async () => {
    plaidItems.update.mockRejectedValue(new Error('Write failed'));
    await expect(disconnectService.disconnectItem('plaid-item-1', user))
      .rejects.toThrow('ITEM_DISCONNECT_SAVE_ERROR');
    expect(plaidService.removeItem).toHaveBeenCalledTimes(1);
  });
});
