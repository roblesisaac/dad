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

    const { _id, branchNumber = 1, error, failedTransactions, ...restPreviousSync } = prevSync;

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
      nextSession_id: nextSync._id,
      status: 'complete'
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
        ...sessionToRetry,
        nextSession_id: recoverySync._id,
        status: 'error'
      });
    }

    // Update item status with recovery
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
      
      // Handle deserialization of failedTransactions
      if (syncSession.failedTransactions) {
        syncSession.failedTransactions = this.deserializeFailedTransactions(syncSession.failedTransactions);
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
      
      // Deserialize failedTransactions in each session
      const processedSessions = (sessions.items || []).map(session => {
        if (session.failedTransactions) {
          session.failedTransactions = this.deserializeFailedTransactions(session.failedTransactions);
        }
        return session;
      });
      
      return processedSessions;
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
    
    // Check if failedTransactions is potentially already a stringified object
    if (typeof failedTransactions === 'string') {
      try {
        failedTransactions = JSON.parse(failedTransactions);
      } catch (e) {
        console.error('Failed to parse stringified failedTransactions:', e);
        return {
          added: [],
          modified: [],
          removed: [],
          skipped: []
        };
      }
    }
    
    // Ensure we have properly structured arrays
    const normalized = {
      added: Array.isArray(failedTransactions.added) ? failedTransactions.added : [],
      modified: Array.isArray(failedTransactions.modified) ? failedTransactions.modified : [],
      removed: Array.isArray(failedTransactions.removed) ? failedTransactions.removed : [],
      skipped: Array.isArray(failedTransactions.skipped) ? failedTransactions.skipped : []
    };
    
    // Sanitize each array to ensure all items are objects with safe properties
    Object.keys(normalized).forEach(key => {
      if (normalized[key].length > 0) {
        // Map through each item to ensure it's a clean object
        normalized[key] = normalized[key].map(item => {
          // Handle if item is a string (potentially a stringified object)
          if (typeof item === 'string') {
            try {
              return JSON.parse(item);
            } catch (e) {
              // If we can't parse it, return a basic object
              return { transaction_id: item, error: 'Unparseable item' };
            }
          }
          
          // For objects, create a clean copy
          if (item && typeof item === 'object') {
            // Extract important properties to ensure we don't have circular references
            const safeItem = {};
            
            // Only copy safe, serializable properties
            ['transaction_id', 'account_id', 'user_id', 'error', 'message', 'code', 'type']
              .forEach(prop => {
                if (item[prop] !== undefined) {
                  safeItem[prop] = item[prop];
                }
              });
              
            // If we found no properties, add a placeholder
            if (Object.keys(safeItem).length === 0) {
              safeItem.unknown = true;
            }
            
            return safeItem;
          }
          
          // Fallback for other types
          return { value: String(item) };
        });
      } else {
        normalized[key] = [];
      }
    });
    
    return normalized;
  }

  /**
   * Serializes the failedTransactions object to a JSON string
   * @private
   */
  serializeFailedTransactions(value) {
    if (!value) {
      console.log('Serializing empty failedTransactions');
      return JSON.stringify({
        added: [], modified: [], removed: [], skipped: []
      });
    }
    
    try {
      // Handle case where value is already a string
      if (typeof value === 'string') {
        // Validate it's proper JSON
        JSON.parse(value);
        console.log('failedTransactions already serialized');
        return value;
      }
      
      // Ensure value has the expected structure
      const result = {
        added: Array.isArray(value.added) ? value.added : [],
        modified: Array.isArray(value.modified) ? value.modified : [],
        removed: Array.isArray(value.removed) ? value.removed : [],
        skipped: Array.isArray(value.skipped) ? value.skipped : []
      };
      
      const serialized = JSON.stringify(result);
      console.log(`Serialized failedTransactions (${serialized.length} chars)`);
      return serialized;
    } catch (e) {
      console.error('Error serializing failedTransactions:', e);
      return JSON.stringify({
        added: [], modified: [], removed: [], skipped: [],
        error: 'Serialization error'
      });
    }
  }

  /**
   * Deserializes the failedTransactions string to an object
   * @private
   */
  deserializeFailedTransactions(value) {
    if (!value || value === "") {
      console.log('Deserializing empty failedTransactions value');
      return {
        added: [], modified: [], removed: [], skipped: []
      };
    }
    
    try {
      // Already an object, just ensure proper structure
      if (typeof value === 'object' && !Array.isArray(value)) {
        console.log('failedTransactions already an object');
        return {
          added: Array.isArray(value.added) ? value.added : [],
          modified: Array.isArray(value.modified) ? value.modified : [],
          removed: Array.isArray(value.removed) ? value.removed : [],
          skipped: Array.isArray(value.skipped) ? value.skipped : []
        };
      }
      
      // Parse the string
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      console.log('Deserialized failedTransactions successfully');
      
      return {
        added: Array.isArray(parsed.added) ? parsed.added : [],
        modified: Array.isArray(parsed.modified) ? parsed.modified : [],
        removed: Array.isArray(parsed.removed) ? parsed.removed : [],
        skipped: Array.isArray(parsed.skipped) ? parsed.skipped : []
      };
    } catch (e) {
      console.error('Error deserializing failedTransactions:', e);
      return {
        added: [], modified: [], removed: [], skipped: [],
        deserializeError: typeof value === 'string' ? value.substring(0, 100) : String(value)
      };
    }
  }

  /**
   * Updates various metadata on a sync session including timestamps, errors, and transaction data
   * @returns {Promise<Object>} Updated sync session
   */
  async updateSessionMetadata(syncSession, metadata) {
    console.log('metadata', metadata);
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
          const preparedFailedTransactions = {
            added: normalizedFailedTransactions.added.length > 0 ? 
              normalizedFailedTransactions.added.map(item => ({...item})) : [],
            modified: normalizedFailedTransactions.modified.length > 0 ? 
              normalizedFailedTransactions.modified.map(item => ({...item})) : [],
            removed: normalizedFailedTransactions.removed.length > 0 ? 
              normalizedFailedTransactions.removed.map(item => ({...item})) : [],
            skipped: normalizedFailedTransactions.skipped.length > 0 ? 
              normalizedFailedTransactions.skipped.map(item => ({...item})) : []
          };
          
          // Serialize the failedTransactions before saving to database
          updateData.failedTransactions = this.serializeFailedTransactions(preparedFailedTransactions);
          
          // Debug logging to verify structure
          console.log('failedTransactions prepared for database:', 
            updateData.failedTransactions.substring(0, 200) + '...');
        }
      } catch (err) {
        console.error('Error processing failedTransactions:', err);
        // Don't include failedTransactions if there was an error processing it
      }
    }

    console.log('updateData', updateData);
    
    try {
      // Include all update data in a single update operation with userId
      const updatedSession = await SyncSessions.update(
        syncSession._id,
        {
          userId: syncSession.userId,
          ...updateData
        }
      );
      
      console.log('Session updated successfully with all data including failedTransactions');
      
      // Basic validation of returned session
      if (updatedSession && metadata.failedTransactions && 
          (!updatedSession.failedTransactions || 
           updatedSession.failedTransactions === '{}' ||
           updatedSession.failedTransactions === '[]' ||
           updatedSession.failedTransactions === '')) {
        console.warn('Warning: failedTransactions may not have been saved correctly');
      }
      
      // Make sure to deserialize before returning
      if (updatedSession && updatedSession.failedTransactions) {
        updatedSession.failedTransactions = this.deserializeFailedTransactions(updatedSession.failedTransactions);
      }
      
      return updatedSession;
    } catch (error) {
      console.error(`Error updating session metadata: ${error.message}`, error);
      
      // More detailed error logging
      if (error.message.includes('NaN')) {
        console.error('NaN value detected in update data:', updateData);
      }
      
      // Try direct update with full data for debugging
      try {
        console.log('Attempting direct update with complete session data');
        
        // Make sure to serialize failedTransactions in the complete session data
        const completeUpdateData = { ...syncSession, ...updateData };
        if (completeUpdateData.failedTransactions && typeof completeUpdateData.failedTransactions !== 'string') {
          completeUpdateData.failedTransactions = this.serializeFailedTransactions(completeUpdateData.failedTransactions);
        }
        
        const directUpdate = await SyncSessions.update(
          syncSession._id,
          completeUpdateData
        );
        
        // Deserialize for return
        if (directUpdate && directUpdate.failedTransactions) {
          directUpdate.failedTransactions = this.deserializeFailedTransactions(directUpdate.failedTransactions);
        }
        
        return directUpdate;
      } catch (directError) {
        console.error('Direct update failed:', directError);
        
        // Return the original session with the data we tried to update
        // This keeps the data in memory even if DB update failed
        const result = {
          ...syncSession,
          ...metadata
        };
        
        // Ensure failedTransactions is properly structured if present
        if (result.failedTransactions) {
          result.failedTransactions = this.deserializeFailedTransactions(result.failedTransactions);
        }
        
        return result;
      }
    }
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
          { 
            ...syncSession,
            endTimestamp,
            syncDuration,
          },
          user,
          item,
          {
            error: {
              code: 'COUNT_MISMATCH',
              message: `Transaction count mismatch in ${syncSession.isRecovery ? 'recovery' : 'sync'} operation`,
              timestamp: Date.now()
            }
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
   * Updates the sync session with transaction data
   * This is a specialized wrapper around updateSessionMetadata focused on transaction data
   * @returns {Promise<Object>} Updated sync session
   */
  async updateSessionWithTransactionData(syncSession, transactionData) {
    if (!syncSession || !syncSession._id) {
      console.error('Cannot update session with transaction data: Invalid session');
      return syncSession;
    }
    
    try {
      // Check if failedTransactions exists in the input data
      const hasFailedTransactions = transactionData && 
        transactionData.failedTransactions && 
        typeof transactionData.failedTransactions === 'object';
        
      if (hasFailedTransactions) {
        // Log the structure for debugging
        console.log('updateSessionWithTransactionData - failedTransactions structure:',
          Object.keys(transactionData.failedTransactions).join(', '));
          
        // Count the number of items in each category for logging
        const counts = {};
        Object.keys(transactionData.failedTransactions).forEach(key => {
          const array = transactionData.failedTransactions[key];
          counts[key] = Array.isArray(array) ? array.length : 0;
        });
        console.log('updateSessionWithTransactionData - item counts:', counts);
      } else {
        console.log('updateSessionWithTransactionData - no failedTransactions data provided');
      }
      
      // Update the session with the transaction data
      const updatedSession = await this.updateSessionMetadata(syncSession, transactionData);
      
      // Verify the update was successful for the failedTransactions field
      if (hasFailedTransactions && updatedSession) {
        if (!updatedSession.failedTransactions) {
          console.error('Failed to save failedTransactions - field missing from updated session');
        } else if (typeof updatedSession.failedTransactions === 'string') {
          // If it's still a string, deserialize it
          updatedSession.failedTransactions = this.deserializeFailedTransactions(updatedSession.failedTransactions);
          console.log('Deserialized returned failedTransactions from string');
        }
        
        // Log counts for verification
        if (typeof updatedSession.failedTransactions === 'object') {
          const counts = {};
          Object.keys(updatedSession.failedTransactions).forEach(key => {
            const array = updatedSession.failedTransactions[key];
            counts[key] = Array.isArray(array) ? array.length : 0;
          });
          console.log('Updated session failedTransactions counts:', counts);
        }
      }
      
      return updatedSession;
    } catch (error) {
      console.error('Error in updateSessionWithTransactionData:', error);
      return syncSession;
    }
  }
}

export default new SyncSessionService(); 