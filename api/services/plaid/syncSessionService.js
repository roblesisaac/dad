import SyncSessions from '../../models/syncSession.js';
import plaidItems from '../../models/plaidItems.js';
import randomString from '../../utils/randomString.js';

/**
 * Service responsible for managing sync sessions
 * Handles creating, updating, and retrieving sync sessions
 */
class SyncSessionService {
  /**
   * Creates the very first sync session for an item with no previous sync history
   * @param {Object} user - User object
   * @param {Object} item - The item data
   * @param {Object} options - Additional options for sync session
   * @returns {Promise<Object>} The created sync session and its ID
   */
  async createInitialSync(user, item, options = {}) {
    const syncTime = Date.now();
    const { branchNumber = 1, syncId = null } = options;

    const initialSyncSession = {
      userId: user._id,
      item_id: item._id,
      itemId: item.itemId,
      status: 'in_progress',
      cursor: '', // Empty string for initial sync
      nextCursor: null, // Will be set after processing
      prevSession_id: null,
      prevSuccessfulSession_id: null,
      syncTime,
      syncTag: item.syncTag || null,
      branchNumber,
      syncId: syncId || `${randomString(10)}-${syncTime}`,
      hasMore: false,
      syncCounts: {
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
      failedTransactions: {
        added: [],
        modified: [],
        removed: []
      },
      recoveryAttempts: 0,
      startTimestamp: Date.now(),
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
   * Creates the next sync session based on a previous session
   * @param {Object} previousSync - Previous sync data
   * @param {Object} user - User object
   * @param {Object} item - The item data
   * @param {Object} options - Additional options for sync session
   * @returns {Promise<Object>} The created sync session and its ID
   */
  async createNextSync(previousSync, user, item, options = {}) {
    if (!previousSync) {
      throw new Error('Previous sync session is required for createNextSync');
    }

    const syncTime = Date.now();
    const { branchNumber = 1, syncId = null } = options;

    const nextSyncSession = {
      userId: previousSync.userId || user._id,
      item_id: previousSync.item_id || item._id,
      itemId: previousSync.itemId || item.itemId,
      status: 'in_progress',
      cursor: previousSync.nextCursor || '', 
      nextCursor: null, // Will be set after processing
      prevSession_id: previousSync._id,
      prevSuccessfulSession_id: previousSync.status === 'complete' ? 
        previousSync._id 
        : previousSync.prevSuccessfulSession_id || null,
      syncTime,
      syncTag: item.syncTag || previousSync.syncTag || null,
      branchNumber: previousSync.branchNumber ? previousSync.branchNumber + 1 : branchNumber,
      syncId: syncId || `${randomString(10)}-${syncTime}`,
      hasMore: false,
      syncCounts: {
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
      failedTransactions: {
        added: [],
        modified: [],
        removed: []
      },
      recoveryAttempts: 0,
      startTimestamp: Date.now(),
      transactionsSkipped: []
    };
    
    // Save the next sync session
    const savedSync = await SyncSessions.save(nextSyncSession);
    
    return {
      syncTime,
      syncSession: savedSync
    };
  }

  /**
   * Creates a sync session with explicit data
   * @param {Object} syncSessionData - The data for the sync session
   * @param {Object} user - User object
   * @param {Object} item - The item data
   * @returns {Promise<Object>} The created sync session and its ID
   */
  async createSync(syncSessionData, user, item) {
    const syncTime = Date.now();

    const { _id, syncCounts: oldSyncCounts, ...restSessionData } = syncSessionData;

    // Ensure syncCounts is properly initialized as an object
    const syncCounts = {
      expected: { added: 0, modified: 0, removed: 0 },
      actual: { added: 0, modified: 0, removed: 0 }
    };
    
    // Try to copy values from oldSyncCounts if it's valid
    if (oldSyncCounts && typeof oldSyncCounts === 'object' && typeof oldSyncCounts !== 'string') {
      if (oldSyncCounts.expected && typeof oldSyncCounts.expected === 'object') {
        syncCounts.expected = { ...oldSyncCounts.expected };
      }
      if (oldSyncCounts.actual && typeof oldSyncCounts.actual === 'object') {
        syncCounts.actual = { ...oldSyncCounts.actual };
      }
    }

    // Ensure required fields are set
    const sessionData = {
      ...restSessionData,
      userId: user._id,
      item_id: item._id,
      itemId: item.itemId,
      status: 'in_progress',
      syncTime,
      startTimestamp: Date.now(),
      isRecovery: false,
      syncCounts // Explicitly set the syncCounts as a proper object
    };
    
    // Save the sync session
    const savedSync = await SyncSessions.save(sessionData);
    
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
    if (!sessionToRetry || !sessionToRetry._id) {
      throw new Error('Invalid session to revert to');
    }
    
    const { _id, syncCounts: oldSyncCounts, branchNumber, ...sessionToRetryData } = sessionToRetry;
    const syncTime = Date.now();
    
    // Initialize syncCounts as a proper object
    const syncCounts = {
      expected: { added: 0, modified: 0, removed: 0 },
      actual: { added: 0, modified: 0, removed: 0 }
    };
    
    // Try to copy values from oldSyncCounts if it's valid
    if (oldSyncCounts && typeof oldSyncCounts === 'object' && typeof oldSyncCounts !== 'string') {
      if (oldSyncCounts.expected && typeof oldSyncCounts.expected === 'object') {
        syncCounts.expected = { ...oldSyncCounts.expected };
      }
      if (oldSyncCounts.actual && typeof oldSyncCounts.actual === 'object') {
        syncCounts.actual = { ...oldSyncCounts.actual };
      }
    }
    
    // Ensure branchNumber is a valid number or use default
    const currentBranchNumber = (branchNumber && !isNaN(branchNumber)) ? branchNumber : 1;
    const { recoveryAttempts = 0 } = sessionToRetry;
    
    const recoverySyncData = {
      ...sessionToRetryData,
      syncTime,
      isRecovery: true,
      recoveryAttempts: (recoveryAttempts && !isNaN(recoveryAttempts)) 
        ? recoveryAttempts + 1 
        : 1,
      branchNumber: this.addAndRound(currentBranchNumber, 0.1),
      recoverySession_id: _id,
      syncCounts // Explicitly set the syncCounts as a proper object
    };

    if(revertResult) {
      recoverySyncData.recoveryDetails = {
        transactionsRemoved: revertResult.removedCount?.actual,
        previousbranchNumber: currentBranchNumber,
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
    if (item?.itemId && user?._id && recoverySync?._id) {
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
    // Ensure value is a number and not NaN
    const safeValue = (!value || isNaN(value)) ? 1 : value;
    const safeAddValue = (!addValue || isNaN(addValue)) ? 0.1 : addValue;
    
    let result = safeValue + safeAddValue;
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
      
      // TODO: Add pagination for labels
      const { limit } = options;
      
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
    // If syncCounts is not an object or is a string, counts don't match
    if (!syncCounts || typeof syncCounts !== 'object' || typeof syncCounts === 'string') {
      return true;
    }
    
    // If either expected or actual is missing or not an object, counts don't match
    if (!syncCounts.expected || !syncCounts.actual || 
        typeof syncCounts.expected !== 'object' || typeof syncCounts.actual !== 'object') {
      return false;
    }
    
    return syncCounts.expected.added === syncCounts.actual.added &&
           syncCounts.expected.modified === syncCounts.actual.modified &&
           syncCounts.expected.removed === syncCounts.actual.removed;
  }

  /**
   * Updates timestamps on a sync session
   * @param {Object} syncSession - Sync session to update
   * @param {Object} timestamps - Timestamp values to set
   * @param {Number} timestamps.startTimestamp - Start time of sync operation
   * @param {Number} timestamps.endTimestamp - End time of sync operation
   * @param {Number} timestamps.syncDuration - Duration of sync operation
   * @param {Array} timestamps.transactionsSkipped - Optional transactions skipped
   * @returns {Promise<Object>} Updated sync session
   */
  async updateSessionTimestamps(syncSession, timestamps) {
    if (!syncSession || !syncSession._id) {
      return syncSession;
    }
    
    const updateData = {};
    
    // Only set the fields that are provided and are valid
    if (timestamps.startTimestamp && !isNaN(timestamps.startTimestamp)) {
      updateData.startTimestamp = timestamps.startTimestamp;
    }
    
    if (timestamps.endTimestamp && !isNaN(timestamps.endTimestamp)) {
      updateData.endTimestamp = new Date(timestamps.endTimestamp);
    }
    
    if (timestamps.syncDuration && !isNaN(timestamps.syncDuration)) {
      updateData.syncDuration = timestamps.syncDuration;
    }
    
    if (timestamps.error) {
      updateData.error = timestamps.error;
    }
    
    if (timestamps.transactionsSkipped) {
      updateData.transactionsSkipped = timestamps.transactionsSkipped;
    }
    
    // Only update if we have data to update
    if (Object.keys(updateData).length > 0) {
      try {
        await SyncSessions.update(
          syncSession._id,
          {
            userId: syncSession.userId,
            ...updateData
          }
        );
      } catch (error) {
        console.error(`Error updating session timestamps: ${error.message}`);
        // Log full error details but don't throw - we want to continue execution
        if (error.message.includes('NaN')) {
          console.error('NaN value detected in update data:', updateData);
        }
      }
    }
    
    return {
      ...syncSession,
      ...updateData
    };
  }

  /**
   * Updates the lastNoChangesTime field when no changes are detected in a sync
   * @param {String} syncSession_id - The ID of the sync session to update
   * @param {Number} lastNoChangesTime - Timestamp when no changes were detected
   * @param {Object} options - Additional options
   * @param {Number} options.syncDuration - Optional sync duration
   * @returns {Promise<void>}
   */
  async updateSyncSessionLastNoChangesTime(syncSession_id, lastNoChangesTime, options = {}) {
    if (!syncSession_id) {
      return;
    }
    
    const updateData = {
      lastNoChangesTime,
      status: 'complete', // Ensure status is still complete
      endTimestamp: new Date(lastNoChangesTime)
    };
    
    // Add syncDuration if provided
    if (options.syncDuration) {
      updateData.syncDuration = options.syncDuration;
    }
    
    await SyncSessions.update(
      syncSession_id,
      updateData
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

    // Initialize syncCounts as an object if it's not already one
    let syncCounts = syncSession.syncCounts;
    
    // Check if syncCounts is not an object or is a string
    if (!syncCounts || typeof syncCounts !== 'object' || typeof syncCounts === 'string') {
      syncCounts = {
        expected: { added: 0, modified: 0, removed: 0 },
        actual: { added: 0, modified: 0, removed: 0 }
      };
    }
    
    // Ensure the type object exists
    if (!syncCounts[type] || typeof syncCounts[type] !== 'object') {
      syncCounts[type] = { added: 0, modified: 0, removed: 0 };
    }
    
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
   * @param {Object} options - Additional options
   * @param {String} options.nextCursor - Next cursor for pagination
   * @param {Number} options.endTimestamp - End timestamp
   * @param {Number} options.syncDuration - Sync duration
   * @returns {Promise<Object>} The resolved session data and next steps
   */
  async resolveSession(syncSession, item, user, options = {}) {
    // Add validation at the beginning
    if (!syncSession?._id || !item?.itemId || !user?._id) {
      throw new Error('Invalid or missing data in resolveSession');
    }

    // Check if counts match using the syncCounts directly from the syncSession
    const countsMatch = this.countsMatch(syncSession.syncCounts);
    const { 
      endTimestamp,
      syncDuration
    } = options;

    if(!countsMatch) {
      // Failure case - create a recovery session
      const recoverySyncSession = await this.createRecoverySyncSession(
        syncSession,
        item,
        user, // User is validated above
        {
          error: {
            code: 'COUNT_MISMATCH',
            message: `Transaction count mismatch in ${syncSession.isRecovery ? 'recovery' : 'sync'} operation`,
            timestamp: endTimestamp || Date.now()
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

    let newSyncSession;

    if(syncSession.isRecovery) {
      newSyncSession = await this.createSync({
        ...syncSession,
        branchNumber: Math.floor(syncSession.branchNumber)
      }, user, item);
    } else {
      newSyncSession = await this.createNextSync(
        syncSession, 
        user, 
        item,
        { 
          branchNumber: syncSession.branchNumber || 1,
          syncId: syncSession.syncId
        }
      );
    }

    const updateData = { 
      nextSession_id: newSyncSession.syncSession._id,
      userId: syncSession.userId,
      status: 'complete'
    };
    
    // Only add timestamp data if provided
    if (endTimestamp) {
      updateData.endTimestamp = new Date(endTimestamp);
    }
    
    if (syncDuration) {
      updateData.syncDuration = syncDuration;
    }
    
    // Update the previous session with nextSession_id, status, and timestamps
    await SyncSessions.update(
      syncSession._id,
      updateData
    );
    
    // Update item with new sync session reference
    await plaidItems.update(
      { itemId: item.itemId, userId: user._id }, // Safe due to checks
      {
        sync_id: newSyncSession.syncSession._id, // Ensure newSyncSession.syncSession is valid
        status: 'complete'
      }
    );
    
    return {
      success: true,
      newSyncSession: newSyncSession.syncSession,
      countsMatch: true,
      isRecovery: false
    };

  }
}

export default new SyncSessionService(); 