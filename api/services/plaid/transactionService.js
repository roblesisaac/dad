import PlaidBaseService from './baseService.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import plaidItems from '../../models/plaidItems.js';
import { linkService } from './index.js';
import { plaidClientInstance } from './plaidClientConfig.js';
import { itemService } from './index.js';
import notify from '../../utils/notify.js';

class PlaidTransactionService extends PlaidBaseService {
  async syncTransactionsForItem(item, userId, encryptedKey) {
    if (!userId || !encryptedKey) {
      throw new Error('INVALID_USER: Missing required user data');
    }

    try {
      if (typeof item === 'string') {
        item = await plaidItems.findOne(item);
        if (!item) {
          throw new Error('ITEM_NOT_FOUND: Invalid item ID');
        }
      }

      const { accessToken, syncData } = item;
      
      if (['in_progress'].includes(syncData.status)) {
        return { 
          error: 'SYNC_IN_PROGRESS',
          message: 'Sync already in progress for this item',
          itemId: item._id 
        };
      }

      const nextSyncData = {
        status: 'in_progress',
        lastSyncTime: new Date().toISOString(),
        result: {}
      };

      await itemService.updateItemSyncStatus(item._id, nextSyncData);

      try {
        const access_token = linkService.decryptAccessToken(accessToken, encryptedKey);
        const transactions = await this.fetchTransactionsFromPlaid(access_token, syncData.cursor);

        await this.processAndSaveTransactions(transactions, userId, item._id);

        const completedSyncData = {
          status: 'completed',
          lastSyncTime: nextSyncData.lastSyncTime,
          cursor: transactions.next_cursor,
          result: {
            added: transactions.added?.length || 0,
            modified: transactions.modified?.length || 0,
            removed: transactions.removed?.length || 0
          }
        };

        await itemService.updateItemSyncStatus(item._id, completedSyncData);
        return completedSyncData;

      } catch (error) {
        const failedSyncData = {
          status: 'failed',
          lastSyncTime: nextSyncData.lastSyncTime,
          result: {
            error: error.error_code || 'SYNC_ERROR',
            message: error.error_message || error.message
          }
        };

        await itemService.updateItemSyncStatus(item._id, failedSyncData);
        throw error;
      }
    } catch (error) {
      console.error('Error in syncTransactionsForItem:', error);
      throw error.error_code ? error : new Error(`SYNC_ERROR: ${error.message}`);
    }
  }

  async syncAllUserTransactions(user) {
    this.validateUser(user);

    try {
      const items = await itemService.getItems(user._id);
      if (!items?.length) {
        throw new Error('NO_ITEMS: No items found for user');
      }

      const syncResults = [];
      for (const item of items) {
        try {
          const result = await this.syncTransactionsForItem(item, user._id, user.encryptionKey);
          syncResults.push({ itemId: item._id, ...result });
        } catch (error) {
          console.error(`Error syncing transactions for item ${item._id}:`, error);
          syncResults.push({
            itemId: item._id,
            error: error.error_code || 'SYNC_ERROR',
            message: error.message
          });
        }
      }

      return { syncResults };
    } catch (error) {
      throw new Error(`SYNC_ERROR: ${error.message}`);
    }
  }

  async fetchTransactionsFromPlaid(access_token, cursor = null, startDate = null) {
    try {
      const request = {
        access_token,
        cursor,
        options: {
          include_personal_finance_category: true
        }
      };

      if (startDate) {
        request.start_date = startDate;
      }

      return await this.handleResponse(
        this.client.transactionsSync(request)
      );
    } catch (error) {
      throw new Error(`PLAID_API_ERROR: ${error.message}`);
    }
  }

  async processAndSaveTransactions(transactions, userId, itemId) {
    const { added, modified, removed } = transactions;

    try {
      // Handle removed transactions
      if (removed?.length) {
        await plaidTransactions.deleteMany({ 
          transaction_id: { $in: removed.map(t => t.transaction_id) }
        });
      }

      // Handle modified transactions
      if (modified?.length) {
        for (const transaction of modified) {
          await plaidTransactions.update(
            { transaction_id: transaction.transaction_id },
            { ...transaction, userId, itemId }
          );
        }
      }

      // Handle new transactions
      if (added?.length) {
        await plaidTransactions.insertMany(
          added.map(transaction => ({ ...transaction, userId, itemId }))
        );
      }

      return {
        added: added?.length || 0,
        modified: modified?.length || 0,
        removed: removed?.length || 0
      };
    } catch (error) {
      throw new Error(`DB_ERROR: Error processing transactions - ${error.message}`);
    }
  }

  async fetchTransactions(query) {
    try {
      return await plaidTransactions.find(query);
    } catch (error) {
      throw new Error(`FETCH_ERROR: ${error.message}`);
    }
  }

  async fetchTransactionById(transactionId, userId) {
    try {
      const transaction = await plaidTransactions.findOne({ 
        transaction_id: transactionId,
        userId 
      });
      
      if (!transaction) {
        throw new Error('TRANSACTION_NOT_FOUND: Transaction not found');
      }
      
      return transaction;
    } catch (error) {
      throw new Error(`FETCH_ERROR: ${error.message}`);
    }
  }

  async getAllTransactionCount(userId) {
    try {
      return await plaidTransactions.count({ userId });
    } catch (error) {
      throw new Error(`COUNT_ERROR: ${error.message}`);
    }
  }

  buildUserQueryForTransactions(userId, queryParams) {
    const query = { userId };

    if (queryParams.account_id) {
      query.account_id = queryParams.account_id;
    }

    if (queryParams.date) {
      const [startDate, endDate] = queryParams.date.split(',');
      query.authorized_date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    return query;
  }

  async findDuplicates(userId) {
    try {
      const transactions = await this.fetchTransactions({ userId });
      const duplicates = new Map();

      transactions.forEach(transaction => {
        const key = `${transaction.amount}-${transaction.date}-${transaction.name}`;
        if (!duplicates.has(key)) {
          duplicates.set(key, []);
        }
        duplicates.get(key).push(transaction);
      });

      return Array.from(duplicates.values())
        .filter(group => group.length > 1);
    } catch (error) {
      throw new Error(`DUPLICATE_CHECK_ERROR: ${error.message}`);
    }
  }

  async removeFromDb(transactionIds) {
    try {
      await plaidTransactions.deleteMany({ 
        transaction_id: { $in: transactionIds }
      });
      return { removed: transactionIds.length };
    } catch (error) {
      throw new Error(`DELETE_ERROR: ${error.message}`);
    }
  }

  async removeAllTransactionsFromDatabase(user) {
    this.validateUser(user);

    try {
      const result = await plaidTransactions.deleteMany({ userId: user._id });
      
      // Notify user of completion
      await notify.send(user.email, {
        subject: 'Transactions Removed',
        message: `All your transactions have been removed successfully. ${result.deletedCount} transactions were deleted.`
      });

      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      // Notify user of failure
      await notify.send(user.email, {
        subject: 'Transaction Removal Failed',
        message: 'There was an error removing your transactions. Please try again or contact support if the problem persists.'
      });

      throw new Error(`DELETE_ALL_ERROR: ${error.message}`);
    }
  }
}

export default new PlaidTransactionService(plaidClientInstance); 