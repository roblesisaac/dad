import PlaidBaseService from './baseService.js';
import itemService from './itemService.js';
import { CustomError } from './customError.js';
import transactionsCrudService from './transactionsCrudService.js';
import plaidItems from '../../models/plaidItems.js';
import syncSessionService from './syncSessionService.js';

/**
 * Service responsible for transaction recovery operations
 * Handles reverting transactions and recovering from failed syncs
 */
class TransactionRecoveryService extends PlaidBaseService {
  /**
   * Recover from a failed sync by reverting to last successful cursor
   * @param {Object|String} item - Item object or ID
   * @param {Object} syncSession - Sync data syncSession
   * @param {Object} user - User object
   * @returns {Object} Recovery result
   */
  async recoverFailedSync(item, failedSyncSession, user) {
    try {
      // Get item data
      const validatedItem = await itemService.validateAndGetItem(item, user);
      
      if (!validatedItem) {
        throw new CustomError('ITEM_NOT_FOUND', 'Item not found');
      }
      
      // Check if recovery is needed
      if (validatedItem.status !== 'error' && failedSyncSession?.status !== 'error' && syncSessionService.countsMatch(failedSyncSession?.syncCounts)) {
        return {
          isRecovered: false,
          message: 'Item not in error state, recovery not needed'
        };
      }

      const sessionToRetry = await syncSessionService.getSyncSession(failedSyncSession.prevSession_id, user);

      if(!sessionToRetry) {
        throw new CustomError('SYNC_SESSION_NOT_FOUND', 'Sync session not found');
      }
      
      // Revert transactions to the last successful cursor
      const revertResult = await this.removeTransactionsAfterSyncTime(
        validatedItem.itemId,
        user._id,
        sessionToRetry.syncTime
      );
      
      // If reversion failed, return failure
      if (!revertResult.isReverted) {
        return {
          isRecovered: false,
          message: revertResult.message || 'Unknown error during reversion'
        };
      }
      
      // Create a recovery sync syncSession
      const recoverySyncSession = await syncSessionService.createRecoverySyncSession(sessionToRetry, failedSyncSession, revertResult);
      
      // Update item status
      await plaidItems.update(validatedItem._id,
        { 
          status: 'complete',
          sync_id: recoverySyncSession._id
        }
      );
      
      return {
        isRecovered: true,
        removedCount: revertResult.removedCount
      };
    } catch (error) {
      throw CustomError.createFormattedError(error, { 
        operation: 'recover_failed_sync' 
      });
    }
  }

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
      
      return transactions;
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
   * @returns {Object} Result of the reversion operation
   */
  async removeTransactionsAfterSyncTime(itemId, userId, syncTime) {
    try {
      // Validate input parameters
      if (!itemId || !userId || !syncTime) {
        throw new CustomError('INVALID_PARAMS', 
          'Missing required parameters for transaction reversion');
      }
      
      // Find all transactions with syncTime greater than or equal to referenceSyncTime
      const transactionsResult = await this._fetchTransactionsAfterSyncTime(
        itemId,
        userId, 
        syncTime
      );
      
      const transactionsToRevert = transactionsResult || [];
      
      // Nothing to remove
      if (transactionsToRevert.length === 0) {
        return { 
          isReverted: true,
          message: 'No transactions needed to be reverted',
          removedCount: 0
        };
      }
      
      console.log('Transactions to remove:', transactionsToRevert.length);
      
      // Use processRemovedTransactions instead of batchRemoveTransactions
      const result = await transactionsCrudService.processRemovedTransactions(
        transactionsToRevert,
        userId
      );

      console.log('Removed transactions result:', result);
      
      return {
        isReverted: true,
        removedCount: result.successCount,
        failureCount: result.failedTransactions?.length || 0
      };
    } catch (error) {
      throw CustomError.createFormattedError(error, { 
        operation: 'remove_transactions_after_sync_time' 
      });
    }
  }
}

export default new TransactionRecoveryService(); 