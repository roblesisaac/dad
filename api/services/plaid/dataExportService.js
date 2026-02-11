import plaidItems from '../../models/plaidItems.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import plaidAccounts from '../../models/plaidAccounts.js';
import plaidGroups from '../../models/plaidGroups.js';
import syncSessions from '../../models/syncSession.js';
import scrub from '../../utils/scrub.js';

const DEFAULT_BATCH_SIZE = 500;
const MAX_BATCH_SIZE = 1000;
const COMPLETE_CURSOR = '__complete__';

class PlaidDataExportService {
  normalizeBatchSize(batchSize) {
    const parsed = Number.parseInt(batchSize, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return DEFAULT_BATCH_SIZE;
    }

    return Math.min(parsed, MAX_BATCH_SIZE);
  }

  async fetchBatch(model, filter, start, batchSize) {
    if (!model || !filter) {
      return {
        items: [],
        nextStart: COMPLETE_CURSOR
      };
    }

    if (start === COMPLETE_CURSOR) {
      return {
        items: [],
        nextStart: COMPLETE_CURSOR
      };
    }

    const options = { limit: batchSize };

    if (start) {
      options.start = start;
    }

    const response = await model.find(filter, options);
    const items = Array.isArray(response?.items) ? response.items.filter(Boolean) : [];

    return {
      items,
      nextStart: response?.lastKey || COMPLETE_CURSOR
    };
  }

  normalizeIncludes(includes = {}) {
    const defaults = {
      items: true,
      transactions: true,
      accounts: true,
      accountGroups: true,
      syncSessions: true
    };

    if (!includes || Object.keys(includes).length === 0) {
      return defaults;
    }

    return {
      items: includes.items === undefined ? defaults.items : Boolean(includes.items),
      transactions: includes.transactions === undefined ? defaults.transactions : Boolean(includes.transactions),
      accounts: includes.accounts === undefined ? defaults.accounts : Boolean(includes.accounts),
      accountGroups: includes.accountGroups === undefined ? defaults.accountGroups : Boolean(includes.accountGroups),
      syncSessions: includes.syncSessions === undefined ? defaults.syncSessions : Boolean(includes.syncSessions)
    };
  }

  async getUserPlaidDataBatch(userId, options = {}) {
    if (!userId) {
      throw new Error('INVALID_USER: User ID is required');
    }

    try {
      const batchSize = this.normalizeBatchSize(options.batchSize);
      const cursors = options.cursors || {};
      const includes = this.normalizeIncludes(options.includes);
      const safeUserId = String(userId).replaceAll(':', '-');
      const [itemsBatch, transactionsBatch, accountsBatch, accountGroupsBatch, syncSessionsBatch] = await Promise.all([
        includes.items
          ? this.fetchBatch(plaidItems, `plaiditems-${safeUserId}:*`, cursors.itemsStart, batchSize)
          : Promise.resolve({ items: [], nextStart: COMPLETE_CURSOR }),
        includes.transactions
          ? this.fetchBatch(plaidTransactions, `plaidtransactions-${safeUserId}:*`, cursors.transactionsStart, batchSize)
          : Promise.resolve({ items: [], nextStart: COMPLETE_CURSOR }),
        includes.accounts
          ? this.fetchBatch(plaidAccounts, `plaidaccounts-${safeUserId}:*`, cursors.accountsStart, batchSize)
          : Promise.resolve({ items: [], nextStart: COMPLETE_CURSOR }),
        includes.accountGroups
          ? this.fetchBatch(plaidGroups, `plaidgroups-${safeUserId}:*`, cursors.accountGroupsStart, batchSize)
          : Promise.resolve({ items: [], nextStart: COMPLETE_CURSOR }),
        includes.syncSessions
          ? this.fetchBatch(syncSessions, `syncsession-${safeUserId}:*`, cursors.syncSessionsStart, batchSize)
          : Promise.resolve({ items: [], nextStart: COMPLETE_CURSOR })
      ]);

      const safeItems = itemsBatch.items;
      const safeTransactions = transactionsBatch.items;
      const safeAccounts = accountsBatch.items;
      const safeAccountGroups = accountGroupsBatch.items;
      const safeSyncSessions = syncSessionsBatch.items;
      const sanitizedItems = scrub(safeItems, 'accessToken');

      const next = {
        itemsStart: itemsBatch.nextStart,
        transactionsStart: transactionsBatch.nextStart,
        accountsStart: accountsBatch.nextStart,
        accountGroupsStart: accountGroupsBatch.nextStart,
        syncSessionsStart: syncSessionsBatch.nextStart
      };

      const hasMoreBatches = Object.values(next).some(cursor => cursor !== COMPLETE_CURSOR);

      return {
        generatedAt: new Date().toISOString(),
        userId,
        batchSize,
        includes,
        counts: {
          items: sanitizedItems.length,
          transactions: safeTransactions.length,
          accounts: safeAccounts.length,
          accountGroups: safeAccountGroups.length,
          syncSessions: safeSyncSessions.length
        },
        items: sanitizedItems,
        transactions: safeTransactions,
        accounts: safeAccounts,
        accountGroups: safeAccountGroups,
        syncSessions: safeSyncSessions,
        pagination: {
          ...next,
          hasMore: hasMoreBatches
        }
      };
    } catch (error) {
      throw new Error(`DATA_EXPORT_ERROR: ${error.message}`);
    }
  }
}

export default new PlaidDataExportService();
