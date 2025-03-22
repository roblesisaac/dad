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
class recoveryService extends PlaidBaseService {
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

      const sessionToRetry = await syncSessionService.getSyncSession(failedSyncSession._id, user);

      if(!sessionToRetry) {
        throw new CustomError('SYNC_SESSION_NOT_FOUND', 'Sync session not found');
      }
      
      const revertResult = await this.revertToSyncSession(sessionToRetry, validatedItem, user);
      
      // Check if reversion was successful
      if (!revertResult.success) {
        return {
          isRecovered: false,
          message: revertResult.error || 'Unknown error during reversion'
        };
      }
      
      return {
        isRecovered: true,
        removedCount: revertResult.removedCount,
        revertedTo: revertResult.revertedTo
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

  /**
   * Reverts to a specific sync session
   * @param {Object} targetSession - The sync session to revert to
   * @param {Object} item - The Plaid item
   * @param {Object} user - User object
   * @returns {Promise<Object>} Result of the reversion
   */
  async revertToSyncSession(targetSession, item, user) {
    if (!targetSession || !targetSession._id || !item || !user) {
      throw new Error('Invalid parameters for reversion');
    }
    
    try {
      // Use recovery service to revert transactions
      const revertResult = await this.removeTransactionsAfterSyncTime(
        item.itemId,
        user._id,
        targetSession.syncTime - 1
      );
      
      if (!revertResult.isReverted) {
        throw new Error(`Failed to revert: ${revertResult.message}`);
      }
      
      // Create a recovery sync session
      const recoverySyncSession = await syncSessionService.createRecoverySyncSession(
        targetSession,
        { _id: item.sync_id, syncNumber: targetSession.syncNumber },
        revertResult
      );
      
      // Update the item to point to the recovery session
      await plaidItems.update(item._id, {
        status: 'complete',
        sync_id: recoverySyncSession._id
      });
      
      return {
        success: true,
        revertedTo: targetSession._id,
        removedCount: revertResult.removedCount,
        recoverySession: recoverySyncSession._id
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