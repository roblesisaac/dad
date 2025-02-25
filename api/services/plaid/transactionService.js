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
      
      // Initialize sync state if needed
      if (!validatedItem.syncData?.status || 
          validatedItem.syncData?.status === 'completed' || 
          validatedItem.syncData?.status === 'error') {
        await this._initializeBatchSync(validatedItem, user);
        
        // Get the updated item with initialized sync data
        const updatedItem = await this._validateAndGetItem(validatedItem._id, user);
        const result = await this._processBatchInternal(updatedItem, user);
        
        // If there are more batches to process, start the continuation process
        // without waiting for it to complete
        if (result.hasMore) {
          // Use setTimeout to ensure this runs after the current execution context
          setTimeout(() => {
            this.continueBatchSync(updatedItem._id, user)
              .catch(err => console.error(`Error in batch continuation for item ${updatedItem._id}:`, err));
          }, 500);
        }
        
        return result;
      }
      
      // Process the next batch
      const result = await this._processBatchInternal(validatedItem, user);
      
      // If there are more batches to process, start the continuation process
      // without waiting for it to complete
      if (result.hasMore) {
        // Use setTimeout to ensure this runs after the current execution context
        setTimeout(() => {
          this.continueBatchSync(validatedItem._id, user)
            .catch(err => console.error(`Error in batch continuation for item ${validatedItem._id}:`, err));
        }, 500);
      }
      
      return result;
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
      const batch = await this._fetchTransactionBatch(accessToken, cursor);
      
      // Process the batch
      const batchResults = await this._processBatchData(batch, item, user);
      
      // Update item sync status
      const currentStats = item.syncData?.stats || { added: 0, modified: 0, removed: 0 };
      await itemService.updateItemSyncStatus(item.itemId || item._id, user._id, {
        status: batch.has_more ? 'in_progress' : 'completed',
        cursor: batch.next_cursor,
        batchNumber,
        stats: {
          added: (currentStats.added || 0) + batchResults.added,
          modified: (currentStats.modified || 0) + batchResults.modified,
          removed: (currentStats.removed || 0) + batchResults.removed,
          lastBatchTime: Date.now(),
          lastTransactionDate: this._getLatestTransactionDate(batch.added || [])
        }
      });
      
      return {
        hasMore: batch.has_more,
        nextCursor: batch.next_cursor,
        batchResults
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
   * Fetch a batch of transactions from Plaid
   * @param {string} accessToken - Plaid access token
   * @param {string} cursor - Cursor for pagination
   * @returns {Object} Batch of transactions
   */
  async _fetchTransactionBatch(accessToken, cursor) {
    try {
      const request = {
        access_token: accessToken,
        cursor: cursor,
        options: {
          include_original_description: true
        }
      };
      
      // Call Plaid API directly
      const response = await this.client.transactionsSync(request);
      return response.data;
    } catch (error) {
      throw CustomError.createFormattedError(error, { operation: 'fetch_transactions' });
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
   * Checks if a sync is already in progress for the item.
   * @param {Object} item - Item data.
   * @returns {boolean} True if sync is in progress.
   */
  _isSyncInProgress(item) {
    return ['in_progress', 'queued'].includes(item.syncData?.status);
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
   * Helper function to check if an object is empty
   * @param {Object} obj - Object to check
   * @returns {boolean} True if object is empty
   */
  _isEmptyObject(obj) {
    return Object.keys(obj).length === 0;
  }

  /**
   * Helper function to check if a property is metadata
   * @param {string} prop - Property name
   * @returns {boolean} True if property is metadata
   */
  _isMeta(prop) {
    return ['userId', 'itemId', '_id', 'id'].includes(prop);
  }

  /**
   * Formats a date range for Ampt's query format
   * @param {string} userInfo - User prefix information
   * @param {string} dateRange - Date range string
   * @returns {string} Formatted date string for query
   */
  _formatDateForQuery(userInfo, dateRange) {
    // Handle different separator formats
    const separator = dateRange.includes('_') ? '_' : 
                     dateRange.includes('|') ? '|' : 
                     dateRange.includes(',') ? ',' : '_';
    
    const [startDate, endDate] = dateRange.split(separator);
    let formatted = `${userInfo}`;

    if (startDate) formatted += startDate.trim();

    if (endDate) {
      formatted += `|accountdate_${userInfo}${endDate.trim()}`;
    } else {
      formatted += '*';
    }

    return formatted;
  }

  /**
   * Builds a query optimized for Ampt's data interface
   * @param {string} userId - User ID
   * @param {Object} query - Original query object
   * @returns {Object} Formatted query object
   */
  _buildAmptQuery(userId, query) {
    if (this._isEmptyObject(query)) {
      return {
        transaction_id: '*',
        userId
      };
    }

    const result = { userId };
    const { account_id } = query;
    const userInfo = `${account_id || ''}:`;

    // Process each query property
    for (const prop in query) {
      if (this._isMeta(prop) || prop === 'select' || prop === 'userId') {
        continue;
      }

      // Special handling for date
      if (prop === 'date') {
        result.accountdate = this._formatDateForQuery(userInfo, query[prop]);
        continue;
      }

      // Format other properties
      if (query[prop]) {
        result[prop] = `${userInfo}${query[prop].toString().replace('*', '')}*`;
      }
    }

    return result;
  }

  /**
   * Fetches transactions based on a query.
   * @param {Object} query - Query object.
   * @returns {Array} Matching transactions.
   */
  async fetchTransactions(query) {
    try {
      // Format the query for Ampt's data interface
      const formattedQuery = this._buildAmptQuery(query.userId, query);
      
      // Execute the query with the formatted object
      const res = await plaidTransactions.find(formattedQuery);
      return res.items;
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
      // Parse the date range
      let startDate, endDate;
      
      // Check if we have a date range with underscore separator
      if (queryParams.date.includes('_')) {
        [startDate, endDate] = queryParams.date.split('_');
      } 
      // Check if we have a date range with comma separator
      else if (queryParams.date.includes(',')) {
        [startDate, endDate] = queryParams.date.split(',');
      }
      
      if (startDate && endDate) {
        // Format as a simple date range with pipe character
        query.date = `${startDate.trim()}|${endDate.trim()}`;
      } else {
        // If we only have one date or can't parse, use the original value
        query.date = queryParams.date;
      }
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
   * Continues the batch sync process for an item
   * This should be called after processing a batch with hasMore=true
   * 
   * @param {Object|string} item - Item or item ID
   * @param {Object} user - User data
   * @returns {Promise<boolean>} True if sync is complete
   */
  async continueBatchSync(item, user) {
    try {
      if (!user) {
        throw new CustomError('INVALID_USER', 'Missing required user data');
      }
      
      // Validate item
      const validatedItem = await this._validateAndGetItem(item, user);
      
      // Check if sync is still in progress
      if (validatedItem.syncData?.status !== 'in_progress') {
        // Sync already completed or errored
        return true;
      }
      
      // Process next batch
      const batchResult = await this._processBatchInternal(validatedItem, user);
      
      // If there are more batches, continue the process
      if (batchResult.hasMore) {
        // Schedule the next batch with a small delay
        setTimeout(() => {
          this.continueBatchSync(validatedItem._id, user)
            .catch(err => console.error(`Error continuing batch sync for item ${validatedItem._id}:`, err));
        }, 500); // 500ms delay to prevent overwhelming the server
        
        return false;
      }
      
      // No more batches, sync is complete
      return true;
    } catch (error) {
      console.error('Error in continueBatchSync:', error);
      
      // Update item to error state
      if (typeof item === 'string') {
        await itemService.updateItemSyncStatus(item, user._id, {
          status: 'error',
          error: {
            code: error.code || 'BATCH_PROCESSING_ERROR',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
      } else if (item?._id) {
        await itemService.updateItemSyncStatus(item._id, user._id, {
          status: 'error',
          error: {
            code: error.code || 'BATCH_PROCESSING_ERROR',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      return false;
    }
  }
}

export default new PlaidTransactionService();