import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../models/plaidItems.js', () => ({
  default: {
    erase: vi.fn()
  }
}));

vi.mock('../../../models/plaidAccounts.js', () => ({
  default: {
    find: vi.fn(),
    erase: vi.fn()
  }
}));

vi.mock('../../../models/plaidTransactions.js', () => ({
  default: {
    find: vi.fn(),
    erase: vi.fn()
  }
}));

vi.mock('../../../models/plaidGroups.js', () => ({
  default: {
    find: vi.fn(),
    erase: vi.fn(),
    update: vi.fn()
  }
}));

vi.mock('../../../models/syncSession.js', () => ({
  default: {
    find: vi.fn(),
    erase: vi.fn()
  }
}));

vi.mock('../../../models/transactionCustomizations.js', () => ({
  default: {
    find: vi.fn(),
    erase: vi.fn()
  }
}));

vi.mock('../itemService.js', () => ({
  default: {
    getItem: vi.fn(),
    decryptAccessToken: vi.fn()
  }
}));

vi.mock('../plaidService.js', () => ({
  default: {
    removeItem: vi.fn()
  }
}));

import plaidItems from '../../../models/plaidItems.js';
import plaidAccounts from '../../../models/plaidAccounts.js';
import plaidTransactions from '../../../models/plaidTransactions.js';
import plaidGroups from '../../../models/plaidGroups.js';
import syncSessions from '../../../models/syncSession.js';
import transactionCustomizations from '../../../models/transactionCustomizations.js';
import itemService from '../itemService.js';
import plaidService from '../plaidService.js';
import itemDeletionService from '../itemDeletionService.js';

describe('itemDeletionService.deleteItemAndRelatedData', () => {
  const user = {
    _id: 'user:1',
    encryptedKey: 'encrypted-key'
  };

  beforeEach(() => {
    vi.clearAllMocks();

    itemService.getItem.mockResolvedValue({
      _id: 'plaiditems-user-1:item-1',
      itemId: 'item-1',
      accessToken: 'encrypted-access-token'
    });
    itemService.decryptAccessToken.mockReturnValue('plaid-access-token');
    plaidService.removeItem.mockResolvedValue({ removed: true });

    plaidItems.erase.mockResolvedValue({ removed: true });

    plaidTransactions.find.mockResolvedValue({ items: [], lastKey: null });
    plaidTransactions.erase.mockResolvedValue({ removed: true });

    syncSessions.find.mockResolvedValue({ items: [], lastKey: null });
    syncSessions.erase.mockResolvedValue({ removed: true });

    plaidAccounts.find.mockResolvedValue({ items: [], lastKey: null });
    plaidAccounts.erase.mockResolvedValue({ removed: true });

    plaidGroups.find.mockResolvedValue({ items: [], lastKey: null });
    plaidGroups.erase.mockResolvedValue({ removed: true });
    plaidGroups.update.mockResolvedValue({ _id: 'updated-group' });

    transactionCustomizations.find.mockResolvedValue({ items: [], lastKey: null });
    transactionCustomizations.erase.mockResolvedValue({ removed: true });
  });

  test('deletes item and all related records, updating and deleting affected groups', async () => {
    plaidTransactions.find.mockResolvedValue({
      items: [
        { _id: 'tx-1', itemId: 'item-1', transaction_id: 'transaction-1' },
        { _id: 'tx-2', itemId: 'item-2', transaction_id: 'transaction-2' }
      ],
      lastKey: null
    });

    syncSessions.find.mockResolvedValue({
      items: [
        { _id: 'ss-1', itemId: 'item-1' },
        { _id: 'ss-2', itemId: 'item-2' }
      ],
      lastKey: null
    });

    plaidAccounts.find.mockResolvedValue({
      items: [
        { _id: 'acct-1', itemId: 'item-1', account_id: 'account-1' },
        { _id: 'acct-2', itemId: 'item-2', account_id: 'account-2' }
      ],
      lastKey: null
    });

    plaidGroups.find.mockResolvedValue({
      items: [
        {
          _id: 'group-1',
          accounts: [
            { account_id: 'account-1', current: 100, available: 80 },
            { account_id: 'account-2', current: 50, available: 50 }
          ]
        },
        {
          _id: 'group-2',
          accounts: [{ account_id: 'account-1', current: 10, available: 5 }]
        }
      ],
      lastKey: null
    });

    transactionCustomizations.find.mockResolvedValue({
      items: [
        {
          _id: 'custom-1',
          transaction_item_id: 'tx-1',
          transaction_id: 'transaction-1',
          account_id: 'account-1'
        },
        {
          _id: 'custom-2',
          account_id: 'account-1'
        },
        {
          _id: 'custom-3',
          account_id: 'account-2',
          transaction_id: 'transaction-2'
        }
      ],
      lastKey: null
    });

    const result = await itemDeletionService.deleteItemAndRelatedData({
      itemId: 'item-1',
      user,
      revokeAtPlaid: true
    });

    expect(result.deleted).toBe(true);
    expect(result.counts).toEqual({
      items: 1,
      accounts: 1,
      transactions: 1,
      syncSessions: 1,
      groupsUpdated: 1,
      groupsDeleted: 1,
      customizations: 2
    });
    expect(result.plaidRevoke).toEqual({
      attempted: true,
      succeeded: true,
      error: null
    });
    expect(result.warnings).toEqual([]);

    expect(plaidService.removeItem).toHaveBeenCalledWith('plaid-access-token');
    expect(plaidTransactions.erase).toHaveBeenCalledWith('tx-1');
    expect(syncSessions.erase).toHaveBeenCalledWith('ss-1');
    expect(plaidAccounts.erase).toHaveBeenCalledWith('acct-1');
    expect(transactionCustomizations.erase).toHaveBeenCalledTimes(2);
    expect(plaidGroups.update).toHaveBeenCalledWith('group-1', {
      accounts: [{ account_id: 'account-2', current: 50, available: 50 }],
      totalCurrentBalance: 50,
      totalAvailableBalance: 50
    });
    expect(plaidGroups.erase).toHaveBeenCalledWith('group-2');
    expect(plaidItems.erase).toHaveBeenCalledWith('plaiditems-user-1:item-1');
  });

  test('continues local deletion when Plaid revoke fails', async () => {
    plaidService.removeItem.mockRejectedValue(new Error('Revoke failed'));

    const result = await itemDeletionService.deleteItemAndRelatedData({
      itemId: 'item-1',
      user,
      revokeAtPlaid: true
    });

    expect(result.deleted).toBe(true);
    expect(result.counts.items).toBe(1);
    expect(result.plaidRevoke.attempted).toBe(true);
    expect(result.plaidRevoke.succeeded).toBe(false);
    expect(result.plaidRevoke.error).toBe('Revoke failed');
    expect(result.warnings[0]).toContain('Plaid item revoke failed');
    expect(plaidItems.erase).toHaveBeenCalledWith('plaiditems-user-1:item-1');
  });

  test('returns idempotent response when item is already missing', async () => {
    itemService.getItem.mockResolvedValue(null);

    const result = await itemDeletionService.deleteItemAndRelatedData({
      itemId: 'item-1',
      user
    });

    expect(result).toEqual({
      deleted: false,
      reason: 'not_found',
      itemId: 'item-1',
      counts: {
        items: 0,
        accounts: 0,
        transactions: 0,
        syncSessions: 0,
        groupsUpdated: 0,
        groupsDeleted: 0,
        customizations: 0
      },
      plaidRevoke: {
        attempted: false,
        succeeded: false,
        error: null
      },
      warnings: []
    });

    expect(plaidService.removeItem).not.toHaveBeenCalled();
    expect(plaidItems.erase).not.toHaveBeenCalled();
  });
});
