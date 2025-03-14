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
      cursor: item.cursor || '', // The cursor used for this sync (empty string for initial sync)
      previousCursor: previousSync?.cursor || null, // The cursor used in the previous sync session
      nextCursor: null, // Will be set after processing when we know the next cursor
      prevSuccessfulCursor: previousSync?.status === 'complete' ? previousSync?.cursor : previousSync?.prevSuccessfulCursor || null,
      syncTime,
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
   * @param {Object} item - Item data
   * @param {Object} previousSync - Previous sync data
   * @param {Object} user - User object
   * @param {Object} revertResult - Results from the reversion
   * @returns {Promise<Object>} Created recovery sync session
   */
  async createRecoverySyncSession(previousSync, user, item, revertResult) {
    const syncTime = Date.now();
    
    const recoverySync = {
      userId: user._id,
      item_id: item._id,
      itemId: item.itemId,
      status: 'recovery',
      
      // The cursor used for this recovery (the last successful cursor we reverted to)
      cursor: revertResult.revertedTo,
      
      // Keep track of the previous cursor that had issues
      previousCursor: previousSync.cursor,
      
      // Will be populated on next sync
      nextCursor: null,
      
      // Maintain the prevSuccessfulCursor reference
      prevSuccessfulCursor: revertResult.revertedTo,
      
      syncTime,
      syncId: `${randomString(10)}-${syncTime}`,
      recoveryAttempts: (previousSync.recoveryAttempts || 0) + 1,
      recoveryStatus: 'success',
      recoveryDetails: {
        revertedTo: revertResult.revertedTo,
        transactionsRemoved: revertResult.removedCount,
        previousBatchNumber: previousSync.batchNumber,
        previousSyncId: previousSync.syncId,
        recoveryTimestamp: syncTime
      }
    };
    
    // Save recovery sync session
    return await SyncSessions.save(recoverySync);
  }
  
  /**
   * Updates the sync session after transaction processing
   * @param {Object} syncSession - The sync session to update
   * @param {Object} syncResult - Results from processing transactions
   * @param {Object} previousSync - Previous sync data, if any
   * @param {String} status - Status to set ('complete', 'in_progress', 'error')
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
        
        // Only update prevSuccessfulCursor if this sync was successful and we don't already have one
        prevSuccessfulCursor: isSuccessful && !syncSession.prevSuccessfulCursor ? 
          syncSession.cursor : // Use current cursor as the successful one
          syncSession.prevSuccessfulCursor, // Keep existing value
        
        error,
        syncCounts
      }
    );
    
    // If there was a previous sync, update its nextCursor field
    if (previousSync && previousSync._id) {
      await SyncSessions.update(
        previousSync._id,
        { nextCursor: syncSession.cursor, userId: previousSync.userId }
      );
    }
  }
  
  /**
   * Gets the sync data for an item
   * Returns the most recent sync session for the item
   * @param {Object} item - Item data
   * @returns {Promise<Object|null>} Sync data session or null if not found
   */
  async getSyncSession(item, user) {
    try {
      if (!item.itemId || !item.userId) {
        return null;
      }
      
      const syncSession = await SyncSessions.findOne(item.sync_id);

      if(!syncSession) {
        return null;
      }

      if(syncSession.userId !== user._id) {
        console.warn(`Sync session found for item ${item.itemId} but user ${user._id} does not match`);
        return null;
      }
      
      return syncSession;
    } catch (error) {
      console.warn(`Error fetching sync session for item ${item.itemId}: ${error.message}`);
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
    const syncSession = await this.getSyncSession(item);
    
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
    if (!syncSession) {
      return false;
    }
    
    // No recovery possible without a last successful cursor
    // if (!syncSession.prevSuccessfulCursor) {
    //   return false;
    // }
    
    // Recovery is needed if:
    // 1. The item is in error state
    if (item.status === 'error' || syncSession.status === 'error') {
      return true;
    }
    
    // 2. The last sync had count mismatches
    if (syncSession.status !== 'recovery' && !this.countsMatch(syncSession.syncCounts)) {
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
   * @param {Object} legacyData - Converted legacy sync data
   * @param {Object} user - User object
   * @param {Object} item - Item data
   * @returns {Promise<Object>} The created sync session
   */
  async createSyncSessionFromLegacy(legacyData, user, item) {
    if (!legacyData || !legacyData.cursor) {
      throw new Error('Invalid legacy sync data provided for migration');
    }

    const syncTime = legacyData.syncTime || Date.now();
    
    const syncSession = {
      userId: user._id,
      item_id: item._id,
      itemId: item.itemId,
      status: legacyData.status || 'complete',
      cursor: legacyData.cursor,
      previousCursor: null, // No previous cursor in legacy format
      nextCursor: legacyData.nextCursor || legacyData.cursor, // Use nextCursor if available, otherwise use cursor
      prevSuccessfulCursor: legacyData.status === 'complete' ? legacyData.cursor : null,
      syncTime,
      batchNumber: legacyData.batchNumber || 1,
      syncId: `legacy-${randomString(8)}-${syncTime}`,
      hasMore: false, // Default for migrated data
      syncCounts: legacyData.syncCounts || {
        expected: {
          added: 0,
          modified: 0,
          removed: 0
        },
        actual: {
          added: 0,
          modified: 0,
          removed: 0
        }
      },
      recoveryAttempts: 0,
      recoveryStatus: null,
      migrationDetails: {
        migratedAt: new Date().toISOString(),
        fromLegacyFormat: true,
        originalData: {
          cursor: legacyData.cursor,
          syncTime: legacyData.syncTime,
          status: legacyData.status
        }
      }
    };
    
    // Save the migrated sync session
    return await SyncSessions.save(syncSession);
  }
}

export default new SyncSessionService(); 