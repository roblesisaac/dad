import PlaidBaseService from './baseService.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import itemService from './itemService.js';
import plaidService from './plaidService.js';
import { CustomError } from './customError.js';

/**
 * Service responsible for synchronizing Plaid transactions
 * Handles batch-wise syncing process and related operations
 */
class TransactionSyncService extends PlaidBaseService {
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
      
      // If this is a new sync (no cursor), initialize it
      if (!syncData?.cursor) {
        return await this._initializeBatchSync(validatedItem, user);
      }
      
      // Process the next batch
      return await this._processBatchInternal(validatedItem, user);
    } catch (error) {
      // Always ensure we're capturing and handling errors properly
      const formattedError = CustomError.createFormattedError(error, { 
        operation: 'sync_next_batch',
        itemId: item?.itemId || item?._id || item,
        userId: user?._id
      });
      
      // Update item sync status to error
      if (typeof item === 'object' && item?.itemId) {
        await itemService.updateItemSyncStatus(item.itemId, user._id, {
          status: 'error',
          errorCode: formattedError.code,
          errorMessage: formattedError.message
        });
      }
      
      throw formattedError;
    }
  }

  /**
   * Initializes a new batch sync process
   * @private
   */
  async _initializeBatchSync(item, user) {
    // Initialize a new sync process - get fresh data from Plaid
    // This happens when there's no cursor
    const now = new Date().toISOString();
    const syncVersion = Date.now();
    const batchNumber = 1;
    
    try {
      // Initialize sync status on the item
      await itemService.updateItemSyncStatus(item.itemId, user._id, {
        status: 'in_progress',
        batchNumber,
        syncVersion,
        startedAt: now,
        cursor: null,
        error: null
      });
      console.log(item.accessToken);
      // Get initial transactions from Plaid
      const result = await plaidService.syncLatestTransactionsFromPlaid(
        item.accessToken,
        null,  // no cursor for initial sync
        null   // no start date filter
      );
      
      if (!result || !result.added) {
        throw new CustomError('INVALID_RESPONSE', 'Invalid response from Plaid');
      }
      
      // Process the initial batch data
      const processResult = await this._processBatchData(
        result, 
        item, 
        user, 
        syncVersion, 
        batchNumber
      );
      
      // Update sync status with cursor and completion status
      await itemService.updateItemSyncStatus(item.itemId, user._id, {
        cursor: result.next_cursor,
        hasMore: result.has_more,
        lastSuccessfulCursor: result.next_cursor, // Track our successful cursor
        lastSuccessfulSync: now,
        status: result.has_more ? 'in_progress' : 'complete',
        completedAt: !result.has_more ? now : null,
        updatedAt: now
      });
      
      return {
        batchNumber,
        syncVersion,
        added: (processResult.added || []).length,
        modified: (processResult.modified || []).length,
        removed: (processResult.removed || []).length,
        hasMore: result.has_more,
        cursor: result.next_cursor
      };
    } catch (error) {
      const formattedError = CustomError.createFormattedError(error, { 
        operation: 'initialize_batch_sync' 
      });
      
      // Update item sync status to error
      await itemService.updateItemSyncStatus(item.itemId, user._id, {
        status: 'error',
        errorCode: formattedError.code,
        errorMessage: formattedError.message
      });
      
      throw formattedError;
    }
  }

  /**
   * Processes the next batch of transactions
   * @private
   */
  async _processBatchInternal(item, user) {
    // Process the next batch using the existing cursor
    const { syncData } = item;
    
    // Validate sync state
    if (!syncData || !syncData.cursor) {
      throw new CustomError('INVALID_SYNC_STATE', 'Missing cursor for continued sync');
    }
    
    if (syncData.status !== 'in_progress' && syncData.status !== 'error') {
      throw new CustomError('INVALID_SYNC_STATE', `Cannot continue sync with status: ${syncData.status}`);
    }
    
    // Get current batch info
    const now = new Date().toISOString();
    const syncVersion = syncData.syncVersion || Date.now();
    const batchNumber = (syncData.batchNumber || 0) + 1;
    
    try {
      // Check if the sync might be stale
      if (this.isStaleSync(syncData)) {
        // If it's stale, restart the sync
        return await this._initializeBatchSync(item, user);
      }
      
      // Update status to in_progress (in case recovering from error)
      await itemService.updateItemSyncStatus(item.itemId, user._id, {
        status: 'in_progress',
        batchNumber,
        updatedAt: now
      });
      
      // Get next batch of transactions from Plaid
      const result = await plaidService.syncLatestTransactionsFromPlaid(
        item.accessToken,
        syncData.cursor,
        null  // no start date filter for continuing sync
      );
      
      if (!result) {
        throw new CustomError('INVALID_RESPONSE', 'Invalid response from Plaid');
      }
      
      // Process the batch data
      const processResult = await this._processBatchData(
        result, 
        item, 
        user, 
        syncVersion, 
        batchNumber
      );
      
      // Update sync status with new cursor and completion status
      await itemService.updateItemSyncStatus(item.itemId, user._id, {
        cursor: result.next_cursor,
        hasMore: result.has_more,
        lastSuccessfulCursor: result.next_cursor, // Track our successful cursor
        lastSuccessfulSync: now,
        status: result.has_more ? 'in_progress' : 'complete',
        completedAt: !result.has_more ? now : null,
        updatedAt: now
      });
      
      return {
        batchNumber,
        syncVersion,
        added: (processResult.added || []).length,
        modified: (processResult.modified || []).length,
        removed: (processResult.removed || []).length,
        hasMore: result.has_more,
        cursor: result.next_cursor
      };
    } catch (error) {
      const formattedError = CustomError.createFormattedError(error, { 
        operation: 'process_batch' 
      });
      
      // Update item sync status to error
      await itemService.updateItemSyncStatus(item.itemId, user._id, {
        status: 'error',
        errorCode: formattedError.code,
        errorMessage: formattedError.message
      });
      
      throw formattedError;
    }
  }

  /**
   * Processes batch data from Plaid
   * @private
   */
  async _processBatchData(batch, item, user, syncVersion, batchNumber) {
    const now = new Date().toISOString();
    const batchTime = Date.now(); // Used for syncId generation
    
    const { added = [], modified = [], removed = [], next_cursor } = batch;
    
    // Set up processing context to pass to transaction processors
    const processingContext = {
      itemId: item.itemId,
      userId: user._id,
      syncVersion,
      batchNumber,
      batchTime,
      processedAt: now,
      cursor: next_cursor
    };
    
    // Process in parallel with individual error handling
    const [addedResult, modifiedResult, removedResult] = await Promise.all([
      // Process new transactions
      this._processAddedTransactions(added, processingContext),
      
      // Process modified transactions
      this._processModifiedTransactions(modified, processingContext),
      
      // Process removed transactions
      this._processRemovedTransactions(removed)
    ]);
    
    return {
      added: addedResult,
      modified: modifiedResult,
      removed: removedResult
    };
  }

  /**
   * Process added transactions from a batch
   * @private
   */
  async _processAddedTransactions(transactions, context) {
    if (!transactions || !transactions.length) {
      return [];
    }
    
    try {
      return await this._saveNewTransactions(
        transactions, 
        context.itemId, 
        context.userId, 
        context.syncVersion, 
        context.batchNumber,
        context.batchTime,
        context.processedAt,
        context.cursor
      );
    } catch (error) {
      console.error('Error processing added transactions:', error);
      return [];
    }
  }

  /**
   * Process modified transactions from a batch
   * @private
   */
  async _processModifiedTransactions(transactions, context) {
    if (!transactions || !transactions.length) {
      return [];
    }
    
    try {
      return await this._updateModifiedTransactions(
        transactions, 
        context.itemId, 
        context.userId, 
        context.syncVersion, 
        context.batchNumber, 
        context.batchTime,
        context.processedAt,
        context.cursor
      );
    } catch (error) {
      console.error('Error processing modified transactions:', error);
      return [];
    }
  }

  /**
   * Process removed transactions from a batch
   * @private
   */
  async _processRemovedTransactions(transactionIds) {
    if (!transactionIds || !transactionIds.length) {
      return [];
    }
    
    try {
      await this._removeTransactions(transactionIds);
      return transactionIds;
    } catch (error) {
      console.error('Error processing removed transactions:', error);
      return [];
    }
  }

  /**
   * Saves new transactions to the database
   * @private
   */
  async _saveNewTransactions(transactions, itemId, userId, syncVersion, batchNumber, batchTime, processedAt, cursor) {
    // Don't process empty transactions
    if (!transactions || !transactions.length) {
      return [];
    }
    
    const formattedTransactions = transactions.map(transaction => {
      // Format transaction data for storage
      return {
        ...transaction,
        userId,
        syncVersion,
        batchNumber,
        processedAt,
        cursor,
        // Additional context is handled by model setter
        user: { _id: userId },
        itemId,
        batchTime
      };
    });
    
    try {
      // Save transactions in batches for better performance
      const results = await plaidTransactions.batchCreate(formattedTransactions);
      return results;
    } catch (error) {
      console.error(`Error saving new transactions: ${error.message}`);
      throw new CustomError('TRANSACTION_SAVE_ERROR', error.message);
    }
  }

  /**
   * Updates modified transactions in the database
   * @private
   */
  async _updateModifiedTransactions(transactions, itemId, userId, syncVersion, batchNumber, batchTime, processedAt, cursor) {
    // Don't process empty transactions
    if (!transactions || !transactions.length) {
      return [];
    }
    
    // Update transactions one by one
    const updated = [];
    
    for (const transaction of transactions) {
      try {
        // Find the existing transaction
        const existingTx = await plaidTransactions.findOne({
          transaction_id: transaction.transaction_id,
          userId
        });
        
        if (!existingTx) {
          // If transaction doesn't exist, save it as new
          const newTx = {
            ...transaction,
            userId,
            syncVersion,
            batchNumber,
            processedAt,
            cursor,
            // Additional context is handled by model setter
            user: { _id: userId },
            itemId,
            batchTime
          };
          
          const savedTx = await plaidTransactions.create(newTx);
          updated.push(savedTx);
          continue;
        }
        
        // Update existing transaction
        const updatedTx = {
          ...transaction,
          syncVersion,
          batchNumber,
          processedAt,
          cursor,
          // Additional context is handled by model setter
          user: { _id: userId },
          itemId,
          batchTime
        };
        
        const updateResult = await plaidTransactions.update({
          transaction_id: transaction.transaction_id,
          userId
        }, updatedTx);
        
        updated.push(updateResult);
      } catch (error) {
        console.error(`Error updating transaction ${transaction.transaction_id}: ${error.message}`);
      }
    }
    
    return updated;
  }

  /**
   * Removes transactions from the database
   * @private
   */
  async _removeTransactions(transactionIds) {
    if (!transactionIds || !transactionIds.length) {
      return 0;
    }
    
    let removedCount = 0;
    
    for (const id of transactionIds) {
      try {
        const result = await plaidTransactions.erase({ transaction_id: id });
        if (result && result.removed) {
          removedCount++;
        }
      } catch (error) {
        console.error(`Failed to remove transaction ${id}: ${error.message}`);
      }
    }
    
    return removedCount;
  }

  /**
   * Validates item data and retrieves it if needed
   * @private
   */
  async _validateAndGetItem(item, user) {
    // If item is a string (ID), fetch the actual item
    if (typeof item === 'string') {
      const fetchedItem = await itemService.getItem(item, user._id);
      if (!fetchedItem) {
        throw new CustomError('ITEM_NOT_FOUND', 'Item not found');
      }
      return fetchedItem;
    }
    
    // If item is an object, ensure it has required fields
    if (typeof item === 'object' && item !== null) {
      if (!item.itemId && !item._id) {
        throw new CustomError('INVALID_ITEM', 'Item is missing ID');
      }
      
      if (!item.accessToken) {
        // If no access token, fetch the full item
        const fetchedItem = await itemService.getItem(item.itemId || item._id, user._id);
        if (!fetchedItem) {
          throw new CustomError('ITEM_NOT_FOUND', 'Item not found');
        }
        return fetchedItem;
      }
      
      return item;
    }
    
    throw new CustomError('INVALID_ITEM', 'Invalid item data type');
  }

  /**
   * Helper function to determine if a sync is stale
   * @param {Object} syncData - Sync data from item
   * @returns {Boolean} True if sync is considered stale
   */
  isStaleSync(syncData) {
    if (!syncData || !syncData.updatedAt) {
      return true;
    }
    
    // Consider a sync stale if it hasn't been updated in 24 hours
    const lastUpdateTime = new Date(syncData.updatedAt).getTime();
    const currentTime = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    return (currentTime - lastUpdateTime) > oneDay;
  }
}

export default new TransactionSyncService(); 