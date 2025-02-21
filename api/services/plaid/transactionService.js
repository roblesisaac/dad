import PlaidBaseService from './baseService.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import { itemService, plaidService } from './index.js';
import { plaidClientInstance } from './plaidClientConfig.js';
import { CustomError } from './customError.js'; // Assuming a custom error class is available

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
        await this._completeSync(validatedItem, result, user);
        
        return this._createSyncResponse('COMPLETED', validatedItem, result);
      } catch (error) {
        // Handle sync error
        await this._handleSyncError(validatedItem, error, user);
        throw error;
      }
    } catch (error) {
      console.error('Error in syncTransactionsForItem:', error);
      throw this._formatError(error);
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
      throw this._formatError(error);
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

    let hasMore = true;
    let cursor = syncSession.cursor;
    let batchCount = 0;
    let lastCursor = null;
    const RATE_LIMIT_DELAY = 1000;
    const MAX_RETRIES = 3;

    // Store these values to avoid losing them between batches
    const { itemId, userId } = item;

    while (hasMore) {
      console.log(`Processing batch ${++batchCount} for item:`, itemId, {
        currentCursor: cursor,
        lastCursor,
        batchCount
      });
      
      let retryCount = 0;
      while (retryCount <= MAX_RETRIES) {
        try {
          // Get batch of transactions from Plaid
          console.log('Fetching transactions from Plaid:', {
            itemId,
            cursor,
            batchCount
          });

          const batch = await plaidService.fetchTransactionsFromPlaid(
            access_token, 
            cursor
          );

          console.log('Received batch from Plaid:', {
            itemId,
            batchCount,
            hasAdded: !!batch.added?.length,
            addedCount: batch.added?.length || 0,
            hasModified: !!batch.modified?.length,
            modifiedCount: batch.modified?.length || 0,
            hasRemoved: !!batch.removed?.length,
            removedCount: batch.removed?.length || 0,
            hasNextCursor: !!batch.next_cursor,
            nextCursor: batch.next_cursor
          });

          // Validate batch data
          if (!batch) {
            console.error('Received null batch from Plaid');
            throw new CustomError('INVALID_RESPONSE', 'Null batch response from Plaid');
          }

          // Store current cursor before processing
          lastCursor = cursor;

          // Process batch even if empty (might have cursor updates)
          await this._processBatch(batch, syncSession, itemId, userId);

          // Update cursor and check if more data available
          cursor = batch.next_cursor;
          hasMore = cursor !== null && cursor !== lastCursor && cursor !== undefined;

          console.log('Batch processing complete:', {
            itemId,
            batchCount,
            previousCursor: lastCursor,
            newCursor: cursor,
            hasMore,
            totalProcessed: {
              added: syncSession.added.length,
              modified: syncSession.modified.length,
              removed: syncSession.removed.length
            }
          });

          // Update sync progress if we have more batches
          if (hasMore) {
            const progressData = {
              status: 'in_progress',
              cursor,
              stats: {
                added: syncSession.added.length,
                modified: syncSession.modified.length,
                removed: syncSession.removed.length
              }
            };

            await itemService.updateItemSyncStatus(itemId, userId, progressData);

            // Add delay between requests to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
          }

          break; // Exit retry loop on success
        } catch (error) {
          console.error('Batch processing error:', {
            itemId,
            batchCount,
            error: error.message,
            errorResponse: error.response?.data,
            errorStatus: error.response?.status
          });

          // Handle rate limit errors with exponential backoff
          if (error.response?.status === 429) {
            retryCount++;
            const backoffDelay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s, etc.
            console.log(`Rate limit hit, retrying in ${backoffDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }

          // Handle EPIPE errors with a fixed delay
          if (error.message.includes('EPIPE')) {
            retryCount++;
            console.log('EPIPE error, retrying after 5s...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }

          // Handle cursor invalidation or reset
          if (error.error_code === 'INVALID_CURSOR') {
            console.log('Invalid cursor detected, resetting sync...');
            cursor = null; // Reset cursor to start from beginning
            continue;
          }

          await this._handleSyncError({ itemId, userId }, error, user);
          throw error;
        }
      }

      if (retryCount > MAX_RETRIES) {
        throw new CustomError('RETRY_EXHAUSTED', 'Max retries exceeded for batch processing');
      }
    }

    return syncSession;
  }

  /**
   * Processes a batch of transactions.
   * @param {Object} batch - Batch of transactions from Plaid.
   * @param {Object} syncSession - Sync session data.
   * @param {string} itemId - Item ID.
   * @param {string} userId - User ID.
   */
  async _processBatch(batch, syncSession, itemId, userId) {
    try {
      // Use a database transaction for atomicity (if supported)
      await plaidTransactions.startTransaction();

      // Add new transactions to running totals
      if (batch.added?.length) {
        console.log(`Processing ${batch.added.length} new transactions`);
        syncSession.added = [...syncSession.added, ...batch.added];
        await this._saveNewTransactions(batch.added, itemId, userId);
      }

      // Add modified transactions to running totals
      if (batch.modified?.length) {
        console.log(`Processing ${batch.modified.length} modified transactions`);
        syncSession.modified = [...syncSession.modified, ...batch.modified];
        await this._updateModifiedTransactions(batch.modified, itemId, userId);
      }

      // Add removed transactions to running totals
      if (batch.removed?.length) {
        console.log(`Processing ${batch.removed.length} removed transactions`);
        syncSession.removed = [...syncSession.removed, ...batch.removed];
        await this._removeTransactions(batch.removed);
      }

      await plaidTransactions.commitTransaction();
    } catch (error) {
      await plaidTransactions.abortTransaction();
      console.error('Error in _processBatch:', {
        error: error.message,
        itemId,
        batchSize: {
          added: batch.added?.length || 0,
          modified: batch.modified?.length || 0,
          removed: batch.removed?.length || 0
        }
      });
      throw error;
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

      console.log(`Saving ${formattedTransactions.length} new transactions`);

      // Check for existing transactions to avoid duplicates
      const existingIds = await plaidTransactions.find({
        transaction_id: { $in: transactions.map(t => t.transaction_id) }
      }).select('transaction_id');

      const newTransactions = formattedTransactions.filter(
        t => !existingIds.includes(t.transaction_id)
      );

      if (newTransactions.length > 0) {
        const result = await plaidTransactions.insertMany(newTransactions);
        console.log(`Successfully saved ${result.length} transactions`);
        return result;
      } else {
        console.log('No new transactions to save');
        return [];
      }
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

    await itemService.updateItemSyncStatus(
      item.itemId, 
      user._id,
      syncData
    );
  }

  /**
   * Handles sync errors and updates sync status.
   * @param {Object} item - Item data.
   * @param {Object} error - Error object.
   * @param {Object} user - User data.
   */
  async _handleSyncError(item, error, user) {
    const errorData = {
      status: 'error',
      error: {
        code: error.error_code || 'SYNC_ERROR',
        message: error.message,
        timestamp: Date.now()
      }
    };

    await itemService.updateItemSyncStatus(
      item.itemId,
      user._id,
      errorData
    );
  }

  /**
   * Creates a sync response object.
   * @param {string} status - Sync status.
   * @param {Object} item - Item data.
   * @param {Object} result - Sync result data (optional).
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
        added: result.added.length,
        modified: result.modified.length,
        removed: result.removed.length
      };
    }

    if (status === 'ERROR') {
      response.error = item.syncData?.error;
    }

    return response;
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
   * Formats errors into a standard CustomError format.
   * @param {Object} error - Error object.
   * @returns {Object} Formatted error.
   */
  _formatError(error) {
    if (error instanceof CustomError) {
      return error;
    }
    return new CustomError('SYNC_ERROR', error.message);
  }

  /**
   * Synchronizes transactions for all user items.
   * @param {Object} user - User data.
   * @returns {Object} Sync results for all items.
   */
  async syncAllUserTransactions(user) {
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
   * Processes and saves transactions in a batch.
   * @param {Object} transactions - Transactions object with added, modified, and removed arrays.
   * @param {string} userId - User ID.
   * @param {string} itemId - Item ID.
   * @returns {Object} Processing results.
   */
  async processAndSaveTransactions(transactions, userId, itemId) {
    const { added, modified, removed } = transactions;

    try {
      await plaidTransactions.startTransaction();

      // Handle removed transactions
      if (removed?.length) {
        await plaidTransactions.deleteMany({ 
          transaction_id: { $in: removed.map(t => t.transaction_id) }
        });
      }

      // Handle modified transactions
      if (modified?.length) {
        const bulkOps = modified.map(transaction => ({
          updateOne: {
            filter: { transaction_id: transaction.transaction_id },
            update: { ...transaction, userId, itemId },
            upsert: false
          }
        }));
        await plaidTransactions.bulkWrite(bulkOps);
      }

      // Handle new transactions
      if (added?.length) {
        const formattedTransactions = added.map(transaction => ({
          ...transaction,
          userId,
          itemId
        }));
        await plaidTransactions.insertMany(formattedTransactions);
      }

      await plaidTransactions.commitTransaction();

      return {
        added: added?.length || 0,
        modified: modified?.length || 0,
        removed: removed?.length || 0
      };
    } catch (error) {
      await plaidTransactions.abortTransaction();
      throw new CustomError('DB_ERROR', `Error processing transactions: ${error.message}`);
    }
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
}

export default new PlaidTransactionService(plaidClientInstance);