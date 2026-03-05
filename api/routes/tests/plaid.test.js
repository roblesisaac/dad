import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const member = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  };

  return {
    member,
    protect: {
      route: vi.fn(() => vi.fn(() => member))
    },
    linkController: {
      createLink: vi.fn(),
      exchangeTokenAndSavePlaidItem: vi.fn()
    },
    itemController: {
      getUserItems: vi.fn(),
      deleteItemAndRelatedData: vi.fn(),
      updateItem: vi.fn(),
      encryptItemAccessToken: vi.fn(),
      resetItemCursor: vi.fn(),
      downloadAllData: vi.fn(),
      deleteSelectedData: vi.fn(),
      syncItems: vi.fn(),
      syncAccountsAndGroups: vi.fn()
    },
    transactionController: {
      searchTransactions: vi.fn(),
      getTransactions: vi.fn(),
      syncLatestTransactionsForItem: vi.fn(),
      getSyncSessionsForItem: vi.fn(),
      revertToSyncSession: vi.fn()
    }
  };
});

vi.mock('../../middlewares/protect.js', () => ({
  default: mocks.protect
}));

vi.mock('../../controllers/plaid/linkController.js', () => ({
  default: mocks.linkController
}));

vi.mock('../../controllers/plaid/itemController.js', () => ({
  default: mocks.itemController
}));

vi.mock('../../controllers/plaid/transactionController.js', () => ({
  default: mocks.transactionController
}));

import plaidRoutes from '../plaid.js';

describe('plaid routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('registers sync accounts-and-groups route with conditional cache bypass', () => {
    const api = {};
    plaidRoutes(api, '/api');

    expect(mocks.protect.route).toHaveBeenCalledWith(api, 'plaiditems', '/api');

    const accountsSyncCall = mocks.member.get.mock.calls.find(
      ([path]) => path === '/plaid/sync/accounts/and/groups'
    );

    expect(accountsSyncCall).toBeDefined();
    expect(accountsSyncCall).toHaveLength(3);

    const [, disableConditionalCaching, controllerHandler] = accountsSyncCall;
    expect(typeof disableConditionalCaching).toBe('function');
    expect(controllerHandler).toBe(mocks.itemController.syncAccountsAndGroups);

    const req = {
      headers: {
        'if-none-match': 'W/"abc123"',
        'if-modified-since': 'Thu, 01 Jan 1970 00:00:00 GMT'
      }
    };
    const res = { set: vi.fn() };
    const next = vi.fn();

    disableConditionalCaching(req, res, next);

    expect(req.headers['if-none-match']).toBeUndefined();
    expect(req.headers['if-modified-since']).toBeUndefined();
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
