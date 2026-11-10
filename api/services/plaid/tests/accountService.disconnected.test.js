import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../baseService.js', () => ({
  default: class {
    validateUser(user) {
      if (!user?._id || !user?.encryptedKey) throw new Error('Invalid user');
    }
  }
}));
vi.mock('../../../models/plaidAccounts.js', () => ({
  default: { findAll: vi.fn(), save: vi.fn(), update: vi.fn() }
}));
vi.mock('../../../models/plaidGroups.js', () => ({
  default: { findAll: vi.fn(), save: vi.fn(), update: vi.fn() }
}));
vi.mock('../itemService.js', () => ({
  default: { getUserItems: vi.fn() }
}));
vi.mock('../plaidService.js', () => ({
  default: { fetchAccountsFromPlaid: vi.fn() }
}));

import plaidAccounts from '../../../models/plaidAccounts.js';
import plaidGroups from '../../../models/plaidGroups.js';
import itemService from '../itemService.js';
import plaidService from '../plaidService.js';
import accountService from '../accountService.js';

describe('accountService.syncAccountsAndGroups with disconnected history', () => {
  const user = { _id: 'user:one', encryptedKey: 'encrypted-key' };
  const archivedAccount = { _id: 'archived-db', account_id: 'archived', itemId: 'old-item' };
  const archivedGroup = {
    _id: 'archived-group', name: '0001', isLabel: false,
    accounts: [{ account_id: 'archived' }]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    plaidAccounts.findAll.mockResolvedValue([archivedAccount]);
    plaidGroups.findAll.mockResolvedValue([archivedGroup]);
    plaidGroups.update.mockResolvedValue({});
  });

  test('still returns saved accounts and groups when the last Item is disconnected', async () => {
    itemService.getUserItems.mockResolvedValue([
      { itemId: 'old-item', status: 'disconnected', disconnectedAt: 123 }
    ]);
    const result = await accountService.syncAccountsAndGroups(user);
    expect(result).toEqual({
      accounts: [archivedAccount],
      groups: [archivedGroup],
      itemsNeedingReauth: []
    });
    expect(plaidService.fetchAccountsFromPlaid).not.toHaveBeenCalled();
  });

  test('retains disconnected accounts when another Item syncs successfully', async () => {
    itemService.getUserItems.mockResolvedValue([
      { itemId: 'old-item', status: 'disconnected', disconnectedAt: 123 },
      { _id: 'item-db-2', itemId: 'new-item' }
    ]);
    const connectedAccount = { _id: 'active-db', account_id: 'active', itemId: 'new-item' };
    plaidService.fetchAccountsFromPlaid.mockResolvedValue([connectedAccount]);
    plaidAccounts.findAll
      .mockResolvedValueOnce([archivedAccount])
      .mockResolvedValueOnce([archivedAccount, connectedAccount]);
    plaidGroups.findAll
      .mockResolvedValueOnce([archivedGroup])
      .mockResolvedValueOnce([archivedGroup]);
    plaidAccounts.save.mockResolvedValue(connectedAccount);
    plaidGroups.save.mockResolvedValue({ _id: 'active-group' });

    const result = await accountService.syncAccountsAndGroups(user);
    expect(result.accounts).toEqual([archivedAccount, connectedAccount]);
    expect(result.groups).toContainEqual(archivedGroup);
    expect(plaidService.fetchAccountsFromPlaid).toHaveBeenCalledTimes(1);
  });

  test('serves local account data if active Plaid access fails', async () => {
    itemService.getUserItems.mockResolvedValue([
      { _id: 'item-db-2', itemId: 'new-item' }
    ]);
    plaidService.fetchAccountsFromPlaid.mockRejectedValue(new Error('network down'));
    const result = await accountService.syncAccountsAndGroups(user);
    expect(result.accounts).toEqual([archivedAccount]);
    expect(result.groups).toEqual([archivedGroup]);
  });
});
