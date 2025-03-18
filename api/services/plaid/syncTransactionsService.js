import plaidService from './plaidService.js';
import itemService from './itemService.js';
import plaidItems from '../../models/plaidItems.js';
import { CustomError } from './customError.js';
import transactionRecoveryService from './transactionRecoveryService.js';
import syncSessionService from './syncSessionService.js';
import transactionsCrudService from './transactionsCrudService.js';

/**
 * Service responsible for syncing transactions from Plaid
 * Implements a robust transaction sync process with recovery capabilities
 */
class TransactionSyncService {
  /**
   * Syncs the latest transactions for an item
   * @param {Object|string} item - Item object or item ID
   * @param {Object} user - User object
   * @returns {Promise<Object>} Sync results
   */
  async syncTransactions(item, user) {
    // 1. Sync initialization - Validate user data
    if (!user || !user._id) {
      throw new CustomError('INVALID_USER', 'Missing required user data');
    }

    try {
      // 1. Sync initialization - Acquire sync lock on plaid item
      const itemData = await this._getAndLockItem(item, user);
      
      // 2. Previous sync session handling
      let prevSyncSession = await syncSessionService.getSyncSession(itemData?.sync_id, user);

      const hasLegacySyncData = !prevSyncSession && itemData.syncData && itemData.syncData.cursor;
      
      // Check for legacy syncData stored directly on the item
      if (hasLegacySyncData) {        
        try {
          console.log(`Legacy syncData found for item ${itemData.itemId}, migrating...`);
          
          // Create a sync session from the legacy data
          const migratedSession = await syncSessionService.createSyncSessionFromLegacy(
            user,
            itemData
          );
          
          if (migratedSession && migratedSession._id) {
            prevSyncSession = migratedSession;
            
            console.log(`Successfully migrated legacy syncData for item ${itemData.itemId}`);
          }
        } catch (migrationError) {
          console.error(`Error migrating legacy syncData: ${migrationError.message}`);
          // Continue without the migrated session
        }
      }
      
      // ------
      // 3. Determine if recovery is needed and perform if necessary
      // ------
      if (syncSessionService.isRecoveryNeeded(itemData, prevSyncSession)) {
        // 3. Recovery process - Handle recovery using previous sync session
        const recoveryInfo = await this._recoverFromFailedSync(itemData, prevSyncSession, user);
        
        // Always build and return a recovery response, regardless of recovery success
        const recoveryResponse = this._buildRecoveryResponse(recoveryInfo);
        return recoveryResponse;
      }
      
      // 4. Check for changes from Plaid before creating a new sync session
      const cursor = prevSyncSession?.nextCursor || null;
      const plaidData = await this._fetchTransactionsFromPlaid(itemData, user, cursor);
      const hasChanges = this._checkForChanges(plaidData);ππ
      
      // If no changes and we have a previous session, update lastNoChangesTime and return early
      if (!hasChanges && prevSyncSession) {
        return await this._handleNoChangesCase(prevSyncSession, itemData, user, plaidData);
      }
      
      // 5. Create a new sync session for normal sync flow
      const { syncSession, syncTime } = await this._createSyncSession(prevSyncSession, user, itemData, plaidData);
      const batchNumber = syncSession.batchNumber || 1;

      if (!syncSession) {
        throw new CustomError('SYNC_SESSION_CREATION_FAILED', 'Failed to create sync session');
      }

      // 6. Process transaction data
      const syncResult = await this._processSyncData(itemData, user, cursor, syncTime, plaidData);
      
      // 7. Sync session update
      await this._updateSyncSession(syncSession, syncResult, prevSyncSession);
      
      // 8. Item update
      await this._updateItemAfterSync(itemData, syncResult, syncSession._id);
      
      // 9. Post-processing - Build response
      const response = this._buildSyncResponse(syncResult, syncTime, batchNumber);
      
      return response;
    } catch (error) {
      // Handle any errors during the process
      await this._handleSyncError(error, item, user);
      throw error; // Re-throw to be handled by the caller
    }
  }

  /**
   * Check for changes from Plaid before deciding to create a new sync session
   * @param {Object} item - Item data
   * @param {Object} user - User object
   * @param {String} cursor - Current cursor
   * @returns {Promise<Object>} Plaid data and whether changes exist
   * @private
   */
  async _fetchTransactionsFromPlaid(item, user, cursor) {
    const accessToken = itemService.decryptAccessToken(item, user);
    
    // Pre-fetch data from Plaid to check for changes
    const plaidData = await plaidService.syncLatestTransactionsFromPlaid(
      accessToken,
      cursor,
      null // No start date filter
    );
    
    return plaidData;
  }

  /**
   * Check for changes from Plaid before deciding to create a new sync session
   * @param {Object} plaidData - Plaid data
   * @returns {Boolean} True if changes exist, false otherwise
   */
  _checkForChanges(plaidData) {    
    // Check if there are any changes (added, modified, or removed transactions)
    const hasChanges = (plaidData.added?.length > 0 || 
                        plaidData.modified?.length > 0 || 
                        plaidData.removed?.length > 0);
    
    return hasChanges;
  }

  /**
   * Handle the case when no changes are detected from Plaid
   * @param {Object} prevSyncSession - Previous sync session
   * @param {Object} item - Item data
   * @param {Object} user - User object 
   * @param {Object} plaidData - Data retrieved from Plaid
   * @returns {Promise<Object>} Response object
   * @private
   */
  async _handleNoChangesCase(prevSyncSession, item, user, plaidData) {
    const now = Date.now();
    
    // Update the previous session with lastNoChangesTime
    await syncSessionService.updateSyncSessionLastNoChangesTime(
      prevSyncSession._id,
      now
    );
    
    // Release the sync lock
    await plaidItems.update(
      { itemId: item.itemId, userId: user._id },
      { status: 'complete' } // Set status back to complete
    );
    
    // Return response indicating no changes
    return {
      added: 0,
      modified: 0,
      removed: 0,
      hasMore: plaidData.has_more,
      cursor: plaidData.next_cursor,
      noChanges: true,
      lastSyncTime: prevSyncSession.syncTime,
      lastNoChangesTime: now
    };
  }

  /**
   * Process transaction sync data from Plaid
   * @param {Object} item - Item data
   * @param {Object} user - User object 
   * @param {String} cursor - Transaction cursor
   * @param {Number} syncTime - Current sync timestamp
   * @param {Object} plaidData - Pre-fetched data from Plaid
   * @returns {Promise<Object>} Processing results
   * @private
   */
  async _processSyncData(item, user, cursor, syncTime, plaidData) {    
    // Validate plaidData was provided
    if (!plaidData) {
      throw new CustomError('INVALID_PARAMS', 'Missing plaidData for transaction processing');
    }
    
    // Use the expected counts directly from plaidData
    const expectedCounts = {
      added: plaidData.added?.length || 0,
      modified: plaidData.modified?.length || 0,
      removed: plaidData.removed?.length || 0
    };
    
    // Use the current cursor for transaction processing to correctly track which sync operation
    // was responsible for this transaction. Important for recovery and auditing.
    const currentCursor = cursor || 'initial_sync';
    
    // Initialize actual counts
    const actualCounts = {
      added: 0,
      modified: 0,
      removed: 0
    };
    
    // Process transactions in parallel with transaction safety
    const [addedCount, modifiedCount, removedCount] = await Promise.all([
      this._processAddedTransactions(plaidData.added, item, user, currentCursor, syncTime),
      this._processModifiedTransactions(plaidData.modified, user, currentCursor, syncTime),
      this._processRemovedTransactions(plaidData.removed, user._id)
    ]);
    
    // Update actual counts
    actualCounts.added = addedCount || 0;
    actualCounts.modified = modifiedCount || 0;
    actualCounts.removed = removedCount || 0;
    
    const syncCounts = {
      expected: expectedCounts,
      actual: actualCounts
    };
    
    return {
      addedCount: actualCounts.added,
      addedTransactions: addedCount === expectedCounts.added ?
        plaidData.added 
        : [],
      modifiedCount: actualCounts.modified,
      removedCount: actualCounts.removed,
      hasMore: plaidData.has_more,
      cursor: cursor,
      nextCursor: plaidData.next_cursor,
      expectedCounts,
      actualCounts,
      syncCounts
    };
  }

  /**
   * Creates a new sync session or updates existing one if mid-sync
   * @param {Object} prevSyncSession - Previous sync session if any
   * @param {Object} user - User object
   * @param {Object} itemData - Item data
   * @param {Object} plaidData - Plaid data
   * @returns {Promise<Object>} New or updated sync session and syncTime
   * @private
   */
  async _createSyncSession(prevSyncSession, user, itemData, plaidData) {
    // Check if this is a continuation of a multi-batch sync
    let batchNumber = 1;
    let syncId = null;
    
    if (prevSyncSession) {
      // If previous sync had more data, increment the batch number
      if (prevSyncSession.hasMore === true) {
        batchNumber = (prevSyncSession.batchNumber || 1) + 1;
        syncId = prevSyncSession.syncId; // Continue with same syncId
      }
    }

    // Create initial sync session before processing
    const syncData = await syncSessionService.createNewSyncSession(
      prevSyncSession, 
      user, 
      itemData, 
      {
        batchNumber, 
        syncId
      },
      plaidData
    );

    return syncData;
  }

  /**
   * Updates the sync session with results from processing
   * @param {Object} syncSession - Current sync session
   * @param {Object} syncResult - Results from processing
   * @param {Object} prevSyncSession - Previous sync session if any
   * @returns {Promise<void>}
   * @private
   */
  async _updateSyncSession(syncSession, syncResult, prevSyncSession) {
    // Determine status based on results
    let status = 'complete';
    
    // If counts don't match, mark as error regardless of hasMore
    if (!syncSessionService.countsMatch(syncResult.syncCounts)) {
      status = 'error';
    }
    
    // Update the sync session
    await syncSessionService.updateSyncSessionAfterProcessing(
      syncSession, 
      syncResult, 
      prevSyncSession,
      status
    );
  }

  /**
   * Gets and locks an item for sync
   * @param {Object|String} item - Item object or ID
   * @param {Object} user - User object
   * @returns {Promise<Object>} Validated item data
   * @private
   */
  async _getAndLockItem(item, user) {
    const itemData = await itemService.validateAndGetItem(item, user);
    
    if (!itemData) {
      throw new CustomError('ITEM_NOT_FOUND', 'Item not found');
    }
    
    // Check for existing sync in progress by looking at item status
    if (itemData.status === 'in_progress' && await syncSessionService.isSyncRecent(itemData)) {
      throw new CustomError('SYNC_IN_PROGRESS', 'A sync is already in progress for this item');
    }
    
    // Set status to in_progress to acquire lock
    await plaidItems.update(itemData._id, { status: 'in_progress' });
    
    return itemData;
  }

  /**
   * Process and save added transactions
   * @param {Array} transactions - Transactions to add
   * @param {Object} item - Item data
   * @param {Object} user - User object
   * @param {String} cursor - Current cursor
   * @param {Number} syncTime - Current sync syncTime timestamp
   * @returns {Promise<Number>} Count of added transactions
   * @private
   */
  async _processAddedTransactions(transactions, item, user, cursor, syncTime) {
    try {
      const addedCount = await transactionsCrudService.batchCreateTransactions(
        transactions,
        user,
        {
          itemId: item.itemId,
          cursor: cursor,
          syncTime
        }
      );
      
      return addedCount;
    } catch (error) {
      console.error('Error processing added transactions:', error);
      throw new CustomError('TRANSACTION_SAVE_ERROR', 
        `Failed to save ${transactions?.length} transactions: ${error.message}`);
    }
  }

  /**
   * Process and update modified transactions
   * @param {Array} transactions - Transactions to modify
   * @param {Object} user - User object
   * @param {String} cursor - Current cursor
   * @param {Number} syncTime - Current sync syncTime timestamp
   * @returns {Promise<Number>} Count of modified transactions
   * @private
   */
  async _processModifiedTransactions(transactions, user, cursor, syncTime) {
    try {
      return await transactionsCrudService.batchUpdateTransactions(
        transactions,
        user,
        {
          cursor: cursor,
          syncTime
        }
      );
    } catch (error) {
      console.error('Error processing modified transactions:', error);
      console.error('TRANSACTION_UPDATE_ERROR', 
        `Failed to update ${transactions?.length} transactions: ${error.message}`);
    }
  }

  /**
   * Process and remove deleted transactions
   * @param {Array} transactionIds - IDs of transactions to remove
   * @param {String} userId - User ID
   * @returns {Promise<Number>} Count of removed transactions
   * @private
   */
  async _processRemovedTransactions(transactionsToRemove, userId) {
    try {
      const transactionIds = transactionsToRemove.map(tx => tx.transaction_id);
      return await transactionsCrudService.batchRemoveTransactions(
        transactionIds,
        userId,
      );
    } catch (error) {
      console.error('Error processing removed transactions:', error);
      throw new CustomError('TRANSACTION_REMOVE_ERROR', 
        `Failed to remove ${transactionIds?.length} transactions: ${error.message}`);
    }
  }

  /**
   * Update item status after sync
   * @param {Object} item - Item data
   * @param {Object} syncResult - Results from processing
   * @param {Object} user - User object
   * @returns {Promise<void>}
   * @private
   */
  async _updateItemAfterSync(item, syncResult, sync_id) {
    const countsMatch = syncSessionService.countsMatch(syncResult.syncCounts);
    
    // Determine item status based on sync result
    const status = !countsMatch ?
      'error' 
      :'complete';
    
    // Create update object
    const updateData = { 
      status
    };
    
    // Only session_id if counts match
    if (countsMatch) {
      updateData.sync_id = sync_id;
    }
    
    // Update the item with the new status and stats
    await plaidItems.update(item._id,
      updateData
    );
  }

  /**
   * Recover from a failed sync using transactionRecoveryService
   * @param {Object} item - Item data
   * @param {Object} syncSession - Sync session data
   * @param {Object} user - User object
   * @returns {Promise<Object>} Recovery results
   * @private
   */
  async _recoverFromFailedSync(item, failedSyncSession, user) {
    try {
      console.log(`Starting recovery for item ${item.itemId}, user ${user._id}`);
      
      // Use the recovery service to handle the reversion
      const recoveryResult = await transactionRecoveryService.recoverFailedSync(
        item, 
        failedSyncSession, 
        user
      );
      
      if (!recoveryResult.isRecovered) {
        console.warn(`Recovery failed for item ${item.itemId}: ${recoveryResult.message}`);
        throw new CustomError('RECOVERY_FAILED', 
          `Unable to recover from previous sync error: ${recoveryResult.message}`);
      }
      
      // Update the recovery stats in the sync session
      await syncSessionService.updateSyncRecoveryStats(failedSyncSession, 'success');
      
      return recoveryResult;
    } catch (error) {
      // Update the recovery status in the sync session if possible
      await syncSessionService.updateSyncRecoveryStats(
        failedSyncSession,
        'failed',
        error.message || 'Unknown error during recovery'
      );
      
      console.error(`Recovery error for item ${item.itemId}:`, error);
      throw error;
    }
  }

  /**
   * Updates item status to error
   * @param {String} itemId - Item ID
   * @param {String} userId - User ID
   * @param {Error} error - Error object
   * @returns {Promise<void>}
   * @private
   */
  async _updateItemErrorStatus(itemId, userId, error) {
    // Update the item status to error
    await plaidItems.update(
      { itemId, userId },
      { status: 'error' }
    );
  }

  /**
   * Format error with context
   * @param {Error} error - Original error
   * @param {Object} item - Item data
   * @param {Object} user - User object
   * @returns {Error} Formatted error
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
   * Handles errors in the sync process
   * @param {Error} error - Original error
   * @param {Object|String} item - Item data or ID
   * @param {Object} user - User object
   * @returns {Promise<void>}
   * @private
   */
  async _handleSyncError(error, item, user) {
    // Format the error with context
    const formattedError = this._formatError(error, item, user);
    
    // Update item status to error if possible
    if (typeof item === 'object' && item?.itemId) {
      await this._updateItemErrorStatus(item.itemId, user._id, formattedError);
    }
    
    return formattedError;
  }
  
  /**
   * Builds a recovery response object
   * @param {Object} recoveryInfo - Recovery information 
   * @returns {Object} Formatted recovery response
   * @private
   */
  _buildRecoveryResponse(recoveryInfo) {
    return {
      recovery: {
        performed: true,
        removedTransactions: recoveryInfo.removedCount,
        removedCount: recoveryInfo.removedCount,
        revertedTo: recoveryInfo.revertedTo
      },
      hasMore: true,
      message: 'Recovery completed successfully. Transactions will be resynced on next sync operation.',
      batchResults: {
        added: 0,
        modified: 0,
        removed: 0
      }
    };
  }

  /**
   * Builds a response object with sync results
   * @param {Object} syncResult - Results from processing
   * @param {Number} syncTime - Current sync timestamp
   * @param {Number} batchNumber - Batch number for this sync
   * @returns {Object} Formatted response
   * @private
   */
  _buildSyncResponse(syncResult, syncTime, batchNumber) {
    const response = {
      added: syncResult.addedCount,
      addedTransactions: syncResult.addedTransactions,
      modified: syncResult.modifiedCount,
      removed: syncResult.removedCount,
      hasMore: syncResult.hasMore,
      cursor: syncResult.cursor,
      nextCursor: syncResult.nextCursor,
      syncTime,
      batchNumber,
      noChanges: syncResult.addedCount === 0 && syncResult.modifiedCount === 0 && syncResult.removedCount === 0,
      countValidation: {
        expected: syncResult.expectedCounts,
        actual: syncResult.actualCounts,
        countsMatch: syncSessionService.countsMatch(syncResult.syncCounts)
      }
    };
    
    // Add error information if counts don't match
    if (!syncSessionService.countsMatch(syncResult.syncCounts)) {
      response.error = {
        code: 'COUNT_MISMATCH',
        message: `Transaction count mismatch detected. This will trigger recovery on next sync.`
      };
    }
    
    return response;
  }
}

export default new TransactionSyncService(); 