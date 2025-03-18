import SyncSessions from '../../models/syncSession.js';
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
  async createNewSyncSession(previousSync, user, item, options = {}, plaidData = null) {
    const syncTime = Date.now();
    const { batchNumber = 1, syncId = null } = options;

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
      cursor: previousSync.nextCursor || '', // The cursor used for this sync (empty string for initial sync)
      nextCursor: null, // Will be set after processing when we know the next cursor
      prevSession_id: previousSync?._id,
      prevSuccessfulSession_id: previousSync?.status === 'complete' ? 
        previousSync?._id 
        : previousSync?.prevSuccessfulSession_id || null,
      syncTime,
      syncNumber: previousSync?.syncNumber ? Math.trunc(previousSync.syncNumber) + 1 : 1,
      batchNumber,

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
      
      recoveryAttempts: 0,
      recoveryStatus: null
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
   * @param {Object} previousSync - Previous sync data
   * @param {Object} failedSyncSession - Failed sync session data
   * @param {Object} revertResult - Results from the reversion
   * @returns {Promise<Object>} Created recovery sync session
   */
  async createRecoverySyncSession(sessionToRetry, failedSyncSession, revertResult) {
    const syncTime = Date.now();
    const { _id, syncCounts, ...sessionToRetryData } = sessionToRetry;
    
    const recoverySyncData = {
      ...sessionToRetryData,
      prevSession_id: failedSyncSession._id,
      status: 'recovery',
      isRecovery: true,
      syncTime,
      syncId: `${randomString(10)}-${syncTime}`,
      recoveryAttempts: (failedSyncSession.recoveryAttempts || 0) + 1,
      recoveryStatus: 'success',
      syncNumber: this.addAndRound(failedSyncSession.syncNumber, 0.1)
    };

    if(revertResult) {
      recoverySyncData.recoveryDetails = {
        transactionsRemoved: revertResult.removedCount,
        previousBatchNumber: failedSyncSession.batchNumber,
        previousSyncId: failedSyncSession.syncId,
        recoveryTimestamp: syncTime
      }
    }

    const recoverySync = await SyncSessions.save(recoverySyncData);

    if(failedSyncSession?._id && recoverySync._id) {
      await SyncSessions.update(failedSyncSession._id, {
        nextSession_id: recoverySync._id
      });
    }
    
    // Save recovery sync session
    return recoverySync;
  }

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
    
    // Determine if this sync was successful (counts match and status is complete or in_progress)
    const isSuccessful = countsMatch && (status === 'complete' || status === 'in_progress');
    
    // Update the sync session
    await SyncSessions.update(
      syncSession._id,
      {
        status,
        userId: syncSession.userId,
        nextCursor: syncResult.nextCursor, // The next cursor to use
        hasMore: syncResult.hasMore,
        
        // Only update prevSuccessfulSession_id if this sync was successful and we don't already have one
        prevSuccessfulSession_id: isSuccessful && !syncSession.prevSuccessfulSession_id ? 
          syncSession.cursor : // Use current cursor as the successful one
          syncSession.prevSuccessfulSession_id, // Keep existing value
        
        error,
        syncCounts
      }
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
   * Check if a sync is recent (within last 5 minutes)
   * @param {Object} item - Item data
   * @returns {Promise<boolean>} True if a recent sync exists
   */
  async isSyncRecent(item) {
    // Find the most recent sync
    const syncSession = await this.getSyncSession(item.sync_id);
    
    if (!syncSession || !syncSession.syncTime) {
      return false;
    }
    
    const lastUpdateTime = syncSession.syncTime;
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    return (currentTime - lastUpdateTime) < fiveMinutes;
  }
  
  /**
   * Updates the recovery stats in a sync session
   * @param {Object} syncSession - Sync data session
   * @param {string} status - Recovery status ('success' or 'failed')
   * @param {string} [errorMessage] - Optional error message if recovery failed
   * @returns {Promise<void>}
   */
  async updateSyncRecoveryStats(syncSession, status, errorMessage = null) {
    if (!syncSession || !syncSession._id) {
      return;
    }
    
    const updateData = {
      recoveryAttempts: (syncSession.recoveryAttempts || 0) + 1,
      recoveryStatus: status,
      lastRecoveryAt: new Date().toISOString(),
      userId: syncSession.userId
    };
    
    if (status === 'failed' && errorMessage) {
      updateData.recoveryError = errorMessage;
    }
    
    await SyncSessions.update(
      syncSession._id,
      updateData
    );
  }
  
  /**
   * Check if recovery is needed based on sync status
   * @param {Object} item - Item data
   * @param {Object} syncSession - Sync data session
   * @returns {boolean} True if recovery is needed
   */
  isRecoveryNeeded(item, syncSession) {
    // If no sync data, no recovery needed
    if (!syncSession || syncSession.isRecovery) {
      return false;
    }
    
    // Recovery is needed if:
    // 1. The item is in error state
    if (item.status === 'error' || syncSession.status === 'error') {
      return true;
    }
    
    // 2. The last sync had count mismatches
    if (!this.countsMatch(syncSession.syncCounts)) {
      console.warn(`Recovery needed for item ${item.itemId} due to count mismatch in previous sync`);
      return true;
    }
    
    return false;
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
        status: 'complete' // Ensure status is still complete
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
    
    if (!legacySyncData || !legacySyncData.cursor) {
      throw new Error('Invalid legacy sync data provided for migration');
    }

    // Convert legacy syncData format to syncSession format
    const syncTime = legacySyncData.lastSyncTime || Date.now();
    
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
      batchNumber: 1, // Default for legacy data
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
      recoveryAttempts: 0,
      recoveryStatus: null,
      isLegacy: true,
      migrationDetails: {
        migratedAt: new Date().toISOString(),
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
}

export default new SyncSessionService(); 