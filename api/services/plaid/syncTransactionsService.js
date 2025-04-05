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

    let lockedItem = null; // Initialize lockedItem to null
    let currentSyncSession = null;

    try {
      // 1. Sync initialization - Acquire sync lock on plaid item
      lockedItem = await this._getAndLockItem(item, user); // Assign to lockedItem
      
      // 1. Get sync session from item
      currentSyncSession = await syncSessionService.getSyncSession(lockedItem?.sync_id, user);

      // 1. If no current sync session, create a new one (initial sync)
      if(!currentSyncSession) {
        currentSyncSession = await this._createInitialSyncSession(lockedItem, user);
      }
      
      // Update startTimestamp for this sync operation
      await syncSessionService.updateSessionMetadata(
        currentSyncSession,
        { startTimestamp: syncStartTime }
      );
      
      // 1. Recovery Assessment - Check if recovery is needed
      const { isRecovery, syncCounts } = currentSyncSession;
      const syncCountsMatch = syncSessionService.countsMatch(syncCounts);
      const shouldRecover = isRecovery || !syncCountsMatch;

      if (shouldRecover) {
        // Handles both creating the recovery session and performing reversion
        const recoveryResult = await recoveryService.initiateReversion(
          // If already in recovery, we can use the current session directly
          isRecovery ? currentSyncSession : currentSyncSession,
          lockedItem, 
          user
        );

        // Unlock item
        await this._unlockItem(lockedItem.itemId, user._id, 'recovery');
        
        // Return recovery response
        const recoveryResponse = {
          recovery: {
            performed: true,
            removedCount: recoveryResult.removedCount,
            revertedTo: recoveryResult.revertedTo,
            success: recoveryResult.success,
            syncDuration: recoveryResult.performanceMetrics?.syncDuration || 0
          },
          message: 'Recovery completed. ' + 
            (recoveryResult.resolution.success 
              ? 'A new sync session has been created with the correct cursor.' 
              : 'Recovery encountered issues. Will retry on next sync operation.'),
          resolution: recoveryResult.resolution,
          batchResults: {
            added: 0,
            modified: 0,
            removed: recoveryResult.removedCount.actual
          }
        };
        
        return recoveryResponse;
      }
      
      // 2. Normal Flow - Check for changes from Plaid
      const cursor = currentSyncSession?.cursor || null;
      const plaidData = await this._fetchTransactionsFromPlaid(lockedItem, user, cursor);
      const hasChanges = this._checkForChanges(plaidData);
      
      if (!hasChanges) {        
        // Update both lastNoChangesTime and timestamps
        const updatedSession = await syncSessionService.updateSyncSessionLastNoChangesTime(
          currentSyncSession
        );
        
        const response = await this._handleNoChangesCase(updatedSession, lockedItem, user, plaidData);
        return response;
      }
      
      // Update session with expected counts
      const expectedCounts = {
        added: plaidData.added?.length || 0,
        modified: plaidData.modified?.length || 0,
        removed: plaidData.removed?.length || 0
      };
      
      // Use the universal updateSessionCounts method
      let updatedSession = await syncSessionService.updateSessionCounts(
        currentSyncSession,
        'expected',
        expectedCounts
      );
      
      // 2. Normal Flow - Process Plaid data
      const syncResult = await this._processSyncData(
        lockedItem,
        user, 
        cursor,
        syncStartTime, 
        plaidData,
        transactionsSkipped
      );

      console.log('syncResult', syncResult);
      
      // Update session with actual counts and get the updated session
      updatedSession = await syncSessionService.updateSessionCounts(
        updatedSession,
        'actual',
        syncResult.actualCounts
      );
      
      // Update session with any failed transactions
      if (syncResult.failedTransactions) {
        await syncSessionService.updateSessionMetadata(
          updatedSession,
          {
            failedTransactions: syncResult.failedTransactions
          }
        );
      }
      
      // 4. Resolution Phase - Resolve the session based on count comparison
      // resolveSession now handles timestamp calculations and updates internally
      const resolutionResult = await syncSessionService.resolveSession(
        updatedSession,
        user,
        lockedItem
      );
      
      // Unlock item
      await this._unlockItem(lockedItem.itemId, user._id);
      
      // 4. Resolution Phase - Build response based on resolution result
      const response = this._buildSyncResponse(
        syncResult,
        syncStartTime,
        1, // No more branching in the new workflow
        resolutionResult
      );
      
      // Add performance metrics to response using timestamps from resolution result
      response.performanceMetrics = {
        syncDuration: resolutionResult.duration,
        startTimestamp: syncStartTime,
        endTimestamp: resolutionResult.timestamp
      };
      
      return response;
    } catch (error) {
      // Calculate duration even for errors
      const { endTimestamp, syncDuration } = syncSessionService.calcEndTimestampAndSyncDuration(currentSyncSession);
      
      // Update session with error timestamp data if we have a session
      if (currentSyncSession && currentSyncSession._id) {
        try {
          await syncSessionService.updateSessionMetadata(
            currentSyncSession,
            {
              endTimestamp,
              syncDuration,
              error: {
                message: error.message,
                timestamp: endTimestamp
              }
            }
          );
        } catch (updateError) {
          console.error('Failed to update session metadata on error:', updateError);
        }
      }
      
      // Get itemId and userId if the lock was successful
      const itemIdToUnlock = typeof item === 'string' ? item : lockedItem?.itemId;
      const userIdForError = user?._id;

      // Handle any errors during the process, ensuring item status is updated
      // Pass specific IDs if available
      await this._handleSyncError(error, itemIdToUnlock, userIdForError);
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

    return await syncSessionService.createInitialSync(user, item);
  }

  /**
   * Fetch transactions from Plaid
   * @returns {Promise<Object>} Plaid data
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
   * Check for changes from Plaid
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
      lastNoChangesTime: now,
      syncDuration: currentSyncSession.syncDuration
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
    
    // Initialize failed transactions tracking with empty arrays
    const failedTransactions = {
      added: [],
      modified: [],
      removed: [],
      skipped: []
    };
    
    try {      
      // Process transactions in parallel with transaction safety
      const [addedResults, modifiedResults, removedResults] = await Promise.all([
        this._processAddedTransactions(plaidData.added, item, user, currentCursor, syncTime, transactionsSkipped),
        this._processModifiedTransactions(plaidData.modified, user, currentCursor, syncTime),
        this._processRemovedTransactions(plaidData.removed, user._id)
      ]);
      
      // Update actual counts (with validation)
      actualCounts.added = addedResults?.successCount || 0;
      actualCounts.modified = modifiedResults?.successCount || 0;
      actualCounts.removed = removedResults?.successCount || 0;
      
      // Process failedTransactions with careful validation for each section
      
      // Added transactions
      if (addedResults?.failedTransactions) {
        if (Array.isArray(addedResults.failedTransactions.added)) {
          failedTransactions.added = [...addedResults.failedTransactions.added];
        }
        
        if (Array.isArray(addedResults.failedTransactions.skipped)) {
          failedTransactions.skipped = [...addedResults.failedTransactions.skipped];
        }
      }
      
      // Modified transactions
      if (modifiedResults?.failedTransactions) {
        if (Array.isArray(modifiedResults.failedTransactions)) {
          failedTransactions.modified = [...modifiedResults.failedTransactions];
        } else if (Array.isArray(modifiedResults.failedTransactions.modified)) {
          failedTransactions.modified = [...modifiedResults.failedTransactions.modified];
        }
      }
      
      // Removed transactions
      if (removedResults?.failedTransactions) {
        if (Array.isArray(removedResults.failedTransactions)) {
          failedTransactions.removed = [...removedResults.failedTransactions];
        } else if (Array.isArray(removedResults.failedTransactions.removed)) {
          failedTransactions.removed = [...removedResults.failedTransactions.removed];
        }
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
      
      // Determine if there were any failures (excluding skipped/duplicate transactions)
      const hasActualFailures = 
        failedTransactions.added.length > 0 || 
        failedTransactions.modified.length > 0 || 
        failedTransactions.removed.length > 0;
      
      return {
        addedCount: actualCounts.added,
        addedTransactions: actualCounts.added === expectedCounts.added ?
          plaidData.added.filter(tx => !transactionsSkipped.includes(tx.transaction_id))
          : [],
        modifiedCount: actualCounts.modified,
        removedCount: actualCounts.removed,
        hasMore: plaidData.has_more,
        cursor: cursor,
        nextCursor: plaidData.next_cursor,
        expectedCounts,
        actualCounts,
        syncCounts,
        failedTransactions: {
          added: failedTransactions.added,
          modified: failedTransactions.modified,
          removed: failedTransactions.removed,
          skipped: failedTransactions.skipped
        },
        hasFailures: hasActualFailures,
        skippedCount: failedTransactions.skipped.length
      };
    } catch (error) {
      console.error('Error in _processSyncData:', error);
      throw error;
    }
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
      
      // Ensure result has properly initialized properties
      if (!result) {
        return { 
          successCount: 0, 
          failedTransactions: { 
            added: [], 
            skipped: [] 
          } 
        };
      }
      
      if (typeof result.successCount === 'undefined') {
        result.successCount = 0;
      }
      
      // Ensure failedTransactions is an object with arrays
      if (!result.failedTransactions || typeof result.failedTransactions !== 'object') {
        result.failedTransactions = {};
      }
      
      // Normalize arrays
      if (!Array.isArray(result.failedTransactions.added)) {
        result.failedTransactions.added = [];
      }
      
      if (!Array.isArray(result.failedTransactions.skipped)) {
        result.failedTransactions.skipped = [];
      }
      
      // Process the original failedTransactions array if it exists directly on result.failedTransactions
      if (Array.isArray(result.failedTransactions) && result.failedTransactions.length > 0) {
        // Find duplicates
        const duplicates = result.failedTransactions.filter(
          failure => failure.error && 
            typeof failure.error.message === 'string' && 
            failure.error.message.includes('Duplicate value for \'transaction_id\'')
        );
        
        const otherFailures = result.failedTransactions.filter(
          failure => !failure.error || 
            typeof failure.error.message !== 'string' || 
            !failure.error.message.includes('Duplicate value for \'transaction_id\'')
        );
        
        // Process duplicates
        if (duplicates.length > 0) {
          const skippedItems = duplicates.map(dup => ({
            transaction_id: dup.transaction?.transaction_id,
            transaction: dup.transaction,
            error: {
              code: 'SKIPPED_DUPLICATE',
              message: 'Transaction skipped - already exists in database',
              originalError: dup.error
            }
          }));
          
          // Store skipped items
          result.failedTransactions = {
            added: otherFailures,
            skipped: skippedItems
          };
          
          // Add to transactionsSkipped for count adjustment
          transactionsSkipped.push(...duplicates.map(dup => dup.transaction?.transaction_id));
          
          // Adjust the success count
          result.successCount += duplicates.length;
        } else {
          // No duplicates, just move the array to the added property
          result.failedTransactions = {
            added: result.failedTransactions,
            skipped: []
          };
        }
      }
      
      // Return a clean result with explicitly structured data
      return {
        successCount: result.successCount,
        failedTransactions: {
          added: Array.isArray(result.failedTransactions.added) ? result.failedTransactions.added : [],
          skipped: Array.isArray(result.failedTransactions.skipped) ? result.failedTransactions.skipped : []
        }
      };
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
      const modifiedResults = await transactionsCrudService.processModifiedTransactions(transactions, user, cursor, syncTime);

      return modifiedResults;
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
   * @param {String} itemId - Item ID
   * @param {String} userId - User ID
   * @returns {Promise<void>}
   * @private
   */
  async _unlockItem(itemId, userId, status = 'complete') {
    try {      
      const currentItem = await plaidItems.findOne({ itemId, userId });

      // Only set to 'complete' if current status is 'in_progress'
      const newStatus = status === 'complete' && currentItem.status !== 'in_progress' 
        ? currentItem.status
        : status;

      await plaidItems.update({ itemId, userId }, { status: newStatus });
    } catch (error) {
      console.error('Error unlocking item:', error);
      throw new CustomError('ITEM_UNLOCK_ERROR', 'Failed to unlock item');
    }
  };

  /**
   * Handles errors in the sync process
   * @param {Error} error - Original error
   * @param {String} itemId - Item ID (if available)
   * @param {String} userId - User ID (if available)
   * @returns {Promise<void>}
   * @private
   */
  async _handleSyncError(error, itemId, userId) {
    // Format the error with context
    const formattedError = this._formatError(error, itemId, userId); // Use passed IDs

    // Update item status to error if possible
    if (itemId && userId) {
      try {
        // Attempt to set status to 'error' to release lock and indicate failure
        await this._updateItemErrorStatus(itemId, userId);
      } catch (updateError) {
        console.error(`Failed to update item status to error for itemId ${itemId}:`, updateError);
        // Log the original error as well
        console.error('Original sync error:', formattedError);
      }
    } else {
      // Log error even if item details aren't available for status update
      console.error('Sync error occurred (item details unavailable for status update):', formattedError);
    }

    // Note: We don't return the formattedError here anymore as the original error is re-thrown
  }

  /**
   * Updates item status to error
   * @param {String} itemId - Item ID
   * @param {String} userId - User ID
   * @returns {Promise<void>}
   * @private
   */
  async _updateItemErrorStatus(itemId, userId) {
    // Update the item status to error
    // This also implicitly unlocks the item if the lock was based on 'in_progress' status
    await plaidItems.update(
      { itemId, userId },
      { status: 'error' }
    );
  }

  /**
   * Format error with context
   * @param {Error} error - Original error
   * @param {String} itemId - Item ID (if available)
   * @param {String} userId - User ID (if available)
   * @returns {Error} Formatted error
   * @private
   */
  _formatError(error, itemId, userId) { // Accept itemId and userId directly
    return CustomError.createFormattedError(error, {
      operation: 'sync_transactions',
      itemId: itemId || 'unknown', // Use passed itemId
      userId: userId || 'unknown'  // Use passed userId
    });
  }

  /**
   * Builds a response object with sync results
   * @param {Object} syncResult - Results from processing
   * @param {Number} syncTime - Current sync timestamp
   * @param {Number} branchNumber - Batch number for this sync
   * @param {Object} resolutionResult - Result from the resolution phase
   * @returns {Object} Formatted response
   * @private
   */
  _buildSyncResponse(syncResult, syncTime, branchNumber, resolutionResult = null) {
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
    if (syncResult.skippedCount > 0) {
      response.skippedTransactions = {
        count: syncResult.skippedCount,
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
    
    // Add resolution result information if available
    if (resolutionResult) {
      response.resolution = {
        success: resolutionResult.success,
        isRecovery: resolutionResult.isRecovery
      };
      
      if (resolutionResult.isRecovery) {
        response.resolution.recoverySessionId = resolutionResult.recoverySession?._id;
        response.error = {
          code: 'COUNT_MISMATCH',
          message: `Transaction count mismatch detected. Recovery will be triggered on next sync.`
        };
      }
    }
    
    return response;
  }
}

export default new TransactionSyncService(); 