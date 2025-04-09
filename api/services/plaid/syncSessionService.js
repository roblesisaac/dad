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
   * @returns {Promise<Object>} The created sync session and its ID
   */
  async createInitialSync(user, item) {
    const initialSyncSession = {
      branchNumber: 1,
      hasMore: false
    };
    
    // Save the initial sync session
    return await this.createSync(initialSyncSession, user, item);
  }

  /**
   * Creates the next sync session based on a previous session
   * @returns {Promise<Object>} The created sync session and its ID
   */
  async createNextSync(prevSync, user, item) {
    if (!prevSync) {
      throw new Error('Previous sync session is required for createNextSync');
    }

    const { _id, branchNumber = 1, error, failedTransactions, syncCounts, ...restPreviousSync } = prevSync;

    const nextSyncSession = {
      ...restPreviousSync,
      cursor: prevSync.nextCursor || '',
      prevSession_id: prevSync._id,
      prevSuccessfulSession_id: prevSync.status === 'complete' ? prevSync._id : prevSync.prevSuccessfulSession_id || null,
      branchNumber: branchNumber + 1,
      isRecovery: false,
    }
    
    // Save the next sync session
    const nextSync = await this.createSync(nextSyncSession, user, item);

    // Update prevSync with nextSession_id
    await SyncSessions.update(prevSync._id, {
      nextSession_id: nextSync._id

    });

    return nextSync;
  }

  /**
   * Creates a sync session with explicit data
   * @returns {Promise<Object>} The created sync session and its ID
   */
  async createSync(syncSessionData, user, item) {
    const syncTime = Date.now();

    const { _id, ...restSessionData } = syncSessionData;

    // Ensure syncCounts is properly initialized as an object
    const syncCounts = {
      expected: { added: 0, modified: 0, removed: 0 },
      actual: { added: 0, modified: 0, removed: 0 }
    };

    // Ensure required fields are set
    const sessionData = {
      ...restSessionData,
      userId: user._id,
      item_id: item._id,
      itemId: item.itemId,
      syncTime,
      syncTag: item.syncTag || restSessionData.syncTag || null,
      syncId: `${randomString(10)}-${syncTime}`,
      startTimestamp: syncTime,
      syncCounts
    };
    
    // Save the sync session
    const savedSync = await SyncSessions.save(sessionData);

    // Update the item with the new sync session reference
    await plaidItems.update(item._id, { sync_id: savedSync._id });
    
    return savedSync;
  }

  /**
   * Creates a recovery sync session
   * @param {Object} sessionToRetry - The target session to revert to
   * @returns {Promise<Object>} Created recovery sync session
   */
  async createRecoverySyncSession(sessionToRetry, user, item, revertResult = null) {
    if (!sessionToRetry || !sessionToRetry._id) {
      throw new Error('Invalid session to revert to');
    }
    
    const { 
      _id, 
      branchNumber, 
      recoveryAttempts = 0,
      error,
      failedTransactions,
      ...sessionToRetryData 
    } = sessionToRetry;
    
    // Ensure branchNumber is a valid number or use default
    const currentBranchNumber = (!isNaN(branchNumber)) ? branchNumber : 1;
    
    const recoverySyncData = {
      ...sessionToRetryData,
      isRecovery: true,
      error: revertResult?.error || null,
      recoveryAttempts: !isNaN(recoveryAttempts) 
        ? recoveryAttempts + 1 
        : 1,
      branchNumber: this.addAndRound(currentBranchNumber, 0.1),
      recoverySession_id: _id
    };

    if(revertResult) {
      recoverySyncData.recoveryDetails = {
        transactionsRemoved: revertResult.removedCount?.actual,
        previousbranchNumber: currentBranchNumber,
        previousSyncId: sessionToRetry.syncId
      }
    }

    const recoverySync = await this.createSync(recoverySyncData, user, item);

    // Only update nextSession_id if failedSyncSession has a proper _id
    if(sessionToRetry?._id && recoverySync?._id) {
      await SyncSessions.update(sessionToRetry._id, {
        nextSession_id: recoverySync._id
      });
    }

    // Update item status to recovery
    await plaidItems.update(item._id, { status: 'recovery' });
    
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
   * Creates an end timestamp and calculates the sync duration
   * @returns {Object} - Object with endTimestamp and syncDuration
   */
  calcEndTimestampAndSyncDuration(syncSession) {
    if(!syncSession) {
      return { endTimestamp: Date.now(), syncDuration: 0 };
    }

    const endTimestamp = Date.now();
    const startTimestamp = syncSession.startTimestamp;
    const syncDuration = (startTimestamp && !isNaN(startTimestamp) ? 
        endTimestamp - startTimestamp : 0);

    return {
      endTimestamp,
      syncDuration 
    };
  }

  /**
   * Checks if expected and actual transaction counts match
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
   * Normalizes the failedTransactions object to ensure it has the correct structure
   * @private
   */
  normalizeFailedTransactions(failedTransactions) {
    // If not an object or null/undefined, create an empty structure
    if (!failedTransactions || typeof failedTransactions !== 'object') {
      return {
        added: [],
        modified: [],
        removed: [],
        skipped: []
      };
    }
    
    // Ensure we have properly structured arrays
    const normalized = {
      added: Array.isArray(failedTransactions.added) ? failedTransactions.added : [],
      modified: Array.isArray(failedTransactions.modified) ? failedTransactions.modified : [],
      removed: Array.isArray(failedTransactions.removed) ? failedTransactions.removed : [],
      skipped: Array.isArray(failedTransactions.skipped) ? failedTransactions.skipped : []
    };
    
    // Cleanup for empty arrays
    Object.keys(normalized).forEach(key => {
      if (normalized[key].length === 0) {
        normalized[key] = [];
      }
    });
    
    return normalized;
  }

  /**
   * Updates various metadata on a sync session including timestamps, errors, and transaction data
   * @returns {Promise<Object>} Updated sync session
   */
  async updateSessionMetadata(syncSession, metadata) {
    if (!syncSession || !syncSession._id) {
      return syncSession;
    }
    
    const updateData = {};
    
    if (metadata.error) {
      updateData.error = metadata.error;
    }

    // Add support for recoveryDetails
    if (metadata.recoveryDetails) {
      updateData.recoveryDetails = metadata.recoveryDetails;
    }
    
    // Handle failedTransactions with extra care to ensure it's a valid object
    if (metadata.failedTransactions) {
      try {
        // Normalize the failedTransactions structure
        const normalizedFailedTransactions = this.normalizeFailedTransactions(metadata.failedTransactions);
        
        // Check if any arrays have content
        const hasItems = Object.values(normalizedFailedTransactions).some(arr => arr.length > 0);
        
        // Only include if we have actual content
        if (hasItems) {
          // Create a fresh object with the correct structure to avoid any reference issues
          updateData.failedTransactions = {
            added: normalizedFailedTransactions.added.length > 0 ? 
              normalizedFailedTransactions.added.map(item => ({...item})) : [],
            modified: normalizedFailedTransactions.modified.length > 0 ? 
              normalizedFailedTransactions.modified.map(item => ({...item})) : [],
            removed: normalizedFailedTransactions.removed.length > 0 ? 
              normalizedFailedTransactions.removed.map(item => ({...item})) : [],
            skipped: normalizedFailedTransactions.skipped.length > 0 ? 
              normalizedFailedTransactions.skipped.map(item => ({...item})) : []
          };
        }
      } catch (err) {
        console.error('Error processing failedTransactions:', err);
        // Don't include failedTransactions if there was an error processing it
      }
    }
    
    // Only update if we have data to update
    if (Object.keys(updateData).length > 0) {
      try {        
        // Store failedTransactions separately since it's a complex object
        const failedTransactions = updateData.failedTransactions ? 
          JSON.parse(JSON.stringify(updateData.failedTransactions)) : undefined;
        
        // Remove complex objects from the update data
        if (failedTransactions) {
          delete updateData.failedTransactions;
        }
        
        // First update the basic fields
        let updatedSession = await SyncSessions.update(
          syncSession._id,
          {
            userId: syncSession.userId,
            ...updateData
          }
        );
        
        // Then update failedTransactions separately if it exists
        if (failedTransactions) {
          updatedSession = await SyncSessions.update(
            syncSession._id,
            {
              userId: syncSession.userId,
              failedTransactions
            }
          );
        }

        return updatedSession;
      } catch (error) {
        console.error(`Error updating session metadata: ${error.message}`);
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
   * @returns {Promise<void>}
   */
  async updateSyncSessionLastNoChangesTime(syncSession) {
    if (!syncSession?._id) {
      return;
    }

    const { endTimestamp, syncDuration } = this.calcEndTimestampAndSyncDuration(syncSession);
    
    const updateData = {
      endTimestamp,
      syncDuration,
      lastNoChangesTime: endTimestamp,
      status: 'complete',
      error: null
    };
    
    return await SyncSessions.update(
      syncSession._id,
      updateData
    );
  }

  /**
   * Creates a sync session from legacy sync data stored directly on the item
   * Used for migration from old sync format to new sync session format
   * @returns {Promise<Object>} The created sync session
   */
  async createSyncSessionFromLegacy(user, item) {
    const legacyData = item.syncData;
    const { result } = legacyData;
    const syncTag = randomString(4, { isUppercase: true });

    if (!legacyData?.cursor) {
      throw new Error('Invalid legacy sync data provided for migration');
    }

    // Convert legacy syncData format to syncSession format
    const status = legacyData.status === 'completed' ? 'complete' : legacyData.status;
    
    const syncSessionData = {
      status,
      cursor: legacyData.cursor,
      nextCursor: legacyData.cursor, // Only one cursor field in legacy
      prevSuccessfulSession_id: status === 'complete' ? legacyData.cursor : null,
      syncTag,
      branchNumber: 1,
      syncCounts: {
        expected: {
          added: result?.itemsAddedCount || 0,
          modified: result?.itemsModifiedCount || 0,
          removed: result?.itemsRemovedCount || 0
        },
        actual: {
          added: result?.itemsAddedCount || 0,
          modified: result?.itemsModifiedCount || 0,
          removed: result?.itemsRemovedCount || 0
        }
      },
      error: result?.errorMessage || null,
      isLegacy: true,
    };
    
    // Save the migrated sync session
    const syncSession = await this.createSync(syncSessionData, user, item);

    // Update the item with the new syncTag
    await plaidItems.update(item._id, { syncTag, sync_id: syncSession._id });
    
    return syncSession;
  }

  /**
   * Updates session counts for both normal and recovery flows
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

  async updateSessionCursor(syncSession, nextCursor) {
    if (!syncSession || !syncSession._id) {
      return;
    }
    
    const updatedSession = await SyncSessions.update(
      syncSession._id,
      {
        userId: syncSession.userId,
        nextCursor
      }
    );

    return updatedSession;
  }

  /**
   * Resolves a sync session based on count comparison (shared resolution phase)
   * @returns {Promise<Object>} The resolved session data and next steps
   */
  async resolveSession(syncSession, user, item) {
    // Add validation at the beginning
    if (!syncSession?._id || !item?.itemId || !user?._id) {
      throw new Error('Invalid or missing data in resolveSession');
    }

    // Calculate end timestamp and duration
    const { endTimestamp, syncDuration } = this.calcEndTimestampAndSyncDuration(syncSession);
    
    try {
      // Check if counts match using the syncCounts directly from the syncSession
      const countsMatch = this.countsMatch(syncSession.syncCounts);

      if(!countsMatch) {
        // Failure case - create a recovery session
        const recoverySyncSession = await this.createRecoverySyncSession(
          syncSession,
          user,
          item,
          {
            error: {
              code: 'COUNT_MISMATCH',
              message: `Transaction count mismatch in ${syncSession.isRecovery ? 'recovery' : 'sync'} operation`,
              timestamp: endTimestamp
            }
          }
        );
        
        // Update current session with timestamps and error status
        await SyncSessions.update(
          syncSession._id,
          {
            userId: syncSession.userId,
            endTimestamp,
            syncDuration,
            status: 'error'
          }
        );
        
        return {
          success: false,
          recoverySession: recoverySyncSession,
          countsMatch: false,
          isRecovery: true,
          timestamp: endTimestamp,
          duration: syncDuration
        };
      }

      // For successful cases, create a new session
      // createSync and createNextSync both handle updating the item and previous session
      const newSyncSession = syncSession.isRecovery 
        ? await this.createSync({
          ...syncSession,
          branchNumber: Math.floor(syncSession.branchNumber),
          isRecovery: false
        }, user, item)
        : await this.createNextSync(syncSession, user, item);
      
      // Always update the completed session with finalized timestamps and status
      await SyncSessions.update(
        syncSession._id,
        {
          userId: syncSession.userId,
          endTimestamp: new Date(endTimestamp),
          syncDuration,
          status: 'complete'
        }
      );
      
      return {
        success: true,
        newSyncSession: newSyncSession,
        countsMatch: true,
        isRecovery: false,
        timestamp: endTimestamp,
        duration: syncDuration
      };
    } catch (error) {
      console.error(`Error in resolveSession: ${error.message}`);
      
      if(syncSession._id) {
        await SyncSessions.update(
          syncSession._id,
          {
            userId: syncSession.userId,
            endTimestamp: new Date(endTimestamp),
            syncDuration,
            status: 'error',
            error: {
              message: error.message,
              timestamp: endTimestamp
            }
          }
        );
      }
      
      // Re-throw the original error for proper error handling upstream
      throw error;
    }
  }

  /**
   * Creates a sync session that continues without recovery
   * Used when user chooses to skip recovery flow for a recovery session
   * @param {Object} recoverySession - The recovery session to continue from
   * @param {Object} user - User object
   * @param {Object} item - Item object
   * @returns {Promise<Object>} The created sync session
   */
  async createContinueWithoutRecoverySync(recoverySession, user, item) {
    if (!recoverySession) {
      throw new Error('Recovery session is required for createContinueWithoutRecoverySync');
    }

    if (!recoverySession.isRecovery) {
      throw new Error('This method can only be used with recovery sessions');
    }

    const { 
      _id, 
      branchNumber = 1, 
      error, 
      failedTransactions, 
      syncCounts, // Explicitly exclude syncCounts
      isRecovery,
      recoverySession_id,
      recoveryDetails,
      recoveryAttempts,
      ...restSessionData 
    } = recoverySession;

    const nextSyncSession = {
      ...restSessionData,
      cursor: recoverySession.nextCursor || '',
      prevSession_id: recoverySession._id,
      prevSuccessfulSession_id: recoverySession.prevSuccessfulSession_id || null,
      branchNumber: Math.floor(branchNumber) + 1, // Use whole number for branch
      isRecovery: false,
      continuedFromRecovery: true, // Mark as continued from recovery
      recoverySkipped: {
        originalRecoveryId: recoverySession._id,
        timestamp: Date.now()
      }
    };

    // Save the next sync session
    const nextSync = await this.createSync(nextSyncSession, user, item);

    // Update recovery session with nextSession_id
    await SyncSessions.update(recoverySession._id, {
      nextSession_id: nextSync._id,
      status: 'complete' // Mark the recovery session as complete
    });

    // Update item status to complete (from recovery)
    await plaidItems.update(item._id, { status: 'complete' });

    return nextSync;
  }
}

export default new SyncSessionService(); 