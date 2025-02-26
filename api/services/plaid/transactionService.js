import PlaidBaseService from './baseService.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import { itemService, plaidService } from './index.js';
import { CustomError } from './customError.js';

class PlaidTransactionService extends PlaidBaseService {
  /**
   * Processes a single batch of transactions for an item.
   * For batch-by-batch processing in serverless environments.
   * 
   * @param {Object|string} item - Item or item ID.
   * @param {Object} user - User data.
   * @returns {Object} Batch processing results.
   */
  async processSingleBatch(item, user) {
    if (!user) {
      throw new CustomError('INVALID_USER', 'Missing required user data');
    }

    try {
      // Get or validate item
      const validatedItem = await this._validateAndGetItem(item, user);
      
      if (!validatedItem) {
        throw new CustomError('INVALID_ITEM', 'Invalid item data');
      }

      const { syncData } = validatedItem;
      const { status } = syncData || {};
      
      // Initialize sync state if needed
      if (!status || status === 'completed' || status === 'error') {
        const syncSession = await this._initializeBatchSync(validatedItem, user);
        const result = await this._processBatchInternal(syncSession, user);
        
        return {
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
          batchResults: result.batchResults,
          stats: result.stats || syncSession.syncData?.stats
        };
      }
      
      // Process the next batch
      const result = await this._processBatchInternal(validatedItem, user);
      
      return {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        batchResults: result.batchResults,
        stats: result.stats || syncData?.stats
      };
    } catch (error) {
      throw CustomError.createFormattedError(error, { operation: 'batch_sync' });
    }
  }
  
  /**
   * Initialize a batch sync session
   * @param {Object} item - Item data
   * @param {Object} user - User data
   * @returns {Object} Updated item
   */
  async _initializeBatchSync(item, user) {
    const syncData = {
      status: 'in_progress',
      lastSyncTime: Date.now(),
      nextSyncTime: Date.now() + (24 * 60 * 60 * 1000),
      cursor: item.syncData?.cursor || null,
      error: null,
      batchNumber: 0,
      stats: {
        added: 0,
        modified: 0,
        removed: 0
      }
    };

    return await itemService.updateItemSyncStatus(
      item.itemId || item._id,
      user._id,
      syncData
    );
  }
  
  /**
   * Internal batch processing implementation
   * @param {Object} item - Validated item
   * @param {Object} user - User data
   * @returns {Object} Batch results
   */
  async _processBatchInternal(item, user) {
    try {
      const accessToken = itemService.decryptAccessToken(item, user);
      if (!accessToken) {
        throw new CustomError('INVALID_TOKEN', 'Failed to decrypt access token');
      }

      const cursor = item.syncData?.cursor || null;
      const batchNumber = (item.syncData?.batchNumber || 0) + 1;

      // Fetch a single batch from Plaid
      const batch = await plaidService.syncLatestTransactionsFromPlaid(accessToken, cursor);
      
      // Process the batch
      const batchResults = await this._processBatchData(batch, item, user);
      
      // Update item sync status
      const currentStats = item.syncData?.stats || { added: 0, modified: 0, removed: 0 };
      const updatedStats = {
        added: (currentStats.added || 0) + batchResults.added,
        modified: (currentStats.modified || 0) + batchResults.modified,
        removed: (currentStats.removed || 0) + batchResults.removed,
        lastBatchTime: Date.now(),
        lastTransactionDate: this._getLatestTransactionDate(batch.added || [])
      };
      
      await itemService.updateItemSyncStatus(item.itemId || item._id, user._id, {
        status: batch.has_more ? 'in_progress' : 'completed',
        cursor: batch.next_cursor,
        batchNumber,
        stats: updatedStats
      });

      return {
        hasMore: batch.has_more,
        nextCursor: batch.next_cursor,
        batchResults,
        stats: updatedStats
      };
    } catch (error) {
      // Update item to error state
      await itemService.updateItemSyncStatus(item.itemId || item._id, user._id, {
        status: 'error',
        error: {
          code: error.code || 'BATCH_PROCESSING_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
      
      throw error;
    }
  }

  /**
   * Process transaction batch data
   * @param {Object} batch - Batch from Plaid API
   * @param {Object} item - Plaid item
   * @param {Object} user - User object
   * @returns {Object} Results of processing
   */
  async _processBatchData(batch, item, user) {
    try {
      const { added = [], modified = [], removed = [] } = batch;
      
      // Handle removed transactions
      let removedCount = 0;
      if (removed.length > 0) {
        const removeResult = await this._removeTransactions(removed);
        removedCount = removeResult.deletedCount || 0;
      }
      
      // Handle modified transactions
      let modifiedCount = 0;
      if (modified.length > 0) {
        const modifyResult = await this._updateModifiedTransactions(
          modified, item.itemId || item._id, user._id
        );
        modifiedCount = modifyResult.modifiedCount || 0;
      }
      
      // Handle added transactions
      let addedCount = 0;
      if (added.length > 0) {
        const addResult = await this._saveNewTransactions(
          added, item.itemId || item._id, user._id
        );
        addedCount = addResult.length || 0;
      }
      
      return {
        added: addedCount,
        modified: modifiedCount,
        removed: removedCount
      };
    } catch (error) {
      throw CustomError.createFormattedError(error, { operation: 'process_batch' });
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
        
        // Try different ways of finding the item
        let foundItem;
        
        // First try direct getUserItems with itemId
        foundItem = await itemService.getUserItems(user._id, item);
        
        if (!foundItem) {
          // Try to get all items and find matching one
          const allUserItems = await itemService.getUserItems(user._id);
          
          if (Array.isArray(allUserItems)) {
            // Try matching by different ID fields
            foundItem = allUserItems.find(i => 
              i._id === item || 
              i.itemId === item || 
              i.id === item
            );
          }
        }
        
        if (!foundItem) {
          throw new CustomError('ITEM_NOT_FOUND', 'Item not found for this user');
        }
        
        return foundItem;
      }

      if (!item?.accessToken && (!item?._id || !item?.userId)) {
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
      return result;
    } catch (error) {
      throw new CustomError('DELETE_ERROR', `Failed to remove transactions: ${error.message}`);
    }
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
   * Formats a date range for the accountdate query parameter
   * @param {string} accountId - Account ID to use in formatting
   * @param {string} dateRange - Date range string (format: 'startDate_endDate')
   * @returns {string} Formatted date string for query
   */
  _formatDateForQuery(accountId, dateRange) {
    if (!dateRange) return null;
    
    // Split the date range by underscore separator
    const [startDate, endDate] = dateRange.split('_');
    
    if (!startDate) return null;
    
    if (endDate) {
      return `${accountId}:${startDate.trim()}|accountdate_${accountId}:${endDate.trim()}`;
    } else {
      return `${accountId}:${startDate.trim()}*`;
    }
  }

  /**
   * Fetches transactions based on a query.
   * @param {Object} query - Query object.
   * @returns {Array} Matching transactions.
   */
  async fetchTransactions(user, query) {
    try {
      // Initialize the formatted query with the user ID
      const formattedQuery = { userId: user._id };
      
      // Format account_id if present
      if (query.account_id) {
        formattedQuery.account_id = `${query.account_id}:${query.account_id}*`;
      }
      
      // Format date range for accountdate if present
      if (query.date && query.account_id) {
        const formattedDate = this._formatDateForQuery(query.account_id, query.date);
        if (formattedDate) {
          formattedQuery.accountdate = formattedDate;
        }
      }
      
      // Remove any keys that shouldn't be in the final query
      ['date', 'select'].forEach(key => {
        delete query[key];
      });
      
      // Execute the query
      const res = await plaidTransactions.find(formattedQuery);
      return Array.isArray(res) ? res : (res.items || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
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
      query.date = queryParams.date;
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
        const key = transaction.transaction_id;
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

export default new PlaidTransactionService();