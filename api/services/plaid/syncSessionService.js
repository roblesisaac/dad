import SyncSessions from '../../models/syncSession.js';
import plaidItems from '../../models/plaidItems.js';
import randomString from '../../utils/randomString.js';

/**
 * Service responsible for managing sync sessions
 * Handles creating, updating, and retrieving sync sessions
 */
class SyncSessionService {
  /**
   * Creates a new sync session before processing transactions
   * @param {Object} previousSync - Previous sync data, if any
   * @param {Object} user - User object
   * @param {Object} item - The item data
   * @param {Object} options - Additional options for sync session
   * @param {Object} plaidData - Data fetched from Plaid containing transaction changes
   * @returns {Promise<Object>} The created sync session and its ID
   */
  async createInitialSyncSession(previousSync, user, item, options = {}, plaidData = null) {
    const syncTime = Date.now();
    const { branchNumber = 1, syncId = null } = options;

    // Initialize expected counts based on plaidData if available
    const expectedCounts = {
      added: plaidData?.added?.length || 0,
      modified: plaidData?.modified?.length || 0,
      removed: plaidData?.removed?.length || 0
    };

    const initialSyncSession = {
      userId: previousSync?.userId || user._id,
      item_id: previousSync?.item_id || item._id,
      itemId: previousSync?.itemId || item.itemId,
      status: 'in_progress',
      cursor: previousSync?.nextCursor || '', // The cursor used for this sync (empty string for initial sync)
      nextCursor: null, // Will be set after processing when we know the next cursor
      prevSession_id: previousSync?._id,
      prevSuccessfulSession_id: previousSync?.status === 'complete' ? 
        previousSync?._id 
        : previousSync?.prevSuccessfulSession_id || null,

      syncTime,
      syncNumber: previousSync?.syncNumber ? Math.trunc(previousSync.syncNumber) + 1 : 1,
      syncTag: item.syncTag || previousSync?.syncTag || null,
      branchNumber,

      // If we're continuing a multi-batch sync, use the previous syncId
      // Otherwise, generate a new one
      syncId: syncId || `${randomString(10)}-${syncTime}`,

      // Initialize hasMore to false - will be set during processing
      hasMore: false,
      
      // Initialize syncCounts with expected values from plaidData
      syncCounts: {
        expected: expectedCounts,
        actual: {
          added: 0,
          modified: 0,
          removed: 0
        }
      },
      
      // Initialize failedTransactions tracking
      failedTransactions: {
        added: [],
        modified: [],
        removed: []
      },
      
      recoveryAttempts: 0,
      
      // Add tracking for new fields
      startTimestamp: Date(),
      transactionsSkipped: []
    };
    
    // Save the initial sync session
    const savedSync = await SyncSessions.save(initialSyncSession);
    
    return {
      syncTime,
      syncSession: savedSync
    };
  }
  
  /**
   * Creates a recovery sync session
   * @param {Object} sessionToRetry - The target session to revert to
   * @param {Object} revertResult - Results from the reversion
   * @returns {Promise<Object>} Created recovery sync session
   */
  async createRecoverySyncSession(sessionToRetry, revertResult) {
    // const syncTime = Date.now();
    const { _id, syncCounts, ...sessionToRetryData } = sessionToRetry;
    
    // Handle case where sessionToRetry is just minimal data (from performReversion)
    const syncNumber = sessionToRetry.syncNumber || 1;
    
    const recoverySyncData = {
      ...sessionToRetryData,
      isRecovery: true,
      // syncTime,
      // syncId: `${randomString(10)}-${syncTime}`,
      recoveryAttempts: (sessionToRetry.recoveryAttempts || 0) + 1,
      syncNumber: this.addAndRound(syncNumber, 0.1)
    };

    if(revertResult) {
      recoverySyncData.recoveryDetails = {
        transactionsRemoved: revertResult.removedCount?.actual,
        previousbranchNumber: sessionToRetry.branchNumber,
        previousSyncId: sessionToRetry.syncId
      }
    }

    const recoverySync = await SyncSessions.save(recoverySyncData);

    // Only update nextSession_id if failedSyncSession has a proper _id
    if(sessionToRetry?._id && !sessionToRetry?.nextSession_id && recoverySync?._id) {
      await SyncSessions.update(sessionToRetry._id, {
        nextSession_id: recoverySync._id
      });
    }
    
    return recoverySync;
  }

  /**
   * @private
   */
  addAndRound(value, addValue) {
    let result = value + addValue;
    let multiplier = Math.pow(10, 1);
    return Math.round(result * multiplier) / multiplier;
  }
  
  /**
   * Updates the sync session after transaction processing
   * @param {Object} syncSession - The sync session to update
   * @param {Object} syncResult - Results from processing transactions
   * @param {Object} previousSync - Previous sync data, if any
   * @param {String} status - complete|in_progress|error
   * @returns {Promise<void>}
   */
  async updateSyncSessionAfterProcessing(syncSession, syncResult, previousSync, status) {
    // Get the existing expected counts to preserve them
    const existingSyncCounts = syncSession.syncCounts || {};
    const expectedCounts = existingSyncCounts.expected || syncResult.expectedCounts;
    
    // Create the updated syncCounts with preserved expected counts
    const syncCounts = {
      expected: expectedCounts,
      actual: syncResult.actualCounts
    };
    
    const countsMatch = this.countsMatch(syncCounts);
    let error = null;
    
    // Check if counts match
    if (!countsMatch) {
      error = {
        code: 'COUNT_MISMATCH',
        message: `Transaction count mismatch: Expected (${expectedCounts.added} added, ${expectedCounts.modified} modified, ${expectedCounts.removed} removed) vs Actual (${syncResult.actualCounts.added} added, ${syncResult.actualCounts.modified} modified, ${syncResult.actualCounts.removed} removed)`,
        timestamp: new Date().toISOString()
      };
      console.error(`[TransactionSync] Count mismatch for item ${syncSession.itemId}: ${error.message}`);
    }
    
    // Check for transaction failures
    if (syncResult.hasFailures) {
      if (!error) {
        error = {
          code: 'TRANSACTION_FAILURES',
          message: `Transaction processing failures: ${syncResult.failedTransactions.added.length} add failures, ${syncResult.failedTransactions.modified.length} modify failures, ${syncResult.failedTransactions.removed.length} remove failures`,
          timestamp: new Date().toISOString()
        };
      } else {
        // Append to existing error message
        error.message += `. Additionally, transaction processing failures occurred.`;
      }
      console.error(`[TransactionSync] Transaction failures for item ${syncSession.itemId}: ${error.message}`);
    }
    
    // Determine if this sync was successful (counts match and status is complete or in_progress)
    const isSuccessful = countsMatch && !syncResult.hasFailures && (status === 'complete' || status === 'in_progress');
    
    // Build the update data
    const updateData = {
      status,
      userId: syncSession.userId,
      nextCursor: syncResult.nextCursor, // The next cursor to use
      hasMore: syncResult.hasMore,
      
      // Only update prevSuccessfulSession_id if this sync was successful and we don't already have one
      prevSuccessfulSession_id: isSuccessful && !syncSession.prevSuccessfulSession_id ? 
        syncSession._id : // Use current session ID as the successful one
        syncSession.prevSuccessfulSession_id, // Keep existing value
      
      error,
      syncCounts,
      endTimestamp: new Date(),
      syncDuration: Date.now() - (syncSession.startTimestamp?.getTime() || Date.now())
    };
    
    // Add failed transactions to the update if present
    if (syncResult.hasFailures && syncResult.failedTransactions) {
      updateData.failedTransactions = syncResult.failedTransactions;
    }
    
    // Add skipped transactions if any
    if (syncResult.transactionsSkipped && syncResult.transactionsSkipped.length > 0) {
      updateData.transactionsSkipped = syncResult.transactionsSkipped;
    }
    
    // Update the sync session
    await SyncSessions.update(
      syncSession._id,
      updateData
    );
    
    // If there was a previous sync, update its nextCursor field
    if (previousSync && previousSync._id) {
      await SyncSessions.update(
        previousSync._id,
        { 
          nextSession_id: syncSession._id,
          userId: previousSync.userId
        }
      );
    }
  }
  
  /**
   * Gets the sync data for an item
   * Returns the most recent sync session for the item
   * @param {String} session_id - session._id
   * @returns {Promise<Object|null>} Sync data session or null if not found
   */
  async getSyncSession(sync_id, user) {
    try {
      if (!sync_id) {
        return null;
      }
      
      const syncSession = await SyncSessions.findOne(sync_id);

      if(!syncSession) {
        return null;
      }

      if(syncSession.userId !== user._id) {
        console.warn(`Sync session '${sync_id}' found but user ${user._id} does not match`);
        return null;
      }
      
      return syncSession;
    } catch (error) {
      console.warn(`Error fetching sync session '${sync_id}': ${error.message}`);
      return null;
    }
  }
  
  /**
   * Gets all sync sessions for an item
   * @param {String} itemId - The Plaid item ID
   * @param {String} userId - The user ID
   * @param {Object} options - Query options (limit, cursor)
   * @returns {Promise<Array>} Sync sessions sorted by recency
   */
  async getSyncSessionsForItem(itemId, userId, options = {}) {
    try {
      if (!itemId || !userId) {
        return [];
      }
      
      const { limit = 20 } = options;
      
      // Query sessions by itemId and userId

      const sessions = await SyncSessions.find(
        { itemIdTime: `${itemId}:*`, userId },
        { limit, reverse: true } // Most recent first
      );
      
      return sessions.items || [];
    } catch (error) {
      console.warn(`Error fetching sync sessions for item ${itemId}: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Check if a sync is recent (within last 5 minutes)
   * @param {Object} item - Item data
   * @param {Object} [user] - User object
   * @returns {Promise<boolean>} True if a recent sync exists
   */
  async isSyncRecent(item, user) {
    // Find the most recent sync
    const syncSession = await this.getSyncSession(item.sync_id, user);
    
    if (!syncSession || !syncSession.syncTime) {
      return false;
    }
    
    const lastUpdateTime = syncSession.syncTime;
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    return (currentTime - lastUpdateTime) < fiveMinutes;
  }

  /**
   * Checks if expected and actual transaction counts match
   * @param {Object} syncCounts - The syncCounts object containing expected and actual counts
   * @returns {boolean} - True if counts match, false otherwise
   */
  countsMatch(syncCounts) {
    if (!syncCounts || !syncCounts.expected || !syncCounts.actual) {
      return false;
    }
    
    return syncCounts.expected.added === syncCounts.actual.added &&
           syncCounts.expected.modified === syncCounts.actual.modified &&
           syncCounts.expected.removed === syncCounts.actual.removed;
  }

  /**
   * Updates the lastNoChangesTime field when no changes are detected in a sync
   * @param {String} syncSession_id - The ID of the sync session to update
   * @param {Number} lastNoChangesTime - Timestamp when no changes were detected
   * @returns {Promise<void>}
   */
  async updateSyncSessionLastNoChangesTime(syncSession_id, lastNoChangesTime) {
    if (!syncSession_id) {
      return;
    }
    
    await SyncSessions.update(
      syncSession_id,
      { 
        lastNoChangesTime,
        status: 'complete', // Ensure status is still complete
        endTimestamp: new Date()
      }
    );
  }

  /**
   * Creates a sync session from legacy sync data stored directly on the item
   * Used for migration from old sync format to new sync session format
   * @param {Object} user - User object
   * @param {Object} item - Item data containing legacy syncCounts
   * @returns {Promise<Object>} The created sync session
   */
  async createSyncSessionFromLegacy(user, item) {
    const legacySyncData = item.syncData;
    const syncTag = randomString(4, { isUppercase: true });

    await plaidItems.update(item._id, {
      syncTag
    });
    
    if (!legacySyncData || !legacySyncData.cursor) {
      throw new Error('Invalid legacy sync data provided for migration');
    }

    // Convert legacy syncData format to syncSession format
    const syncTime = legacySyncData.lastSyncTime || Date.now();
    const now = new Date();
    
    const syncSession = {
      userId: user._id,
      item_id: item._id,
      itemId: item.itemId,
      status: legacySyncData.status === 'completed' ? 'complete' : legacySyncData.status,
      cursor: legacySyncData.cursor,
      nextCursor: legacySyncData.cursor, // In legacy format, there was only one cursor field
      prevSuccessfulSession_id: legacySyncData.status === 'complete' || legacySyncData.status === 'completed' ? 
        legacySyncData.cursor : null,
      syncTime,
      syncNumber: 1,
      syncTag,
      branchNumber: 1, // Default for legacy data
      syncId: `legacy-${randomString(8)}-${syncTime}`,
      hasMore: false, // Default for migrated data
      syncCounts: {
        expected: {
          added: legacySyncData.result?.itemsAddedCount || 0,
          modified: legacySyncData.result?.itemsModifiedCount || 0,
          removed: legacySyncData.result?.itemsRemovedCount || 0
        },
        actual: {
          added: legacySyncData.result?.itemsAddedCount || 0,
          modified: legacySyncData.result?.itemsModifiedCount || 0,
          removed: legacySyncData.result?.itemsRemovedCount || 0
        }
      },
      error: legacySyncData.result?.errorMessage || null,
      failedTransactions: {
        added: [],
        modified: [],
        removed: []
      },
      recoveryAttempts: 0,
      isLegacy: true,
      startTimestamp: now,
      endTimestamp: now,
      syncDuration: 0,
      transactionsSkipped: [],
      migrationDetails: {
        migratedAt: now.toISOString(),
        fromLegacyFormat: true,
        originalData: {
          cursor: legacySyncData.cursor,
          syncTime: legacySyncData.lastSyncTime,
          status: legacySyncData.status
        }
      }
    };
    
    // Save the migrated sync session
    return await SyncSessions.save(syncSession);
  }

  /**
   * Updates the recovery details in a sync session with transaction removal counts
   * @param {Object} syncSession - Sync session to update
   * @param {String} field - Field to update ('expected' or 'actual')
   * @param {Number} count - Count value to set
   * @returns {Promise<void>}
   */
  async updateRecoveryCountDetails(syncSession, field, count) {
    if (!syncSession || !syncSession._id) {
      return;
    }
    
    // Make sure field is either 'expected' or 'actual'
    if (field !== 'expected' && field !== 'actual') {
      console.warn(`Invalid field '${field}' for recovery details update`);
      return;
    }

    const { syncCounts } = syncSession;

    if(field === 'expected') {
      syncCounts.expected = {
        added: 0, 
        modified: 0,
        removed: count
      }

      syncCounts.actual = { 
        added: 0,
        modified: 0,
        removed: 0 
      };
    }

    if(field === 'actual') {
      syncCounts.actual.removed = count;
    }
    
    await SyncSessions.update(
      syncSession._id,
      {
        userId: syncSession.userId,
        syncCounts
      }
    );
  }
}

export default new SyncSessionService(); 