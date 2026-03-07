import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../models/plaidTransactions.js', () => ({
  default: {
    findAll: vi.fn(),
    find: vi.fn()
  }
}));

import plaidTransactions from '../../../models/plaidTransactions.js';
import transactionQueryService from '../transactionsCrudService.js';

describe('transactionQueryService.fetchTransactions', () => {
  const user = { _id: 'user:1' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('fetches user-wide date range via date label when account_id is omitted', async () => {
    plaidTransactions.findAll.mockResolvedValue([
      { _id: 'tx-1', transaction_id: 't-1', authorized_date: '2025-03-02' },
      { _id: 'tx-2', transaction_id: 't-2', authorized_date: '2025-03-21' }
    ]);

    const transactions = await transactionQueryService.fetchTransactions(user, {
      date: '2025-03-01_2025-03-31'
    });

    expect(transactions.map(item => item.transaction_id).sort()).toEqual(['t-1', 't-2']);
    expect(plaidTransactions.findAll).toHaveBeenCalledTimes(1);
    expect(plaidTransactions.findAll).toHaveBeenCalledWith(
      { userId: 'user:1', date: '2025-03*' },
      { limit: 250 }
    );
  });

  test('keeps account scoped month range strategy when account_id is present', async () => {
    plaidTransactions.findAll.mockResolvedValue([
      { _id: 'tx-10', transaction_id: 't-10', authorized_date: '2025-03-04' }
    ]);

    const transactions = await transactionQueryService.fetchTransactions(user, {
      account_id: 'acc-123',
      date: '2025-03-01_2025-03-31'
    });

    expect(transactions.map(item => item.transaction_id)).toEqual(['t-10']);
    expect(plaidTransactions.findAll).toHaveBeenCalledTimes(1);
    expect(plaidTransactions.findAll).toHaveBeenCalledWith(
      { userId: 'user:1', accountdate: 'acc-123:2025-03*' },
      { limit: 250 }
    );
  });
});
