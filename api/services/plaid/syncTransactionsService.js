import plaidService from './plaidService.js';
import itemService from './itemService.js';
import plaidItems from '../../models/plaidItems.js';
import { CustomError } from './customError.js';
import recoveryService from './recoveryService.js';
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
    // Track sync start time for performance measurement
    const syncStartTime = Date.now();
    let transactionsSkipped = [];
    
    // 1. Sync initialization - Validate user data
    if (!user || !user._id) {
      throw new CustomError('INVALID_USER', 'Missing required user data');
    }

    try {
      // 1. Sync initialization - Acquire sync lock on plaid item
      const lockedItem = await this._getAndLockItem(item, user);
      
      // 2. Previous sync session handling - Get the latest sync session
      let currentSyncSession = await syncSessionService.getSyncSession(lockedItem?.sync_id, user);

      // If no current sync session, create a new one
      if(!currentSyncSession) {
        currentSyncSession = await this._createInitialSyncSession(lockedItem, user);
      }
      
      // 3. Determine if recovery is needed and perform if necessary
      if (currentSyncSession?.isRecovery) {
        // 3. Recovery process - Handle recovery using previous sync session
        const recoveryResult = await recoveryService.performReversion( 
          currentSyncSession,
          lockedItem, 
          user
        );

        // Unlock item
        await this._unlockItem(lockedItem.itemId, user._id);
        
        // Always build and return a recovery response, regardless of recovery success
        const recoveryResponse = {
          recovery: {
            performed: true,
            removedCount: recoveryResult.removedCount,
            revertedTo: recoveryResult.revertedTo
          },
          message: 'Recovery completed successfully. Transactions will be resynced on next sync operation.',
          batchResults: {
            added: 0,
            modified: 0,
            removed: 0
          }
        }
        return recoveryResponse;
      }
      
      // 4. Check for changes from Plaid before creating a new sync session
      const cursor = currentSyncSession?.cursor || null;      
      const plaidData = await this._fetchTransactionsFromPlaid(lockedItem, user, cursor);      
      const hasChanges = this._checkForChanges(plaidData);
      
      // If no changes and we have a previous session, update lastNoChangesTime and return early
      if (!hasChanges) {
        return await this._handleNoChangesCase(currentSyncSession, lockedItem, user, plaidData);
      }
      
      // 5. Process transaction data without creating an initial sync session
      const syncTime = Date.now();
      const syncResult = await this._processSyncData(
        lockedItem,
        user, 
        cursor,
        syncTime, 
        plaidData,
        transactionsSkipped
      );
      
      // 6. Create end sync session with results for next sync
      
      // 7. Item update - Only update if there were no errors
      // await this._updateItemAfterSync(lockedItem, syncResult, newSyncSession._id);
      
      // 8. Post-processing - Build response
      const response = this._buildSyncResponse(
        syncResult,
        syncTime,
        1, // No more branching in the new workflow
        transactionsSkipped
      );
      
      return response;
    } catch (error) {
      // Handle any errors during the process
      await this._handleSyncError(error, item, user);
      throw error; // Re-throw to be handled by the caller
    }
  }

  /**
   * Create initial sync session
   * @param {Object} item - Item data
   * @param {Object} user - User object
   * @returns {Promise<Object>} Sync session
   * @private
   */
  async _createInitialSyncSession(item, user) {
    const hasLegacySyncData = item.syncData && item.syncData.cursor;
    if (hasLegacySyncData) { 
      try {
        console.log(`Legacy syncData found for item ${item.itemId}, migrating...`);
        
        // Create a sync session from the legacy data
        const migratedSession = await syncSessionService.createSyncSessionFromLegacy(
          user,
          item
        );
        
        if (migratedSession && migratedSession._id) {          
          return migratedSession;
        }
      } catch (migrationError) {
        console.error(`Error migrating legacy syncData: ${migrationError.message}`);
      }
      return;
    }

    return await syncSessionService.createInitialSyncSession(null, user, item);
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
   * @param {Object} currentSyncSession - Previous sync session
   * @param {Object} item - Item data
   * @param {Object} user - User object 
   * @param {Object} plaidData - Data retrieved from Plaid
   * @returns {Promise<Object>} Response object
   * @private
   */
  async _handleNoChangesCase(currentSyncSession, item, user, plaidData) {
    const now = Date.now();
    
    // Update the previous session with lastNoChangesTime
    await syncSessionService.updateSyncSessionLastNoChangesTime(
      currentSyncSession._id,
      now
    );
    
    // Release the sync lock
    await this._unlockItem(item.itemId, user._id);
    
    // Return response indicating no changes
    return {
      added: 0,
      modified: 0,
      removed: 0,
      hasMore: plaidData.has_more,
      cursor: plaidData.next_cursor,
      noChanges: true,
      lastSyncTime: currentSyncSession.syncTime,
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
   * @param {Array} transactionsSkipped - Array to collect skipped transactions
   * @returns {Promise<Object>} Processing results
   * @private
   */
  async _processSyncData(item, user, cursor, syncTime, plaidData, transactionsSkipped = []) {    
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
    
    // Initialize failed transactions tracking
    const failedTransactions = {
      added: [],
      modified: [],
      removed: []
    };
    
    // Process transactions in parallel with transaction safety
    const [addedResults, modifiedResults, removedResults] = await Promise.all([
      this._processAddedTransactions(plaidData.added, item, user, currentCursor, syncTime, transactionsSkipped),
      this._processModifiedTransactions(plaidData.modified, user, currentCursor, syncTime),
      this._processRemovedTransactions(plaidData.removed, user._id)
    ]);
    
    // Update actual counts and collect failed transactions
    actualCounts.added = addedResults.successCount || 0;
    if (addedResults.failedTransactions && addedResults.failedTransactions.length > 0) {
      failedTransactions.added = addedResults.failedTransactions;
    }
    
    actualCounts.modified = modifiedResults.successCount || 0;
    if (modifiedResults.failedTransactions && modifiedResults.failedTransactions.length > 0) {
      failedTransactions.modified = modifiedResults.failedTransactions;
    }
    
    actualCounts.removed = removedResults.successCount || 0;
    if (removedResults.failedTransactions && removedResults.failedTransactions.length > 0) {
      failedTransactions.removed = removedResults.failedTransactions;
    }
    
    // Update expected counts for added if we skipped any duplicates
    // This ensures we don't trigger a recovery for duplicates
    if (transactionsSkipped.length > 0) {
      expectedCounts.added -= transactionsSkipped.length;
    }
    
    const syncCounts = {
      expected: expectedCounts,
      actual: actualCounts
    };
    
    // Determine if there were any failures (excluding duplicate transactions)
    const hasFailures = Object.values(failedTransactions).some(
      failures => failures && failures.length > 0
    );
    
    return {
      addedCount: actualCounts.added,
      addedTransactions: actualCounts.added === expectedCounts.added ?
        plaidData.added.filter(tx => !transactionsSkipped.some(skipped => skipped.transaction_id === tx.transaction_id))
        : [],
      modifiedCount: actualCounts.modified,
      removedCount: actualCounts.removed,
      hasMore: plaidData.has_more,
      cursor: cursor,
      nextCursor: plaidData.next_cursor,
      expectedCounts,
      actualCounts,
      syncCounts,
      failedTransactions: hasFailures ? failedTransactions : null,
      hasFailures,
      transactionsSkipped
    };
  }

  /**
   * Process and save added transactions
   * @param {Array} transactions - Transactions to add
   * @param {Object} item - Item data
   * @param {Object} user - User object
   * @param {String} cursor - Current cursor
   * @param {Number} syncTime - Current sync syncTime timestamp
   * @param {Array} transactionsSkipped - Array to collect skipped transactions
   * @returns {Promise<Object>} Result with success count and failed transactions
   * @private
   */
  async _processAddedTransactions(transactions, item, user, cursor, syncTime, transactionsSkipped = []) {
    try {
      // Use the dedicated service method for processing added transactions
      const result = await transactionsCrudService.processAddedTransactions(
        transactions, 
        item, 
        user, 
        cursor, 
        syncTime
      );
      
      // Identify and handle duplicate transactions separately from other errors
      if (result.failedTransactions && result.failedTransactions.length > 0) {
        // Filter out duplicate errors from failed transactions
        const duplicates = result.failedTransactions.filter(
          failure => failure.error && 
            typeof failure.error.message === 'string' && 
            failure.error.message.includes('Duplicate value for \'transaction_id\'')
        );
        
        // Move duplicates to skipped transactions
        if (duplicates.length > 0) {
          transactionsSkipped.push(...duplicates.map(dup => ({
            transaction_id: dup.transaction?.transaction_id,
            name: dup.transaction?.name,
            date: dup.transaction?.date,
            amount: dup.transaction?.amount,
            error: dup.error
          })));
          
          // Remove duplicates from failedTransactions to prevent recovery
          result.failedTransactions = result.failedTransactions.filter(
            failure => !duplicates.some(dup => 
              dup.transaction?.transaction_id === failure.transaction?.transaction_id
            )
          );
        }
        
        // Adjust the success count to account for duplicates as "successful" (they already exist)
        result.successCount += duplicates.length;
      }
      
      return result;
    } catch (error) {
      console.error('Error in batch processing added transactions:', error);
      throw new CustomError('TRANSACTION_BATCH_ERROR', 
        `Failed to process batch of ${transactions?.length} transactions: ${error.message}`);
    }
  }

  /**
   * Process and update modified transactions
   * @param {Array} transactions - Transactions to modify
   * @param {Object} user - User object
   * @param {String} cursor - Current cursor
   * @param {Number} syncTime - Current sync syncTime timestamp
   * @returns {Promise<Object>} Result with success count and failed transactions
   * @private
   */
  async _processModifiedTransactions(transactions, user, cursor, syncTime) {
    try {
      // Use the dedicated service method for processing modified transactions
      return await transactionsCrudService.processModifiedTransactions(transactions, user, cursor, syncTime);
    } catch (error) {
      console.error('Error in batch processing modified transactions:', error);
      throw new CustomError('TRANSACTION_BATCH_ERROR', 
        `Failed to process batch of ${transactions?.length} modifications: ${error.message}`);
    }
  }

  /**
   * Process and remove deleted transactions
   * @param {Array} transactionsToRemove - IDs of transactions to remove
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Result with success count and failed transactions
   * @private
   */
  async _processRemovedTransactions(transactionsToRemove, userId) {
    try {
      // Use the dedicated service method for processing removed transactions
      return await transactionsCrudService.processRemovedTransactions(transactionsToRemove, userId);
    } catch (error) {
      console.error('Error in batch processing removed transactions:', error);
      throw new CustomError('TRANSACTION_BATCH_ERROR', 
        `Failed to process batch of ${transactionsToRemove?.length} removals: ${error.message}`);
    }
  }

  /**
   * Update item status after sync
   * @param {Object} item - Item data
   * @param {Object} syncResult - Results from processing
   * @param {String} sync_id - ID of the sync session
   * @returns {Promise<void>}
   * @private
   */
  async _updateItemAfterSync(item, syncResult, sync_id) {
    const countsMatch = syncSessionService.countsMatch(syncResult.syncCounts);
    const hasFailures = syncResult.hasFailures || false;
    
    // Determine item status based on sync result
    const status = !countsMatch || hasFailures ?
      'error' 
      :'complete';
    
    // Create update object
    const updateData = { 
      status
    };
    
    // Only update sync_id if there were no errors
    if (countsMatch && !hasFailures) {
      updateData.sync_id = sync_id;
    }
    
    // Update the item with the new status and stats
    await plaidItems.update({ itemId: item.itemId, userId: user._id },
      updateData
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
    const lockedItem = await itemService.validateAndGetItem(item, user);
    
    if (!lockedItem) {
      throw new CustomError('ITEM_NOT_FOUND', 'Item not found');
    }
    
    // Check for existing sync in progress by looking at item status
    if (lockedItem.status === 'in_progress' && await syncSessionService.isSyncRecent(lockedItem, user)) {
      throw new CustomError('SYNC_IN_PROGRESS', 'A sync is already in progress for this item');
    }
    
    // Set status to in_progress to acquire lock
    await plaidItems.update({ itemId: lockedItem.itemId, userId: user._id }, { status: 'in_progress' });
    
    return lockedItem;
  }

  /**
   * Unlocks an item
   * @param {Object} item - Item data
   * @returns {Promise<void>}
   * @private
   */
  async _unlockItem(itemId, userId) {
    try {
      await plaidItems.update({ itemId, userId }, { status: 'complete' });
    } catch (error) {
      console.error('Error unlocking item:', error);
      throw new CustomError('ITEM_UNLOCK_ERROR', 'Failed to unlock item');
    }
  };

  /**
   * Updates item status to error
   * @param {String} itemId - Item ID
   * @param {String} userId - User ID
   * @param {Error} error - Error object
   * @returns {Promise<void>}
   * @private
   */
  async _updateItemErrorStatus(itemId, userId) {
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
   * Builds a response object with sync results
   * @param {Object} syncResult - Results from processing
   * @param {Number} syncTime - Current sync timestamp
   * @param {Number} branchNumber - Batch number for this sync
   * @param {Array} transactionsSkipped - Transactions skipped due to duplicates
   * @returns {Object} Formatted response
   * @private
   */
  _buildSyncResponse(syncResult, syncTime, branchNumber, transactionsSkipped = []) {
    const response = {
      added: syncResult.addedCount,
      addedTransactions: syncResult.addedTransactions,
      modified: syncResult.modifiedCount,
      removed: syncResult.removedCount,
      hasMore: syncResult.hasMore,
      cursor: syncResult.cursor,
      nextCursor: syncResult.nextCursor,
      syncTime,
      branchNumber,
      noChanges: syncResult.addedCount === 0 && syncResult.modifiedCount === 0 && syncResult.removedCount === 0,
      countValidation: {
        expected: syncResult.expectedCounts,
        actual: syncResult.actualCounts,
        countsMatch: syncSessionService.countsMatch(syncResult.syncCounts)
      }
    };
    
    // Add information about skipped transactions if any
    if (transactionsSkipped.length > 0) {
      response.skippedTransactions = {
        count: transactionsSkipped.length,
        reason: 'Duplicate transactions were skipped'
      };
    }
    
    // Add failure information if any transactions failed
    if (syncResult.hasFailures) {
      response.hasFailures = true;
      response.failureDetails = {
        addedFailures: syncResult.failedTransactions?.added?.length || 0,
        modifiedFailures: syncResult.failedTransactions?.modified?.length || 0,
        removedFailures: syncResult.failedTransactions?.removed?.length || 0,
        message: 'Some transactions failed to process. See sync session for details.'
      };
    }
    
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