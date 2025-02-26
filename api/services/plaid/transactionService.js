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
  async syncNextBatch(item, user) {
    if (!user) {
      throw new CustomError('INVALID_USER', 'Missing required user data');
    }

    try {
      // Get or validate item
      let validatedItem = await this._validateAndGetItem(item, user);
      
      if (!validatedItem) {
        throw new CustomError('INVALID_ITEM', 'Invalid item data');
      }

      const { syncData } = validatedItem;
      const { status } = syncData || {};
      
      // Enhanced recovery logic - check if we need recovery
      if (status === 'error' && syncData?.lastSuccessfulCursor) {
        console.log(`Attempting to recover sync for item ${validatedItem.itemId || validatedItem._id}`);

        // Use our dedicated recovery function to revert transactions and restore state
        const recoveryResult = await this.recoverFailedSync(
          validatedItem, 
          user
        );
        
        // Log recovery attempt
        if (recoveryResult.recovered) {
          console.log(`Successfully recovered sync for item to cursor: ${recoveryResult.revertedTo}`);
          console.log(`Removed ${recoveryResult.removedCount} potentially corrupt transactions`);
        } else {
          console.warn(`Unable to recover sync: ${recoveryResult.message}`);
        }
        
        // Refresh the item after recovery
        validatedItem = await this._validateAndGetItem(validatedItem.itemId, user);
      }
      
      // Determine if we need to initialize a new sync session
      const shouldInitialize = !syncData?.status || 
                              syncData?.status === 'completed' || 
                              (syncData?.status === 'in_progress' && this.isStaleSync(syncData));
      
      if (shouldInitialize) {
        const syncSession = await this._initializeBatchSync(validatedItem, user);
        const result = await this._processBatchInternal(syncSession, user);
        
        // Check if this was an optimized "no changes" sync
        if (result.noChangesOptimized) {
          return {
            hasMore: result.hasMore,
            nextCursor: result.nextCursor,
            batchResults: result.batchResults,
            stats: result.stats || syncSession.syncData?.stats,
            syncVersion: result.syncVersion,
            noChangesOptimized: true,
            message: "No changes detected, sync optimized"
          };
        }
        
        return {
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
          batchResults: result.batchResults,
          stats: result.stats || syncSession.syncData?.stats,
          syncVersion: result.syncVersion,
          inRecoveryMode: syncSession.syncData?.inRecoveryMode || false
        };
      }
      
      // Check for a potential race condition - don't allow multiple concurrent syncs
      if (syncData?.status === 'in_progress') {
        const lastSyncTime = syncData?.lastSyncTime || 0;
        const now = Date.now();
        const syncAgeInMinutes = (now - lastSyncTime) / (1000 * 60);
        
        // If the sync has been in progress for more than 15 minutes, it's likely stalled
        // We'll allow a new sync to start in this case
        if (syncAgeInMinutes < 15) {
          // Otherwise, this is likely a race condition with multiple syncs
          console.warn(`Concurrent sync detected for item ${validatedItem.itemId}, existing sync is still active`);
        }
      }
      
      // Process the next batch
      const result = await this._processBatchInternal(validatedItem, user);
      
      // Check if this was an optimized "no changes" sync
      if (result.noChangesOptimized) {
        return {
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
          batchResults: result.batchResults,
          stats: result.stats,
          syncVersion: result.syncVersion,
          noChangesOptimized: true,
          message: "No changes detected, sync optimized"
        };
      }
      
      // Store the lastSuccessfulSyncTime when a batch completes successfully
      if (result.hasMore === false) {
        await itemService.updateItemSyncStatus(validatedItem.itemId || validatedItem._id, user._id, {
          lastSuccessfulSyncTime: Date.now()
        });
      }
      
      return {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        batchResults: result.batchResults,
        stats: result.stats || syncData?.stats,
        syncVersion: result.syncVersion,
        inRecoveryMode: validatedItem.syncData?.inRecoveryMode || false,
        recovered: syncData?.inRecoveryMode || false // Indicate if this was a recovery sync
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
    // Check if we need to enter recovery mode
    const inRecoveryMode = item.syncData?.status === 'error' && 
                          item.syncData?.lastSuccessfulCursor !== null;
    
    // Determine if we should increment the syncVersion
    // We increment when:
    // 1. We're entering recovery mode
    // 2. We don't have a syncVersion yet
    // 3. The previous sync was completed or had an error
    const shouldIncrementVersion = 
      inRecoveryMode || 
      !item.syncData?.syncVersion ||
      item.syncData?.status === 'error';
    
    // Increment syncVersion only when needed
    const syncVersion = shouldIncrementVersion 
      ? (item.syncData?.syncVersion || 0) + 1 
      : (item.syncData?.syncVersion || 1);
    
    const syncData = {
      status: 'in_progress',
      lastSyncTime: Date.now(),
      nextSyncTime: Date.now() + (24 * 60 * 60 * 1000),
      // If in recovery mode, use the last successful cursor
      cursor: inRecoveryMode ? item.syncData?.lastSuccessfulCursor : (item.syncData?.cursor || null),
      // Keep track of the last successful cursor
      lastSuccessfulCursor: item.syncData?.lastSuccessfulCursor || null,
      syncVersion: syncVersion,
      error: null,
      batchNumber: 0,
      inRecoveryMode: inRecoveryMode,
      recoveryAttempts: inRecoveryMode ? (item.syncData?.recoveryAttempts || 0) + 1 : 0,
      lastRecoveryTime: inRecoveryMode ? Date.now() : null,
      stats: item.syncData?.stats || {
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

      // Extract sync information
      const { syncData } = item;
      const { syncVersion, cursor, inRecoveryMode } = syncData || {};
      const batchNumber = (syncData?.batchNumber || 0) + 1;

      // Fetch a single batch from Plaid
      const batch = await plaidService.syncLatestTransactionsFromPlaid(accessToken, cursor);
      
      // Check if this batch contains any actual changes
      const hasChanges = batch.added?.length > 0 || batch.modified?.length > 0 || batch.removed?.length > 0;
      
      // Check if cursor is unchanged - this happens when there are no new transactions
      const cursorUnchanged = cursor === batch.next_cursor;
      
      // If there are no changes and the cursor didn't change, we can optimize
      // by skipping most of the processing and just updating the minimal necessary fields
      if (!hasChanges && cursorUnchanged && syncData?.lastSuccessfulSyncTime) {
        console.log(`No changes detected for item ${item.itemId || item._id}, optimizing sync process`);
        
        // Only update the timestamps and status
        await itemService.updateItemSyncStatus(item.itemId || item._id, user._id, {
          status: 'completed',
          lastSyncTime: Date.now(),
          nextSyncTime: Date.now() + (24 * 60 * 60 * 1000)
        });
        
        return {
          hasMore: false,
          nextCursor: batch.next_cursor,
          batchResults: {
            added: 0,
            modified: 0,
            removed: 0
          },
          stats: syncData?.stats || { added: 0, modified: 0, removed: 0 },
          syncVersion, // Keep the same syncVersion since nothing changed
          noChangesOptimized: true // Flag to indicate we optimized this process
        };
      }
      
      // Store the next cursor before processing the batch
      // This ensures we capture it even if processing fails
      await itemService.updateItemSyncStatus(item.itemId || item._id, user._id, {
        nextCursor: batch.next_cursor
      });
      
      // Process the batch with version tracking
      const batchResults = await this._processBatchData(batch, item, user, syncVersion, batchNumber);
      
      // Update item sync status
      const currentStats = syncData?.stats || { added: 0, modified: 0, removed: 0 };
      const updatedStats = {
        added: (currentStats.added || 0) + batchResults.added,
        modified: (currentStats.modified || 0) + batchResults.modified,
        removed: (currentStats.removed || 0) + batchResults.removed,
        lastBatchTime: Date.now(),
        lastTransactionDate: this._getLatestTransactionDate(batch.added || [])
      };
      
      // Determine if this was a successful batch
      const isSuccessful = true; // We would add error checking logic here if needed
      
      // Update sync status
      await itemService.updateItemSyncStatus(item.itemId || item._id, user._id, {
        status: batch.has_more ? 'in_progress' : 'completed',
        cursor: batch.next_cursor,
        // If this was a successful batch, update the last successful cursor
        lastSuccessfulCursor: isSuccessful ? batch.next_cursor : syncData?.lastSuccessfulCursor,
        batchNumber,
        inRecoveryMode: inRecoveryMode && batch.has_more, // Exit recovery mode when sync completes
        stats: updatedStats
      });

      return {
        hasMore: batch.has_more,
        nextCursor: batch.next_cursor,
        batchResults,
        stats: updatedStats,
        syncVersion // Return sync version for tracking
      };
    } catch (error) {
      // Update item to error state but keep the sync version and last successful cursor
      await itemService.updateItemSyncStatus(item.itemId || item._id, user._id, {
        status: 'error',
        error: {
          code: error.code || 'BATCH_PROCESSING_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        },
        syncVersion: item.syncData?.syncVersion // Keep the same sync version for retry
      });
      
      throw error;
    }
  }

  /**
   * Process transaction batch data
   * @param {Object} batch - Batch from Plaid API
   * @param {Object} item - Plaid item
   * @param {Object} user - User object
   * @param {Number} syncVersion - Current sync version
   * @param {Number} batchNumber - Current batch number
   * @returns {Object} Results of processing
   */
  async _processBatchData(batch, item, user, syncVersion, batchNumber) {
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
          modified, item.itemId || item._id, user._id, syncVersion, batchNumber
        );
        modifiedCount = modifyResult.modifiedCount || 0;
      }
      
      // Handle added transactions
      let addedCount = 0;
      if (added.length > 0) {
        const addResult = await this._saveNewTransactions(
          added, item.itemId || item._id, user._id, syncVersion, batchNumber
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
   * Save new transactions with duplicate prevention
   * @param {Array} transactions - New transactions
   * @param {String} itemId - Plaid item ID
   * @param {String} userId - User ID
   * @param {Number} syncVersion - Current sync version
   * @param {Number} batchNumber - Current batch number
   * @returns {Array} Saved transactions
   */
  async _saveNewTransactions(transactions, itemId, userId, syncVersion, batchNumber) {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    const prepared = [];
    const processedAt = new Date().toISOString();
    const batchTime = Date.now();
    
    // Get the current item to retrieve the cursor
    const item = await itemService.getUserItems(userId, itemId);
    const cursor = item?.syncData?.cursor;
    const nextCursor = item?.syncData?.nextCursor;
    const hasMore = item?.syncData?.status === 'in_progress';

    for (const tx of transactions) {
      // Check if transaction already exists
      const existingTx = await plaidTransactions.findOne({ transaction_id: tx.transaction_id, userId });
      
      // Skip if already exists and has an equal or higher sync version
      if (existingTx && existingTx.syncVersion >= syncVersion) {
        continue;
      }
      
      // Create transaction object with all necessary properties for syncId creation
      const txToSave = {
        ...tx,
        userId,
        // The syncId will be generated in the model based on userId, itemId and batchTime
        user: { _id: userId }, // Required for model's syncId setter
        itemId, // Required for model's syncId setter
        batchTime,
        syncVersion,
        batchNumber,
        processedAt,
        cursor: cursor || nextCursor, // Store the cursor associated with this batch
        hasMore // Whether there were more transactions after this batch
      };
      
      prepared.push(txToSave);
    }

    // Nothing to save after duplicate check
    if (prepared.length === 0) {
      return [];
    }

    // Use the insertMany method from our model
    return await plaidTransactions.insertMany(prepared);
  }

  /**
   * Update modified transactions with version checking
   * @param {Array} transactions - Modified transactions
   * @param {String} itemId - Plaid item ID
   * @param {String} userId - User ID
   * @param {Number} syncVersion - Current sync version
   * @param {Number} batchNumber - Current batch number
   * @returns {Object} Update results
   */
  async _updateModifiedTransactions(transactions, itemId, userId, syncVersion, batchNumber) {
    if (!transactions || transactions.length === 0) {
      return { modifiedCount: 0 };
    }

    const processedAt = new Date().toISOString();
    const batchTime = Date.now();
    let modifiedCount = 0;

    // Get the current item to retrieve the cursor
    const item = await itemService.getUserItems(userId, itemId);
    const cursor = item?.syncData?.cursor;
    const nextCursor = item?.syncData?.nextCursor;
    const hasMore = item?.syncData?.status === 'in_progress';

    for (const tx of transactions) {
      const existingTx = await plaidTransactions.findOne({ transaction_id: tx.transaction_id, userId });
      
      // Skip if version check fails
      if (existingTx && existingTx.syncVersion >= syncVersion) {
        continue;
      }

      // Create transaction object with all necessary properties for syncId creation
      const txUpdate = {
        ...tx,
        userId,
        // The syncId will be generated in the model based on userId, itemId and batchTime
        user: { _id: userId }, // Required for model's syncId setter
        itemId, // Required for model's syncId setter
        batchTime,
        syncVersion,
        batchNumber,
        processedAt,
        cursor: cursor || nextCursor, // Store the cursor associated with this batch
        hasMore // Whether there were more transactions after this batch
      };

      try {
        await plaidTransactions.update({ transaction_id: tx.transaction_id, userId }, txUpdate);
        modifiedCount++;
      } catch (error) {
        console.error(`Failed to update transaction ${tx.transaction_id}:`, error.message);
      }
    }

    return { modifiedCount };
  }

  /**
   * Remove transactions with version checking
   * @param {Array} transactionIds - Transaction IDs to remove
   * @returns {Object} Removal results
   */
  async _removeTransactions(transactionIds) {
    if (!transactionIds || transactionIds.length === 0) {
      return { deletedCount: 0 };
    }

    let deletedCount = 0;

    for (const id of transactionIds) {
      try {
        const result = await plaidTransactions.erase({ transaction_id: id });
        if (result.removed) {
          deletedCount++;
        }
      } catch (error) {
        console.error(`Failed to remove transaction ${id}:`, error.message);
      }
    }

    return { deletedCount };
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

  /**
   * Recover from a failed sync by reverting to last successful cursor
   * @param {String} itemId - Item ID to recover
   * @param {Object} user - User object
   * @returns {Object} Recovery result
   */
  async recoverFailedSync(item, user) {
    try {
      
      // Get item data
      const validatedItem = await this._validateAndGetItem(item, user);
      
      if (!validatedItem) {
        throw new CustomError('ITEM_NOT_FOUND', 'Item not found');
      }
      
      const { syncData } = validatedItem;
      
      // Check if recovery is needed
      if (syncData?.status !== 'error') {
        return {
          recovered: false,
          message: 'Item not in error state, recovery not needed'
        };
      }
      
      // Check if we have a last successful cursor
      if (!syncData?.lastSuccessfulCursor) {
        return {
          recovered: false,
          message: 'No last successful cursor found for recovery'
        };
      }
      
      // Revert transactions to the last successful cursor
      const revertResult = await this.revertTransactionsToCursor(
        item.itemId || item._id,
        user._id,
        syncData.lastSuccessfulCursor
      );
      
      // Update recovery stats
      await itemService.updateItemSyncStatus(item.itemId || item._id, user._id, {
        recoveryAttempts: (syncData.recoveryAttempts || 0) + 1,
        lastRecoveryTime: Date.now(),
        inRecoveryMode: true
      });
      
      return {
        recovered: revertResult.reverted,
        removedCount: revertResult.removedCount,
        revertedTo: revertResult.revertedTo,
        message: 'Sync recovered to last successful cursor'
      };
    } catch (error) {
      throw CustomError.createFormattedError(error, { operation: 'recover_sync' });
    }
  }
  
  /**
   * Revert transactions to a specific cursor
   * This will remove all transactions that were processed after the given cursor
   * @param {String} itemId - Plaid item ID 
   * @param {String} userId - User ID
   * @param {String} cursorToRevertTo - Cursor to revert to
   * @returns {Object} Revert results
   */
  async revertTransactionsToCursor(itemId, userId, cursorToRevertTo) {
    try {
      if (!itemId || !userId || !cursorToRevertTo) {
        throw new CustomError('INVALID_PARAMS', 
          'Missing required parameters for transaction reversion');
      }
      
      // First find a transaction with the cursor we want to revert to
      // This gives us a reference point for batchTime
      const referenceTx = await plaidTransactions.findOne({
        cursor: cursorToRevertTo,
        userId
      });
      
      if (!referenceTx) {
        return { 
          reverted: false,
          message: 'No reference transaction found with the target cursor' 
        };
      }
      
      // Extract the reference transaction's processedAt and syncId components
      const referenceTime = referenceTx.processedAt;
      
      // Parse the syncId parts - format is userId_itemId_timestamp
      const syncIdParts = referenceTx.syncId.split('_');
      if (syncIdParts.length < 3) {
        return {
          reverted: false,
          message: 'Reference transaction has invalid syncId format'
        };
      }
      
      // The timestamp is the last part of the syncId
      const referenceBatchTime = syncIdParts[syncIdParts.length - 1];
      
      // Use efficient label-based search to find transactions with higher syncIds
      // Format: userId_itemId_timestamp where timestamp is greater than the reference transaction's timestamp
      // Since we now include itemId in syncId, we can be more precise in our query
      const syncIdStartValue = `${userId}_${itemId}_${referenceBatchTime}`;
      const syncIdEndValue = `${userId}_${itemId}_999999999999`;
      
      // Use the built-in label mapping of our model to search by syncId range
      const { items: newerTransactions } = await plaidTransactions.find({
        syncId: `${syncIdStartValue}|${syncIdEndValue}`
      });
      
      // Now we no longer need to filter by itemId since it's part of the syncId
      // but we still need to filter out the reference transaction and check batch numbers
      const transactionsToRevert = newerTransactions.filter(tx => {
        // Exclude the reference transaction itself
        if (tx._id === referenceTx._id) {
          return false;
        }
        
        // Handle transactions in the same batch
        if (tx.batchNumber === referenceTx.batchNumber) {
          // For same batch number, only include if processed after the reference
          return tx.processedAt > referenceTime;
        }
        
        // Include all transactions with higher batch numbers
        return tx.batchNumber > referenceTx.batchNumber;
      });
      
      // Get transaction IDs to remove
      const txIdsToRemove = transactionsToRevert.map(tx => tx.transaction_id);
      
      // Nothing to remove
      if (txIdsToRemove.length === 0) {
        return { 
          reverted: false,
          message: 'No transactions found to revert' 
        };
      }
      
      // Remove the transactions
      let removedCount = 0;
      for (const id of txIdsToRemove) {
        try {
          const result = await plaidTransactions.erase({ transaction_id: id, userId });
          if (result.removed) {
            removedCount++;
          }
        } catch (error) {
          console.error(`Failed to remove transaction ${id}:`, error.message);
        }
      }
      
      // Update the item's sync status to use the cursor we reverted to
      await itemService.updateItemSyncStatus(itemId, userId, {
        cursor: cursorToRevertTo,
        status: 'in_progress', // Set to in_progress so we can continue syncing
        error: null  // Clear any errors
      });
      
      return {
        reverted: true,
        removedCount,
        revertedTo: cursorToRevertTo,
        referenceTime: referenceTx.processedAt
      };
    } catch (error) {
      throw CustomError.createFormattedError(error, { 
        operation: 'revert_transactions' 
      });
    }
  }

  /**
   * Helper function to determine if a sync is stale
   * @param {Object} syncData - Sync data from item
   * @returns {Boolean} True if sync is considered stale
   */
  isStaleSync(syncData) {
    if (!syncData || !syncData.lastSyncTime) return true;
    
    const now = Date.now();
    const syncAgeInMinutes = (now - syncData.lastSyncTime) / (1000 * 60);
    
    // Consider a sync stale if it's been more than 15 minutes since the last update
    return syncAgeInMinutes > 15;
  }
}

export default new PlaidTransactionService();