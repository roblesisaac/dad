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
        cursor: syncResult.cursor,
        countValidation: {
          expected: syncResult.expectedCounts,
          actual: syncResult.actualCounts,
          countsMatch: syncResult.countsMatch
        }
      };
      
      // Add recovery info if recovery was performed
      if (recoveryInfo) {
        response.recoveryPerformed = true;
        response.revertedTo = recoveryInfo.revertedTo;
        response.recoveryRemovedCount = recoveryInfo.removedCount;
      }
      
      // Add error information if counts don't match
      if (!syncResult.countsMatch) {
        response.error = {
          code: 'COUNT_MISMATCH',
          message: `Transaction count mismatch detected. This will trigger recovery on next sync.`
        };
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
    const itemData = await itemService.validateAndGetItem(item, user);
    
    if (!itemData) {
      throw new CustomError('ITEM_NOT_FOUND', 'Item not found');
    }
    
    // Check for existing sync in progress (prevent race conditions)
    if (itemData.syncData?.status === 'in_progress' && this._isSyncRecent(itemData.syncData)) {
      throw new CustomError('SYNC_IN_PROGRESS', 'A sync is already in progress for this item');
    }
    
    // Set status to in_progress
    const now = new Date().toISOString();
    await itemService.updateItemSyncStatus(
      itemData.itemId, 
      user._id, {
      status: 'in_progress',
      lastSyncTime: now, // match plaidItems schema
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
    
    // Track expected counts from Plaid
    const expectedCounts = {
      added: plaidData.added?.length || 0,
      modified: plaidData.modified?.length || 0,
      removed: plaidData.removed?.length || 0
    };
    
    // Process transactions in parallel with transaction safety
    const [addedCount, modifiedCount, removedCount] = await Promise.all([
      this._processAddedTransactions(plaidData.added, item, user, now, plaidData.next_cursor),
      this._processModifiedTransactions(plaidData.modified, user, now, plaidData.next_cursor),
      this._processRemovedTransactions(plaidData.removed, user._id)
    ]);
    
    // Determine actual counts processed
    const actualCounts = {
      added: addedCount || 0,
      modified: modifiedCount || 0,
      removed: removedCount || 0
    };
    
    // Compare expected vs actual counts
    const countsMatch = 
      expectedCounts.added === actualCounts.added &&
      expectedCounts.modified === actualCounts.modified &&
      expectedCounts.removed === actualCounts.removed;
    
    return {
      addedCount: actualCounts.added,
      modifiedCount: actualCounts.modified,
      removedCount: actualCounts.removed,
      hasMore: plaidData.has_more,
      cursor: plaidData.next_cursor,
      expectedCounts,
      actualCounts,
      countsMatch
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
    let status = syncResult.hasMore ? 'in_progress' : 'complete';
    let error = null;
    
    // Check if counts match
    if (!syncResult.countsMatch) {
      status = 'error';
      error = {
        code: 'COUNT_MISMATCH',
        message: `Transaction count mismatch: Expected (${syncResult.expectedCounts.added} added, ${syncResult.expectedCounts.modified} modified, ${syncResult.expectedCounts.removed} removed) vs Actual (${syncResult.actualCounts.added} added, ${syncResult.actualCounts.modified} modified, ${syncResult.actualCounts.removed} removed)`,
        timestamp: now
      };
      console.error(`[TransactionSync] Count mismatch for item ${item.itemId}: ${error.message}`);
    }
    
    // Match the plaidItems model schema for syncData
    const syncDataUpdate = {
      cursor: syncResult.cursor,
      lastSuccessfulCursor: syncResult.countsMatch ? syncResult.cursor : item.syncData?.lastSuccessfulCursor,
      lastSyncTime: now,
      status,
      error,
      // Track expected vs actual counts for debugging
      lastSyncCounts: {
        expected: syncResult.expectedCounts,
        actual: syncResult.actualCounts,
        countsMatch: syncResult.countsMatch
      },
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
    // No recovery possible without a last successful cursor
    if (!item.syncData?.lastSuccessfulCursor) {
      return false;
    }
    
    // Recovery is needed if:
    // 1. The item is in error state
    if (item.syncData?.status === 'error') {
      return true;
    }
    
    // 2. The last sync had count mismatches
    if (item.syncData?.lastSyncCounts?.countsMatch === false) {
      console.warn(`Recovery needed for item ${item.itemId} due to count mismatch in previous sync`);
      return true;
    }
    
    return false;
  }

  /**
   * Recover from a failed sync using transactionRecoveryService
   * @private
   */
  async _recoverFromFailedSync(item, user) {
    try {
      // Use the recovery service to handle the reversion
      const recoveryResult = await transactionRecoveryService.recoverFailedSync(item, user);
      
      if (!recoveryResult.recovered) {
        console.warn(`Recovery failed for item ${item.itemId}: ${recoveryResult.message}`);
        throw new CustomError('RECOVERY_FAILED', 
          `Unable to recover from previous sync error: ${recoveryResult.message}`);
      }
      
      return recoveryResult;
    } catch (error) {
      console.error(`Recovery error for item ${item.itemId}:`, error);
      throw error;
    }
  }
}

export default new TransactionSyncService(); 