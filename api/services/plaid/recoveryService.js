import PlaidBaseService from './baseService.js';
import { CustomError } from './customError.js';
import transactionsCrudService from './transactionsCrudService.js';
import syncSessionService from './syncSessionService.js';

/**
 * Service responsible for transaction recovery operations
 * Handles reverting transactions and recovering from failed syncs
 */
class recoveryService extends PlaidBaseService {
  /**
   * Find all transactions for an item with cursor or syncTime newer than a reference point
   * @param {String} itemId - The item ID
   * @param {String} userId - User ID
   * @param {Number} referenceSyncTime - Reference sync time
   * @returns {Promise<Object>} Result with transactions
   * @private
   */
  async _fetchTransactionsAfterSyncTime(itemId, userId, referenceSyncTime) {
    try {
      const syncTime = `>${itemId}:${referenceSyncTime}`;
      const transactions = await transactionsCrudService.fetchTransactionsBySyncTime(syncTime, userId);
      
      return transactions || [];
    } catch (error) {
      console.error('Error fetching transactions by syncTime:', error);
      throw new CustomError('FETCH_ERROR', 
        `Failed to fetch transactions after sync time: ${error.message}`);
    }
  }

  /**
   * Reverts transactions to a specific sync time and cursor point
   * Uses the label4 (itemId+syncTime) to find transactions to remove
   * @param {String} itemId - The Plaid item ID
   * @param {String} userId - The user ID
   * @param {String} syncTime - Timestamp
   * @param {Object} syncSession - Optional sync session to update with recovery details
   * @returns {Object} Result of the reversion operation
   */
  async removeTransactionsAfterSyncTime(itemId, userId, syncTime, syncSession = null) {
    try {
      // Validate input parameters
      if (!itemId || !userId || !syncTime) {
        throw new CustomError('INVALID_PARAMS', 'Missing required parameters for transaction reversion');
      }
      
      // Find all transactions with syncTime greater than or equal to referenceSyncTime
      const transactionsToRemove = await this._fetchTransactionsAfterSyncTime(itemId, userId, syncTime );
      const expectedRemovedCount = transactionsToRemove.length;
      
      // Update sync session with expected count if provided
      if (syncSession && syncSession._id) {
        await syncSessionService.updateRecoveryCountDetails(syncSession, 'expected', expectedRemovedCount);
      }
      
      // Nothing to remove
      if (expectedRemovedCount === 0) {
        // If syncSession exists, update actual count to 0
        if (syncSession && syncSession._id) {
          await syncSessionService.updateRecoveryCountDetails(syncSession, 'actual', 0);
        }
        
        return { 
          success: true,
          message: 'No transactions needed to be reverted',
          removedCount: { expected: 0, actual: 0 }
        };
      }
      
      // Use processRemovedTransactions instead of batchRemoveTransactions
      const result = await transactionsCrudService.processRemovedTransactions(
        transactionsToRemove,
        userId
      );
      
      // Update sync session with actual count if provided
      if (syncSession && syncSession._id) {
        await syncSessionService.updateRecoveryCountDetails(syncSession, 'actual', result.successCount);
      }

      return {
        failureCount: result.failedTransactions?.length || 0,
        removedCount: {
          expected: expectedRemovedCount,
          actual: result.successCount
        }
      };
    } catch (error) {
      throw CustomError.createFormattedError(error, { 
        operation: 'remove_transactions_after_sync_time' 
      });
    }
  }

  /**
   * Reverts to a specific sync session
   * @param {Object} targetSession - The sync session to revert to
   * @param {Object} item - The Plaid item
   * @param {Object} user - User object
   * @returns {Promise<Object>} Result of the reversion
   */
  async performReversion(targetSession, item, user) {
    if (!targetSession || !targetSession._id || !item || !user) {
      throw new Error('Invalid parameters for reversion');
    }

    try {
      // Use recovery service to revert transactions
      const removalResults = await this.removeTransactionsAfterSyncTime(
        item.itemId,
        user._id,
        targetSession.syncTime - 1,
        targetSession
      );

      const { actual, expected } = removalResults.removedCount;

      if (actual !== expected) {
        console.error(`Recovery failed: ${actual} (actual) !== ${expected} (expected)`);

        // Create a recovery sync session for retry
        const nextRecoverySession = await syncSessionService.createRecoverySyncSession(
          targetSession,
          removalResults
        );
        
        return {
          success: false,
          recoverySession: nextRecoverySession._id,
          error: removalResults.error
        };
      }
      
      return {
        success: true,
        revertedTo: targetSession._id,
        removedCount: removalResults.removedCount
      };
    } catch (error) {
      console.error(`Error reverting to sync session ${targetSession._id}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new recoveryService(); 