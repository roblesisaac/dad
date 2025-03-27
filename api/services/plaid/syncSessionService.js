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
      syncTag: item.syncTag || previousSync?.syncTag || null,
      branchNumber: previousSync?.branchNumber ? previousSync.branchNumber + 1 : branchNumber,

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
   * @param {Object} item - The item to update
   * @param {Object} user - The user object
   * @param {Object} revertResult - Results from the reversion
   * @returns {Promise<Object>} Created recovery sync session
   */
  async createRecoverySyncSession(sessionToRetry, item, user, revertResult = null) {
    const { _id, syncCounts, branchNumber, ...sessionToRetryData } = sessionToRetry;
    
    const recoverySyncData = {
      ...sessionToRetryData,
      isRecovery: true,
      recoveryAttempts: (sessionToRetry.recoveryAttempts || 0) + 1,
      branchNumber: this.addAndRound(branchNumber || 1, 0.1),
      recoverySession_id: _id
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
    
    // Update the item with the new recovery session
    if (item && user && recoverySync._id) {
      await plaidItems.update(
        { itemId: item.itemId, userId: user._id },
        { 
          sync_id: recoverySync._id,
          status: 'in_progress'
        }
      );
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

    await plaidItems.update(item._id, { syncTag });
    
    if (!legacySyncData?.cursor) {
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
      prevSuccessfulSession_id: legacySyncData.status === 'complete' || legacySyncData.status === 'completed' ? legacySyncData.cursor : null,
      syncTime,
      syncTag,
      branchNumber: 1, // Default for legacy data
      syncId: `legacy-${randomString(8)}-${syncTime}`,
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
      isLegacy: true,
    };
    
    // Save the migrated sync session
    return await SyncSessions.save(syncSession);
  }

  /**
   * Updates session counts for both normal and recovery flows
   * @param {Object} syncSession - Sync session to update
   * @param {String} type - Type of update ('expected' or 'actual')
   * @param {Object} counts - Count values to set { added, modified, removed }
   * @returns {Promise<void>}
   */
  async updateSessionCounts(syncSession, type, counts) {
    if (!syncSession || !syncSession._id) {
      return;
    }
    
    // Make sure type is either 'expected' or 'actual'
    if (type !== 'expected' && type !== 'actual') {
      console.warn(`Invalid type '${type}' for session counts update`);
      return;
    }

    const { syncCounts = { expected: {}, actual: {} } } = syncSession;
    
    // Set the counts for the specified type
    syncCounts[type] = {
      added: counts.added !== undefined ? counts.added : syncCounts[type].added || 0,
      modified: counts.modified !== undefined ? counts.modified : syncCounts[type].modified || 0,
      removed: counts.removed !== undefined ? counts.removed : syncCounts[type].removed || 0
    };
    
    await SyncSessions.update(
      syncSession._id,
      {
        userId: syncSession.userId,
        syncCounts
      }
    );
    
    return {
      ...syncSession,
      syncCounts
    };
  }

  /**
   * Resolves a sync session based on count comparison (shared resolution phase)
   * @param {Object} syncSession - Current sync session with syncCounts
   * @param {Object} item - The Plaid item
   * @param {Object} user - User object
   * @param {Object} options - Additional options (nextCursor)
   * @returns {Promise<Object>} The resolved session data and next steps
   */
  async resolveSession(syncSession, item, user, options = {}) {
    // Check if counts match using the syncCounts directly from the syncSession
    const countsMatch = this.countsMatch(syncSession.syncCounts);
    const { nextCursor = syncSession.nextCursor } = options;
    
    if (countsMatch) {
      // Success case - create a new sync session with cursor set to next_cursor
      const newSyncSession = await this.createInitialSyncSession(
        syncSession, 
        user, 
        item,
        { 
          branchNumber: syncSession.branchNumber || 1,
          syncId: syncSession.syncId
        }
      );
      
      // Update the previous session with nextSession_id and status
      await SyncSessions.update(
        syncSession._id,
        { 
          nextSession_id: newSyncSession.syncSession._id,
          userId: syncSession.userId,
          status: 'complete',
          nextCursor
        }
      );
      
      // Update item with new sync session reference
      await plaidItems.update(
        { itemId: item.itemId, userId: user._id },
        { 
          sync_id: newSyncSession.syncSession._id,
          status: 'complete'
        }
      );
      
      return {
        success: true,
        newSyncSession: newSyncSession.syncSession,
        countsMatch: true,
        isRecovery: false
      };
    } else {
      // Failure case - create a recovery session
      const recoverySyncSession = await this.createRecoverySyncSession(
        syncSession,
        item,
        user,
        { 
          error: {
            code: 'COUNT_MISMATCH',
            message: `Transaction count mismatch in ${syncSession.isRecovery ? 'recovery' : 'sync'} operation`
          }
        }
      );
      
      // Item is already updated inside createRecoverySyncSession
      
      return {
        success: false,
        recoverySession: recoverySyncSession,
        countsMatch: false,
        isRecovery: true
      };
    }
  }
}

export default new SyncSessionService(); 