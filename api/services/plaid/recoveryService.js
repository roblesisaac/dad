import PlaidBaseService from './baseService.js';
import { CustomError } from './customError.js';
import transactionsCrudService from './transactionsCrudService.js';
import syncSessionService from './syncSessionService.js';
import plaidItems from '../../models/plaidItems.js';

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
   * @param {Object} recoverySession - Recovery session to update with counts
   * @returns {Object} Result of the reversion operation
   */
  async removeTransactionsAfterSyncTime(itemId, userId, syncTime, recoverySession = null) {
    try {
      // Validate input parameters
      if (!itemId || !userId || !syncTime) {
        throw new CustomError('INVALID_PARAMS', 'Missing required parameters for transaction reversion');
      }
      
      // Find all transactions with syncTime greater than or equal to referenceSyncTime
      const transactionsToRemove = await this._fetchTransactionsAfterSyncTime(itemId, userId, syncTime);
      const expectedRemovedCount = transactionsToRemove.length;
      
      // Update recovery session with expected count if provided
      if (recoverySession && recoverySession._id) {
        await syncSessionService.updateSessionCounts(
          recoverySession, 
          'expected', 
          { added: 0, modified: 0, removed: expectedRemovedCount }
        );
      }
      
      // Nothing to remove
      if (expectedRemovedCount === 0) {
        // If recoverySession exists, update actual count to 0
        if (recoverySession && recoverySession._id) {
          await syncSessionService.updateSessionCounts(
            recoverySession, 
            'actual', 
            { added: 0, modified: 0, removed: 0 }
          );
        }
        
        return { 
          success: true,
          message: 'No transactions needed to be reverted',
          removedCount: { expected: 0, actual: 0 }
        };
      }
      
      // Use processRemovedTransactions to handle the transaction removal
      const result = await transactionsCrudService.processRemovedTransactions(
        transactionsToRemove,
        userId
      );
      
      // Update recovery session with actual count if provided
      if (recoverySession && recoverySession._id) {
        await syncSessionService.updateSessionCounts(
          recoverySession, 
          'actual', 
          { added: 0, modified: 0, removed: result.successCount }
        );
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
   * Performs reversion operations on a recovery session
   * @param {Object} recoverySession - The recovery session (already created with isRecovery=true)
   * @param {Object} originalSession - The original session to revert to 
   * @param {Object} item - The Plaid item
   * @param {Object} user - User object
   * @returns {Promise<Object>} Result of the reversion
   */
  async performReversion(recoverySession, originalSession, item, user) {
    if (!recoverySession || !recoverySession._id || !originalSession || !originalSession._id || !item || !user) {
      throw new Error('Invalid parameters for reversion');
    }

    try {
      // Find and remove transactions created after the original sync point
      const removalResults = await this.removeTransactionsAfterSyncTime(
        item.itemId,
        user._id,
        originalSession.syncTime - 1,
        recoverySession
      );
      
      // Call resolveSession to handle the resolution phase
      const resolutionResult = await syncSessionService.resolveSession(
        recoverySession,
        item,
        user,
        { nextCursor: originalSession.cursor }
      );
      
      return {
        success: removalResults.removedCount.expected === removalResults.removedCount.actual && resolutionResult.success,
        revertedTo: originalSession._id,
        removedCount: removalResults.removedCount,
        recoverySession,
        resolution: resolutionResult
      };
    } catch (error) {
      console.error(`Error performing reversion for session ${recoverySession._id}:`, error);
      
      // Update the item status to error
      await plaidItems.update(
        { itemId: item.itemId, userId: user._id },
        { status: 'error' }
      );
      
      return {
        success: false,
        error: error.message,
        recoverySession
      };
    }
  }
}

export default new recoveryService(); 