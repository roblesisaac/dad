import plaidItems from '../../models/plaidItems.js';
import plaidAccounts from '../../models/plaidAccounts.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import plaidGroups from '../../models/plaidGroups.js';
import syncSessions from '../../models/syncSession.js';
import transactionCustomizations from '../../models/transactionCustomizations.js';
import itemService from './itemService.js';
import plaidService from './plaidService.js';

const DEFAULT_BATCH_SIZE = 1000;
const MAX_BATCH_SIZE = 1000;
const ERASE_CONCURRENCY = 25;
const MAX_PAGINATION_REQUESTS = 10000;

class ItemDeletionService {
  normalizeBatchSize(batchSize) {
    const parsed = Number.parseInt(batchSize, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return DEFAULT_BATCH_SIZE;
    }

    return Math.min(parsed, MAX_BATCH_SIZE);
  }

  getSafeUserId(userId) {
    return String(userId).replaceAll(':', '-');
  }

  buildBaseResult(itemId) {
    return {
      deleted: true,
      itemId,
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
    };
  }

  getErrorMessage(error) {
    return error?.error_message || error?.message || 'Unknown error';
  }

  async scanUserCollection(model, collectionPrefix, userId, batchSize, matcher) {
    const safeUserId = this.getSafeUserId(userId);
    const filter = `${collectionPrefix}-${safeUserId}:*`;
    const matches = [];
    let start = null;
    let requests = 0;

    while (requests < MAX_PAGINATION_REQUESTS) {
      const options = { limit: batchSize };
      if (start) {
        options.start = start;
      }

      const response = await model.find(filter, options);
      const items = Array.isArray(response?.items) ? response.items.filter(Boolean) : [];

      for (const item of items) {
        if (!matcher || matcher(item)) {
          matches.push(item);
        }
      }

      start = response?.lastKey || null;
      requests++;

      if (!start) {
        break;
      }
    }

    if (requests >= MAX_PAGINATION_REQUESTS) {
      throw new Error(`Pagination exceeded safe limit for collection '${collectionPrefix}'`);
    }

    return matches;
  }

  async eraseIdsInChunks(model, ids = []) {
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

  async deleteMatchingRecords(model, collectionPrefix, userId, batchSize, matcher) {
    const records = await this.scanUserCollection(model, collectionPrefix, userId, batchSize, matcher);
    const ids = records.map(record => record?._id).filter(Boolean);

    if (!ids.length) {
      return { records, deletedCount: 0, failedIds: [] };
    }

    const { deletedCount, failedIds } = await this.eraseIdsInChunks(model, ids);
    return { records, deletedCount, failedIds };
  }

  sumGroupBalance(accounts = [], fieldName) {
    return accounts.reduce((total, account) => {
      const parsed = Number.parseFloat(account?.[fieldName]);
      return total + (Number.isNaN(parsed) ? 0 : parsed);
    }, 0);
  }

  async cleanupGroups(userId, batchSize, deletedAccountIdSet) {
    const result = {
      groupsUpdated: 0,
      groupsDeleted: 0,
      warnings: []
    };

    if (!deletedAccountIdSet || deletedAccountIdSet.size === 0) {
      return result;
    }

    const userGroups = await this.scanUserCollection(
      plaidGroups,
      'plaidgroups',
      userId,
      batchSize
    );

    for (const group of userGroups) {
      const existingAccounts = Array.isArray(group?.accounts) ? group.accounts : [];
      const filteredAccounts = existingAccounts.filter(account =>
        !deletedAccountIdSet.has(account?.account_id)
      );

      if (filteredAccounts.length === existingAccounts.length) {
        continue;
      }

      if (filteredAccounts.length === 0) {
        try {
          const erased = await plaidGroups.erase(group._id);
          if (erased?.removed) {
            result.groupsDeleted++;
          } else {
            result.warnings.push(`Failed to remove empty group '${group._id}'`);
          }
        } catch (error) {
          result.warnings.push(`Failed to remove empty group '${group._id}': ${this.getErrorMessage(error)}`);
        }

        continue;
      }

      try {
        await plaidGroups.update(group._id, {
          accounts: filteredAccounts,
          totalCurrentBalance: this.sumGroupBalance(filteredAccounts, 'current'),
          totalAvailableBalance: this.sumGroupBalance(filteredAccounts, 'available')
        });
        result.groupsUpdated++;
      } catch (error) {
        result.warnings.push(`Failed to update group '${group._id}': ${this.getErrorMessage(error)}`);
      }
    }

    return result;
  }

  async deleteItemAndRelatedData({
    itemId,
    user,
    revokeAtPlaid = true,
    batchSize
  }) {
    if (!itemId) {
      throw new Error('INVALID_PARAMS: Item ID is required');
    }

    if (!user?._id) {
      throw new Error('INVALID_USER: User ID is required');
    }

    const normalizedBatchSize = this.normalizeBatchSize(batchSize);
    const response = this.buildBaseResult(itemId);

    try {
      const item = await itemService.getItem(itemId, user._id);

      if (!item) {
        return {
          ...response,
          deleted: false,
          reason: 'not_found'
        };
      }

      if (revokeAtPlaid) {
        response.plaidRevoke.attempted = true;

        try {
          const accessToken = itemService.decryptAccessToken(item, user);
          await plaidService.removeItem(accessToken);
          response.plaidRevoke.succeeded = true;
        } catch (error) {
          const errorMessage = this.getErrorMessage(error);
          response.plaidRevoke.error = errorMessage;
          response.warnings.push(`Plaid item revoke failed: ${errorMessage}`);
        }
      }

      const transactionsResult = await this.deleteMatchingRecords(
        plaidTransactions,
        'plaidtransactions',
        user._id,
        normalizedBatchSize,
        record => record?.itemId === itemId
      );
      response.counts.transactions = transactionsResult.deletedCount;
      if (transactionsResult.failedIds.length > 0) {
        response.warnings.push(
          `Failed to delete ${transactionsResult.failedIds.length} transaction records`
        );
      }

      const deletedTransactionIdSet = new Set(
        transactionsResult.records.map(record => record?.transaction_id).filter(Boolean)
      );
      const deletedTransactionItemIdSet = new Set(
        transactionsResult.records.map(record => record?._id).filter(Boolean)
      );

      const syncSessionResult = await this.deleteMatchingRecords(
        syncSessions,
        'syncsession',
        user._id,
        normalizedBatchSize,
        record => record?.itemId === itemId
      );
      response.counts.syncSessions = syncSessionResult.deletedCount;
      if (syncSessionResult.failedIds.length > 0) {
        response.warnings.push(
          `Failed to delete ${syncSessionResult.failedIds.length} sync session records`
        );
      }

      const accountsResult = await this.deleteMatchingRecords(
        plaidAccounts,
        'plaidaccounts',
        user._id,
        normalizedBatchSize,
        record => record?.itemId === itemId
      );
      response.counts.accounts = accountsResult.deletedCount;
      if (accountsResult.failedIds.length > 0) {
        response.warnings.push(
          `Failed to delete ${accountsResult.failedIds.length} account records`
        );
      }

      const deletedAccountIdSet = new Set(
        accountsResult.records.map(record => record?.account_id).filter(Boolean)
      );

      const groupCleanupResult = await this.cleanupGroups(
        user._id,
        normalizedBatchSize,
        deletedAccountIdSet
      );
      response.counts.groupsUpdated = groupCleanupResult.groupsUpdated;
      response.counts.groupsDeleted = groupCleanupResult.groupsDeleted;
      response.warnings.push(...groupCleanupResult.warnings);

      const shouldDeleteCustomizations =
        deletedTransactionIdSet.size > 0 ||
        deletedTransactionItemIdSet.size > 0 ||
        deletedAccountIdSet.size > 0;

      if (shouldDeleteCustomizations) {
        const customizationsResult = await this.deleteMatchingRecords(
          transactionCustomizations,
          'tcustomizations',
          user._id,
          normalizedBatchSize,
          record =>
            deletedTransactionItemIdSet.has(record?.transaction_item_id) ||
            deletedTransactionIdSet.has(record?.transaction_id) ||
            deletedAccountIdSet.has(record?.account_id)
        );

        response.counts.customizations = customizationsResult.deletedCount;
        if (customizationsResult.failedIds.length > 0) {
          response.warnings.push(
            `Failed to delete ${customizationsResult.failedIds.length} transaction customization records`
          );
        }
      }

      const itemDeleted = await plaidItems.erase(item._id);
      if (!itemDeleted?.removed) {
        throw new Error('Failed to delete Plaid item');
      }

      response.counts.items = 1;
      return response;
    } catch (error) {
      throw new Error(`ITEM_DELETE_ERROR: ${this.getErrorMessage(error)}`);
    }
  }
}

export default new ItemDeletionService();
