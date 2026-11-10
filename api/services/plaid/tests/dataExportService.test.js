import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  items: { find: vi.fn() },
  transactions: { find: vi.fn() },
  accounts: { find: vi.fn() },
  groups: { find: vi.fn() },
  sessions: { find: vi.fn() },
  customizations: { find: vi.fn() },
  tabs: { find: vi.fn() },
  rules: { find: vi.fn() },
  reports: { find: vi.fn() }
}));

vi.mock('../../../models/plaidItems.js', () => ({ default: mocks.items }));
vi.mock('../../../models/plaidTransactions.js', () => ({ default: mocks.transactions }));
vi.mock('../../../models/plaidAccounts.js', () => ({ default: mocks.accounts }));
vi.mock('../../../models/plaidGroups.js', () => ({ default: mocks.groups }));
vi.mock('../../../models/syncSession.js', () => ({ default: mocks.sessions }));
vi.mock('../../../models/transactionCustomizations.js', () => ({ default: mocks.customizations }));
vi.mock('../../../models/tabs.js', () => ({ default: mocks.tabs }));
vi.mock('../../../models/rules.js', () => ({ default: mocks.rules }));
vi.mock('../../../models/reports.js', () => ({ default: mocks.reports }));
vi.mock('../../../utils/scrub.js', () => ({
  default: (value, key) => value.map(record => {
    const clone = { ...record };
    delete clone[key];
    return clone;
  })
}));

import dataExportService from '../dataExportService.js';

describe('dataExportService.getUserPlaidDataBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const model of Object.values(mocks)) {
      model.find.mockResolvedValue({ items: [], lastKey: null });
    }
  });

  test('exports every finance-owned collection only for the signed-in user', async () => {
    const includes = {
      items: true, transactions: true, accounts: true, accountGroups: true,
      syncSessions: true, transactionCustomizations: true,
      tabs: true, rules: true, reports: true
    };
    mocks.items.find.mockResolvedValue({
      items: [{ itemId: 'item-1', accessToken: 'SECRET' }], lastKey: null
    });
    mocks.tabs.find.mockResolvedValue({
      items: [{ _id: 'tab-1', name: 'Budget' }], lastKey: null
    });

    const result = await dataExportService.getUserPlaidDataBatch('user:one', { includes });

    expect(Object.keys(result.counts)).toHaveLength(9);
    expect(result.counts.items).toBe(1);
    expect(result.counts.tabs).toBe(1);
    expect(result.items[0]).not.toHaveProperty('accessToken');
    expect(result.tabs[0].name).toBe('Budget');
    expect(result.pagination.hasMore).toBe(false);
    expect(mocks.items.find).toHaveBeenCalledWith(
      'plaiditems-user-one:*', { limit: 500 }
    );
    expect(mocks.customizations.find).toHaveBeenCalledWith(
      'tcustomizations-user-one:*', { limit: 500 }
    );
    expect(mocks.reports.find).toHaveBeenCalledWith(
      'reports-user-one:*', { limit: 500 }
    );
  });

  test('paginates new collections and does not refetch completed ones', async () => {
    const includes = {
      items: false, transactions: false, accounts: false,
      accountGroups: false, syncSessions: false,
      transactionCustomizations: false, tabs: true, rules: false, reports: false
    };
    mocks.tabs.find
      .mockResolvedValueOnce({ items: [{ _id: 'tab-1' }], lastKey: 'cursor-1' })
      .mockResolvedValueOnce({ items: [{ _id: 'tab-2' }], lastKey: null });

    const first = await dataExportService.getUserPlaidDataBatch('user:two', { includes });
    expect(first.pagination.tabsStart).toBe('cursor-1');
    expect(first.pagination.hasMore).toBe(true);

    const second = await dataExportService.getUserPlaidDataBatch('user:two', {
      includes, cursors: { tabsStart: first.pagination.tabsStart }
    });
    expect(second.tabs[0]._id).toBe('tab-2');
    expect(second.pagination.hasMore).toBe(false);
    expect(mocks.tabs.find).toHaveBeenNthCalledWith(2,
      'tabs-user-two:*', { limit: 500, start: 'cursor-1' }
    );
    expect(mocks.items.find).not.toHaveBeenCalled();
  });

  test('serializes and restores object-based pagination cursors', async () => {
    const includes = {
      items: false, transactions: false, accounts: false, accountGroups: false,
      syncSessions: false, transactionCustomizations: false,
      tabs: true, rules: false, reports: false
    };
    const cursorObject = { lastEvaluatedKey: 'tab-1' };
    mocks.tabs.find
      .mockResolvedValueOnce({ items: [{ _id: 'tab-1' }], lastKey: cursorObject })
      .mockResolvedValueOnce({ items: [{ _id: 'tab-2' }], lastKey: null });

    const first = await dataExportService.getUserPlaidDataBatch('user:one', { includes });
    expect(first.pagination.tabsStart).toMatch(/^__json_cursor__/);

    const second = await dataExportService.getUserPlaidDataBatch('user:one', {
      includes, cursors: { tabsStart: first.pagination.tabsStart }
    });
    expect(second.pagination.hasMore).toBe(false);
    expect(mocks.tabs.find).toHaveBeenNthCalledWith(
      2, 'tabs-user-one:*', { limit: 500, start: cursorObject }
    );
  });
});
