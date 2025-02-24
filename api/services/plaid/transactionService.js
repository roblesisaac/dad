import PlaidBaseService from './baseService.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import { itemService, plaidService } from './index.js';
import { plaidClientInstance } from './plaidClientConfig.js';
import { CustomError } from './customError.js';

class PlaidTransactionService extends PlaidBaseService {
  /**
   * Synchronizes transactions for a single item.
   * @param {Object|string} item - Item or item ID to sync.
   * @param {Object} user - User data associated with the item.
   * @returns {Object} Sync response with status and results.
   */
  async syncTransactionsForItem(item, user) {
    if (!user) {
      throw new CustomError('INVALID_USER', 'Missing required user data');
    }

    try {
      // Get or validate item
      const validatedItem = await this._validateAndGetItem(item, user);
      
      // Check if sync already in progress
      if (this._isSyncInProgress(validatedItem)) {
        return this._createSyncResponse('IN_PROGRESS', validatedItem);
      }

      // Initialize sync
      const syncSession = await this._initializeSync(validatedItem, user);
      
      try {
        // Perform sync
        const result = await this._performSync(syncSession, validatedItem, user);
        
        // Complete sync
        const completedItem = await this._completeSync(validatedItem, result, user);

        console.log({
          completedItem,
          validatedItem: JSON.stringify(validatedItem, null, 2),
          result,
        })
        
        return this._createSyncResponse('COMPLETED', validatedItem, result);
      } catch (error) {
        await CustomError.handleServiceError(validatedItem, user, error, {
          cursor: syncSession.cursor,
          batchCount: 0,
          syncSession,
          operation: 'sync_transactions'
        }, this._updateSyncProgress);
        throw error;
      }
    } catch (error) {
      console.error('Error in syncTransactionsForItem:', error);
      throw CustomError.createFormattedError(error, { operation: 'sync_transactions' });
    }
  }

  /**
   * Synchronizes transactions for all user items.
   * @param {Object} user - User data.
   * @returns {Object} Sync results for all items.
   */
    async syncTransactionsForEachItem(user) {
      this.validateUser(user);
  
      try {
        const items = await itemService.getUserItems(user._id);
        if (!items?.length) {
          throw new CustomError('NO_ITEMS', 'No items found for user');
        }
  
        const syncResults = [];
        for (const item of items) {
          try {
            const result = await this.syncTransactionsForItem(item, user);
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
        throw new CustomError('SYNC_ERROR', error.message);
      }
    }

  /**
   * Validates and retrieves item data.
   * @param {Object|string} item - Item or item ID.
   * @param {Object} user - User data.
   * @returns {Object} Validated item data.
   */
  async _validateAndGetItem(item, user) {
    try {
      if (typeof item === 'string') {
        if (!user?._id) {
          throw new CustomError('INVALID_USER', 'User ID is required to fetch item');
        }
        const foundItem = await itemService.getUserItems(user._id, item);
        if (!foundItem) {
          throw new CustomError('ITEM_NOT_FOUND', 'Item not found for this user');
        }
        return foundItem;
      }

      if (!item?.accessToken || !item?._id || !item?.userId) {
        throw new CustomError('INVALID_ITEM', 'Missing required item data');
      }

      return item;
    } catch (error) {
      throw CustomError.createFormattedError(error, { 
        operation: 'validate_item'
      });
    }
  }

  /**
   * Checks if a sync is already in progress for the item.
   * @param {Object} item - Item data.
   * @returns {boolean} True if sync is in progress.
   */
  _isSyncInProgress(item) {
    return ['in_progress', 'queued'].includes(item.syncData?.status);
  }

  /**
   * Initializes a sync session for the item.
   * @param {Object} item - Item data.
   * @param {Object} user - User data.
   * @returns {Object} Sync session data.
   */
  async _initializeSync(item, user) {
    const syncData = {
      status: 'in_progress',
      lastSyncTime: Date.now(),
      nextSyncTime: Date.now() + (24 * 60 * 60 * 1000),
      cursor: item.syncData?.cursor || null,
      error: null
    };

    await itemService.updateItemSyncStatus(
      item.itemId,
      user._id,
      syncData
    );

    return {
      added: [],
      modified: [],
      removed: [],
      cursor: syncData.cursor
    };
  }

  /**
   * Performs the sync process for transactions.
   * @param {Object} syncSession - Sync session data.
   * @param {Object} item - Item data.
   * @param {Object} user - User data.
   * @returns {Object} Sync session results.
   */
  async _performSync(syncSession, item, user) {
    const access_token = itemService.decryptAccessToken(item, user);
    if (!access_token) {
      throw new CustomError('INVALID_TOKEN', 'Failed to decrypt access token');
    }

    const { itemId, userId } = item;
    const RATE_LIMIT_DELAY = 500;

    let cursor = syncSession.cursor;
    let batchCount = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`Processing batch ${++batchCount} for cursor: ${cursor}`);
      
      let batch;
      try {
        batch = await plaidService.fetchTransactionsFromPlaid(
          access_token, 
          cursor
        );
      } catch (error) {
        await CustomError.handleServiceError(item, user, error, {
          cursor,
          batchCount,
          syncSession,
          operation: 'fetch_transactions'
        }, this._updateSyncProgress);
      }

      try {
        // Process batch
        await this._processBatch(batch, syncSession, itemId, userId);
      } catch (error) {
        await CustomError.handleServiceError(item, user, error, {
          cursor,
          batchCount,
          syncSession,
          operation: 'process_batch'
        }, this._updateSyncProgress);
      }

      // Update cursor and check if more data available
      const nextCursor = batch.next_cursor;
      hasMore = nextCursor && nextCursor !== cursor;
      
      if (hasMore) {
        // Update sync progress
        await this._updateSyncProgress(itemId, userId, {
          status: 'in_progress',
          cursor: nextCursor,
          stats: {
            added: syncSession.added.length,
            modified: syncSession.modified.length,
            removed: syncSession.removed.length
          }
        });

        // Rate limiting delay between batches
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        
        // Update cursor for next iteration
        cursor = nextCursor;
      }
    }

    return syncSession;
  }

  /**
   * Processes a batch of transactions with improved error handling.
   */
  async _processBatch(batch, syncSession, itemId, userId) {
    if (!batch) {
      throw new CustomError('INVALID_BATCH', 'Received null or undefined batch');
    }

    const { added, modified, removed } = batch;

    // Log batch processing start
    console.log(`Processing ${added?.length || 0} new transactions`);

    try {
      // First, handle removals as they're independent
      if (removed?.length) {
        await this._removeTransactions(removed);
        syncSession.removed.push(...removed);
      }

      // Then handle modifications
      if (modified?.length) {
        await this._updateModifiedTransactions(modified, itemId, userId);
        syncSession.modified.push(...modified);
      }

      // Finally handle new additions
      if (added?.length) {
        const savedTransactions = await this._saveNewTransactions(added, itemId, userId);
        syncSession.added.push(...savedTransactions);
      }
      
      return {
        added: added?.length || 0,
        modified: modified?.length || 0,
        removed: removed?.length || 0
      };
    } catch (error) {
      console.error('Error processing batch:', error);
      throw new CustomError('BATCH_PROCESSING_ERROR', 'Failed to process transaction batch', {
        batchSize: {
          added: added?.length || 0,
          modified: modified?.length || 0,
          removed: removed?.length || 0
        },
        originalError: error.message
      });
    }
  }

  /**
   * Saves new transactions to the database.
   * @param {Array} transactions - New transactions to save.
   * @param {string} itemId - Item ID.
   * @param {string} userId - User ID.
   * @returns {Array} Saved transaction results.
   */
  async _saveNewTransactions(transactions, itemId, userId) {
    try {
      const formattedTransactions = transactions.map(transaction => ({
        ...transaction,
        userId,
        itemId
      }));

      if (formattedTransactions.length > 0) {
        const result = await plaidTransactions.insertMany(formattedTransactions);
        return result;
      }
      
      console.log('No new transactions to save');
      return [];
    } catch (error) {
      throw new CustomError('SAVE_ERROR', `Failed to save transactions: ${error.message}`);
    }
  }

  /**
   * Updates modified transactions in the database.
   * @param {Array} transactions - Modified transactions to update.
   * @param {string} itemId - Item ID.
   * @param {string} userId - User ID.
   * @returns {Object} Bulk write result.
   */
  async _updateModifiedTransactions(transactions, itemId, userId) {
    try {
      const bulkOps = transactions.map(transaction => ({
        updateOne: {
          filter: { transaction_id: transaction.transaction_id },
          update: { ...transaction, userId, itemId },
          upsert: false
        }
      }));

      const result = await plaidTransactions.bulkWrite(bulkOps);
      console.log(`Updated ${result.modifiedCount} transactions`);
      return result;
    } catch (error) {
      throw new CustomError('UPDATE_ERROR', `Failed to update transactions: ${error.message}`);
    }
  }

  /**
   * Removes transactions from the database.
   * @param {Array} transactionIds - Transaction IDs to remove.
   * @returns {Object} Deletion result.
   */
  async _removeTransactions(transactionIds) {
    try {
      const result = await plaidTransactions.deleteMany({ 
        transaction_id: { $in: transactionIds }
      });
      console.log(`Removed ${result.deletedCount} transactions`);
      return result;
    } catch (error) {
      throw new CustomError('DELETE_ERROR', `Failed to remove transactions: ${error.message}`);
    }
  }

  /**
   * Completes the sync process and updates sync status.
   * @param {Object} item - Item data.
   * @param {Object} result - Sync result data.
   * @param {Object} user - User data.
   */
  async _completeSync(item, result, user) {
    const syncData = {
      status: 'completed',
      lastSyncTime: Date.now(),
      nextSyncTime: Date.now() + (24 * 60 * 60 * 1000),
      cursor: result.cursor,
      error: null,
      stats: {
        added: result.added.length,
        modified: result.modified.length,
        removed: result.removed.length,
        lastTransactionDate: this._getLatestTransactionDate(result.added)
      }
    };

    const updatedItem = await this._updateSyncProgress(item.itemId, user._id, syncData);

    return updatedItem;
  }

  /**
   * Gets the latest transaction date from a list of transactions.
   * @param {Array} transactions - Transactions array.
   * @returns {string|null} Latest transaction date.
   */
  _getLatestTransactionDate(transactions) {
    if (!transactions.length) return null;
    return transactions
      .map(t => t.date)
      .sort((a, b) => new Date(b) - new Date(a))[0];
  }

  /**
   * Fetches transactions based on a query.
   * @param {Object} query - Query object.
   * @returns {Array} Matching transactions.
   */
  async fetchTransactions(query) {
    try {
      return await plaidTransactions.find(query);
    } catch (error) {
      throw new CustomError('FETCH_ERROR', error.message);
    }
  }

  /**
   * Fetches a transaction by ID and user ID.
   * @param {string} transactionId - Transaction ID.
   * @param {string} userId - User ID.
   * @returns {Object} Transaction data.
   */
  async fetchTransactionById(transactionId, userId) {
    try {
      const transaction = await plaidTransactions.findOne({ 
        transaction_id: transactionId,
        userId 
      });
      
      if (!transaction) {
        throw new CustomError('TRANSACTION_NOT_FOUND', 'Transaction not found');
      }
      
      return transaction;
    } catch (error) {
      throw new CustomError('FETCH_ERROR', error.message);
    }
  }

  /**
   * Builds a query for fetching user transactions.
   * @param {string} userId - User ID.
   * @param {Object} queryParams - Query parameters.
   * @returns {Object} Query object.
   */
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

  /**
   * Finds duplicate transactions for a user.
   * @param {string} userId - User ID.
   * @returns {Array} Groups of duplicate transactions.
   */
  async findDuplicates(userId) {
    try {
      const transactions = await this.fetchTransactions({ userId });
      const duplicates = new Map();

      transactions.forEach(transaction => {
        const key = transaction.transaction_id; // Use transaction_id as the unique key
        if (!duplicates.has(key)) {
          duplicates.set(key, []);
        }
        duplicates.get(key).push(transaction);
      });

      return Array.from(duplicates.values())
        .filter(group => group.length > 1);
    } catch (error) {
      throw new CustomError('DUPLICATE_CHECK_ERROR', error.message);
    }
  }

  /**
   * Removes transactions from the database by IDs.
   * @param {Array} transactionIds - Transaction IDs to remove.
   * @returns {Object} Removal result.
   */
  async removeFromDb(transactionIds) {
    try {
      const result = await plaidTransactions.deleteMany({ 
        transaction_id: { $in: transactionIds }
      });
      return { removed: result.deletedCount };
    } catch (error) {
      throw new CustomError('DELETE_ERROR', error.message);
    }
  }

  // Helper method to update sync progress
  async _updateSyncProgress(itemId, userId, progressData) {
    try {
      const updatedItem = await itemService.updateItemSyncStatus(itemId, userId, progressData);
      return updatedItem;
    } catch (error) {
      console.error('Failed to update sync progress:', error);
      // Don't throw here - we don't want to interrupt the sync for a progress update failure
    }
  }

  /**
   * Creates a sync response object.
   * @param {string} status - Sync status.
   * @param {Object} item - Item data.
   * @param {Object} [result] - Sync result data (optional).
   * @returns {Object} Sync response.
   */
  _createSyncResponse(status, item, result = null) {
    const response = {
      status,
      itemId: item._id,
      lastSyncTime: item.syncData?.lastSyncTime,
      nextSyncTime: item.syncData?.nextSyncTime
    };

    if (result) {
      response.stats = {
        added: result.added?.length || 0,
        modified: result.modified?.length || 0,
        removed: result.removed?.length || 0
      };
    }

    if (status === 'ERROR') {
      response.error = item.syncData?.error;
    }

    return response;
  }
}

export default new PlaidTransactionService(plaidClientInstance);