import plaidItems from '../../models/plaidItems.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import plaidAccounts from '../../models/plaidAccounts.js';
import plaidGroups from '../../models/plaidGroups.js';
import syncSessions from '../../models/syncSession.js';

const DEFAULT_BATCH_SIZE = 250;
const MAX_BATCH_SIZE = 1000;
const ERASE_CONCURRENCY = 25;

class PlaidDataDeletionService {
  normalizeBatchSize(batchSize) {
    const parsed = Number.parseInt(batchSize, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return DEFAULT_BATCH_SIZE;
    }

    return Math.min(parsed, MAX_BATCH_SIZE);
  }

  normalizeIncludes(includes = {}) {
    const defaults = {
      items: false,
      transactions: false,
      accounts: false,
      accountGroups: false,
      syncSessions: false
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

  validateSelection(includes) {
    const hasSelection = Object.values(includes).some(Boolean);

    if (!hasSelection) {
      throw new Error('INVALID_SELECTION: Select at least one data type to delete');
    }
  }

  async eraseIdsInChunks(model, ids) {
    let deletedCount = 0;
    const failedIds = [];

    for (let i = 0; i < ids.length; i += ERASE_CONCURRENCY) {
      const chunk = ids.slice(i, i + ERASE_CONCURRENCY);
      const results = await Promise.allSettled(chunk.map(id => model.erase(id)));

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value?.removed) {
          deletedCount++;
        } else {
          failedIds.push(chunk[index]);
        }
      });
    }

    return { deletedCount, failedIds };
  }

  async deleteBatch(model, filter, batchSize) {
    if (!model || !filter) {
      return {
        deletedCount: 0,
        selectedCount: 0,
        hasMore: false,
        failedIds: []
      };
    }

    const response = await model.find(filter, { limit: batchSize });
    const items = Array.isArray(response?.items) ? response.items.filter(Boolean) : [];
    const ids = items.map(item => item._id).filter(Boolean);

    if (!ids.length) {
      return {
        deletedCount: 0,
        selectedCount: 0,
        hasMore: false,
        failedIds: []
      };
    }

    const { deletedCount, failedIds } = await this.eraseIdsInChunks(model, ids);

    return {
      deletedCount,
      selectedCount: ids.length,
      hasMore: Boolean(response?.lastKey),
      failedIds: failedIds.slice(0, 10)
    };
  }

  async deleteUserPlaidDataBatch(userId, options = {}) {
    if (!userId) {
      throw new Error('INVALID_USER: User ID is required');
    }

    const batchSize = this.normalizeBatchSize(options.batchSize);
    const includes = this.normalizeIncludes(options.includes);
    this.validateSelection(includes);

    try {
      const safeUserId = String(userId).replaceAll(':', '-');

      const [itemsResult, transactionsResult, accountsResult, accountGroupsResult, syncSessionsResult] = await Promise.all([
        includes.items
          ? this.deleteBatch(plaidItems, `plaiditems-${safeUserId}:*`, batchSize)
          : Promise.resolve({ deletedCount: 0, selectedCount: 0, hasMore: false, failedIds: [] }),
        includes.transactions
          ? this.deleteBatch(plaidTransactions, `plaidtransactions-${safeUserId}:*`, batchSize)
          : Promise.resolve({ deletedCount: 0, selectedCount: 0, hasMore: false, failedIds: [] }),
        includes.accounts
          ? this.deleteBatch(plaidAccounts, `plaidaccounts-${safeUserId}:*`, batchSize)
          : Promise.resolve({ deletedCount: 0, selectedCount: 0, hasMore: false, failedIds: [] }),
        includes.accountGroups
          ? this.deleteBatch(plaidGroups, `plaidgroups-${safeUserId}:*`, batchSize)
          : Promise.resolve({ deletedCount: 0, selectedCount: 0, hasMore: false, failedIds: [] }),
        includes.syncSessions
          ? this.deleteBatch(syncSessions, `syncsession-${safeUserId}:*`, batchSize)
          : Promise.resolve({ deletedCount: 0, selectedCount: 0, hasMore: false, failedIds: [] })
      ]);

      const hasMore = [
        itemsResult.hasMore,
        transactionsResult.hasMore,
        accountsResult.hasMore,
        accountGroupsResult.hasMore,
        syncSessionsResult.hasMore
      ].some(Boolean);

      return {
        generatedAt: new Date().toISOString(),
        userId,
        batchSize,
        includes,
        deleted: {
          items: itemsResult.deletedCount,
          transactions: transactionsResult.deletedCount,
          accounts: accountsResult.deletedCount,
          accountGroups: accountGroupsResult.deletedCount,
          syncSessions: syncSessionsResult.deletedCount
        },
        selected: {
          items: itemsResult.selectedCount,
          transactions: transactionsResult.selectedCount,
          accounts: accountsResult.selectedCount,
          accountGroups: accountGroupsResult.selectedCount,
          syncSessions: syncSessionsResult.selectedCount
        },
        failed: {
          items: itemsResult.failedIds,
          transactions: transactionsResult.failedIds,
          accounts: accountsResult.failedIds,
          accountGroups: accountGroupsResult.failedIds,
          syncSessions: syncSessionsResult.failedIds
        },
        hasMore
      };
    } catch (error) {
      throw new Error(`DATA_DELETE_ERROR: ${error.message}`);
    }
  }
}

export default new PlaidDataDeletionService();
