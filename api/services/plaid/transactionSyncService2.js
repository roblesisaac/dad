import plaidService from './plaidService.js';
import itemService from './itemService.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import { CustomError } from './customError.js';
import transactionRecoveryService from './transactionRecoveryService.js';

class TransactionSyncService {
  /**
   * Syncs the latest transactions for an item
   * @param {Object|string} item - Item object or item ID
   * @param {Object} user - User object
   * @returns {Promise<Object>} Sync results
   */
  async syncTransactions(item, user) {
    if (!user || !user._id) {
      throw new CustomError('INVALID_USER', 'Missing required user data');
    }

    try {
      // Acquire sync lock to prevent concurrent syncs
      const itemData = await this._getAndLockItem(item, user);
      
      // Track if recovery was performed
      let recoveryInfo = null;
      
      // Check if recovery is needed from a previous failed sync
      if (await this._isRecoveryNeeded(itemData)) {
        recoveryInfo = await this._recoverFromFailedSync(itemData, user);
      }
      
      // Get cursor or start a new sync
      const cursor = itemData.syncData?.cursor;
      
      // Process transactions
      const syncResult = await this._processSyncData(itemData, user, cursor);
      
      // Release lock and update item with new cursor
      await this._updateItemAfterSync(itemData, syncResult, user);
      
      // Build response with recovery info if applicable
      const response = {
        added: syncResult.addedCount,
        modified: syncResult.modifiedCount,
        removed: syncResult.removedCount,
        hasMore: syncResult.hasMore,
        cursor: syncResult.cursor
      };
      
      // Add recovery info if recovery was performed
      if (recoveryInfo) {
        response.recoveryPerformed = true;
        response.revertedTo = recoveryInfo.revertedTo;
        response.recoveryRemovedCount = recoveryInfo.removedCount;
      }
      
      return response;
    } catch (error) {
      // Handle and format errors
      const formattedError = this._formatError(error, item, user);
      
      // Update item status to error if possible
      if (typeof item === 'object' && item?.itemId) {
        await this._updateItemErrorStatus(item.itemId, user._id, formattedError);
      }
      
      throw formattedError;
    }
  }

  /**
   * Gets and locks an item for sync
   * @private
   */
  async _getAndLockItem(item, user) {
    let itemData;
    
    if (typeof item === 'string') {
      // Get item by ID
      itemData = await itemService.getItem(item, user._id);
    } else if (typeof item === 'object' && item !== null) {
      // Use provided item or fetch if missing fields
      if (!item.accessToken) {
        itemData = await itemService.getItem(item.itemId || item._id, user._id);
      } else {
        itemData = item;
      }
    }
    
    if (!itemData) {
      throw new CustomError('ITEM_NOT_FOUND', 'Item not found');
    }
    
    // Check for existing sync in progress (prevent race conditions)
    if (itemData.syncData?.status === 'in_progress' && this._isSyncRecent(itemData.syncData)) {
      throw new CustomError('SYNC_IN_PROGRESS', 'A sync is already in progress for this item');
    }
    
    // Set status to in_progress
    const now = new Date().toISOString();
    await itemService.updateItemSyncStatus(itemData.itemId, user._id, {
      status: 'in_progress',
      lastSyncTime: now, // match plaidItems schema
      syncVersion: Date.now(), // update sync version
      error: null // clear any previous errors
    });
    
    return itemData;
  }

  /**
   * Process transaction sync data from Plaid
   * @private
   */
  async _processSyncData(item, user, cursor) {
    const now = new Date().toISOString();
    
    // Call Plaid to get transactions
    const accessToken = itemService.decryptAccessToken(item, user);
    const plaidData = await plaidService.syncLatestTransactionsFromPlaid(
      accessToken,
      cursor,
      null // No start date filter
    );
    
    if (!plaidData) {
      throw new CustomError('INVALID_RESPONSE', 'Invalid response from Plaid');
    }
    
    // Process transactions in parallel with transaction safety
    const [addedCount, modifiedCount, removedCount] = await Promise.all([
      this._processAddedTransactions(plaidData.added, item, user, now, plaidData.next_cursor),
      this._processModifiedTransactions(plaidData.modified, user, now, plaidData.next_cursor),
      this._processRemovedTransactions(plaidData.removed, user._id)
    ]);
    
    return {
      addedCount: addedCount || 0,
      modifiedCount: modifiedCount || 0,
      removedCount: removedCount || 0,
      hasMore: plaidData.has_more,
      cursor: plaidData.next_cursor
    };
  }

  /**
   * Process and save added transactions
   * @private
   */
  async _processAddedTransactions(transactions, item, user, processedAt, cursor) {
    if (!transactions || !transactions.length) {
      return 0;
    }
    
    try {
      const batchTime = Date.now(); // Add current timestamp for batchTime
      const formattedTransactions = transactions.map(transaction => ({
        ...transaction,
        userId: user._id,
        itemId: item.itemId,
        processedAt,
        cursor,
        user: { _id: user._id },
        batchTime // Add batchTime to ensure unique syncId generation
      }));
      
      // Use insertMany for batch inserts
      const results = await plaidTransactions.insertMany(formattedTransactions);
      return results.length;
    } catch (error) {
      console.error('Error processing added transactions:', error);
      throw new CustomError('TRANSACTION_SAVE_ERROR', 
        `Failed to save ${transactions.length} transactions: ${error.message}`);
    }
  }

  /**
   * Process and update modified transactions
   * @private
   */
  async _processModifiedTransactions(transactions, user, processedAt, cursor) {
    if (!transactions || !transactions.length) {
      return 0;
    }
    
    try {
      // Update each transaction directly
      const batchTime = Date.now(); // Add current timestamp for batchTime
      const updatePromises = transactions.map(transaction => {
        // Build update object
        const updates = { ...transaction };
        
        // Skip _id field if present as it shouldn't be modified
        delete updates._id;
        
        // Add metadata
        updates.processedAt = processedAt;
        updates.cursor = cursor;
        updates.batchTime = batchTime; // Add batchTime to ensure unique syncId generation
        
        // Use update method with filter including userId for security
        return plaidTransactions.update(
          { 
            transaction_id: transaction.transaction_id, 
            userId: user._id 
          }, 
          updates
        );
      });
      
      // Execute updates in parallel
      const results = await Promise.all(updatePromises);
      return results.filter(result => result !== null).length;
    } catch (error) {
      console.error('Error processing modified transactions:', error);
      throw new CustomError('TRANSACTION_UPDATE_ERROR', 
        `Failed to update ${transactions.length} transactions: ${error.message}`);
    }
  }

  /**
   * Process and remove deleted transactions
   * @private
   */
  async _processRemovedTransactions(transactionIds, userId) {
    if (!transactionIds || !transactionIds.length) {
      return 0;
    }
    
    try {
      let deletedCount = 0;
      
      // Process deletions in batches to avoid too many concurrent operations
      const batchSize = 25;
      
      for (let i = 0; i < transactionIds.length; i += batchSize) {
        const batch = transactionIds.slice(i, i + batchSize);
        
        // Process this batch of deletions in parallel
        const deletePromises = batch.map(async (id) => {
          try {
            // Use the correct erase method for deletion
            const result = await plaidTransactions.erase({
              transaction_id: id,
              userId // Include userId to ensure we only delete user's transactions
            });
            
            return result.removed ? 1 : 0;
          } catch (err) {
            console.warn(`Failed to delete transaction ${id}: ${err.message}`);
            return 0;
          }
        });
        
        // Wait for all deletions in this batch
        const results = await Promise.all(deletePromises);
        deletedCount += results.reduce((sum, count) => sum + count, 0);
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error processing removed transactions:', error);
      throw new CustomError('TRANSACTION_REMOVE_ERROR', 
        `Failed to remove transactions: ${error.message}`);
    }
  }

  /**
   * Update item status after sync
   * @private
   */
  async _updateItemAfterSync(item, syncResult, user) {
    const now = new Date().toISOString();
    const status = syncResult.hasMore ? 'in_progress' : 'complete';
    
    // Match the plaidItems model schema for syncData
    const syncDataUpdate = {
      cursor: syncResult.cursor,
      lastSuccessfulCursor: syncResult.cursor,
      lastSuccessfulSyncTime: now,
      lastSyncTime: now,
      status,
      error: null,
      // Update stats
      stats: {
        ...(item.syncData?.stats || {}),
        added: (item.syncData?.stats?.added || 0) + syncResult.addedCount,
        modified: (item.syncData?.stats?.modified || 0) + syncResult.modifiedCount,
        removed: (item.syncData?.stats?.removed || 0) + syncResult.removedCount,
        lastTransactionDate: now
      }
    };
    
    await itemService.updateItemSyncStatus(item.itemId, user._id, syncDataUpdate);
  }

  /**
   * Update item status to error
   * @private
   */
  async _updateItemErrorStatus(itemId, userId, error) {
    const errorUpdate = {
      status: 'error',
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        timestamp: new Date().toISOString()
      }
    };
    
    await itemService.updateItemSyncStatus(itemId, userId, errorUpdate);
  }

  /**
   * Check if a sync is recent (within last 5 minutes)
   * @private
   */
  _isSyncRecent(syncData) {
    if (!syncData || !syncData.lastSyncTime) {
      return false;
    }
    
    const lastUpdateTime = new Date(syncData.lastSyncTime).getTime();
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    return (currentTime - lastUpdateTime) < fiveMinutes;
  }

  /**
   * Format error with context
   * @private
   */
  _formatError(error, item, user) {
    return CustomError.createFormattedError(error, {
      operation: 'sync_transactions',
      itemId: item?.itemId || item?._id || item,
      userId: user?._id
    });
  }

  /**
   * Check if recovery is needed based on item sync status
   * @private
   */
  async _isRecoveryNeeded(item) {
    // Recovery is needed if:
    // 1. The item is in error state
    // 2. We have a lastSuccessfulCursor to revert to
    return item.syncData?.status === 'error' && 
           item.syncData?.lastSuccessfulCursor;
  }

  /**
   * Recover from a failed sync using transactionRecoveryService
   * @private
   */
  async _recoverFromFailedSync(item, user) {
    try {
      console.log(`Starting recovery for item ${item.itemId} with lastSuccessfulCursor: ${item.syncData?.lastSuccessfulCursor}`);
      
      // Use the recovery service to handle the reversion
      const recoveryResult = await transactionRecoveryService.recoverFailedSync(item, user);
      
      if (!recoveryResult.recovered) {
        console.warn(`Recovery failed for item ${item.itemId}: ${recoveryResult.message}`);
        throw new CustomError('RECOVERY_FAILED', 
          `Unable to recover from previous sync error: ${recoveryResult.message}`);
      }
      
      // Log appropriate message based on whether transactions were actually reverted
      if (recoveryResult.removedCount > 0) {
        console.log(`Recovery successful for item ${item.itemId}. Reverted to cursor: ${recoveryResult.revertedTo}, removed ${recoveryResult.removedCount} transactions.`);
      } else {
        console.log(`Recovery completed for item ${item.itemId}. Reverted to cursor: ${recoveryResult.revertedTo}, no transactions needed to be removed.`);
      }
      
      return recoveryResult;
    } catch (error) {
      console.error(`Recovery error for item ${item.itemId}:`, error);
      throw error;
    }
  }
}

export default new TransactionSyncService(); 