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
  async recoverFailedSync(item, syncSession, user) {
    try {
      // Get item data
      const validatedItem = await itemService.validateAndGetItem(item, user);
      
      if (!validatedItem) {
        throw new CustomError('ITEM_NOT_FOUND', 'Item not found');
      }
      
      // Check if recovery is needed
      if (validatedItem.status !== 'error' && syncSession?.status !== 'error' && syncSessionService.countsMatch(syncSession?.syncCounts)) {
        return {
          recovered: false,
          message: 'Item not in error state, recovery not needed'
        };
      }
      
      // We will use the syncTime from the sync session to revert
      const syncTime = syncSession.syncTime;
      
      // Revert transactions to the last successful cursor
      const revertResult = await this.revertTransactionsToSyncTimeCursor(
        validatedItem.itemId,
        user._id,
        syncSession.prevSuccessfulCursor,
        syncTime
      );
      
      // If reversion failed, return failure
      if (!revertResult.reverted) {
        return {
          recovered: false,
          message: revertResult.message || 'Unknown error during reversion'
        };
      }
      
      // Create a recovery sync syncSession
      const recoverySyncSession = await syncSessionService.createRecoverySyncSession(syncSession, user, validatedItem, revertResult);
      
      // Update item status
      await plaidItems.update(validatedItem._id,
        { 
          status: 'complete',
          sync_id: recoverySyncSession._id
        }
      );
      
      return {
        recovered: true,
        revertedTo: revertResult.revertedTo,
        removedCount: revertResult.removedCount
      };
    } catch (error) {
      throw CustomError.createFormattedError(error, { 
        operation: 'recover_failed_sync' 
      });
    }
  }

  /**
   * Validates parameters for transaction reversion
   * @param {String} itemId - Item ID
   * @param {String} userId - User ID
   * @param {String} cursorToRevertTo - Target cursor to revert to
   * @param {Number} syncTime - Sync time to revert to
   * @returns {Boolean} True if validation passes
   * @throws {Error} If validation fails
   * @private
   */
  _validateRevertParameters(itemId, userId, syncTime) {
    if (!itemId || !userId || !syncTime) {
      throw new CustomError('INVALID_PARAMS', 
        'Missing required parameters for transaction reversion');
    }
    return true;
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
      const syncTime = `>=${itemId}:${referenceSyncTime}`;
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
   * @param {String} cursorToRevertTo - Target cursor to revert to
   * @param {Number} syncTime - Sync time to revert to
   * @returns {Object} Result of the reversion operation
   */
  async revertTransactionsToSyncTimeCursor(itemId, userId, cursorToRevertTo, syncTime) {
    try {
      // Validate input parameters
      this._validateRevertParameters(itemId, userId, syncTime);
      
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
          reverted: true,
          message: 'No transactions needed to be reverted',
          revertedTo: cursorToRevertTo,
          removedCount: 0
        };
      }
      
      // Get transaction IDs to remove
      const txIdsToRemove = transactionsToRevert.map(tx => tx.transaction_id);

      console.log('txIdsToRemove', txIdsToRemove.length);
      
      // Remove the transactions
      let removedCount = await transactionsCrudService.batchRemoveTransactions(txIdsToRemove, userId);

      console.log('removedCount', removedCount);
      
      return {
        reverted: true,
        removedCount,
        revertedTo: cursorToRevertTo
      };
    } catch (error) {
      throw CustomError.createFormattedError(error, { 
        operation: 'revert_transactions' 
      });
    }
  }
}

export default new TransactionRecoveryService(); 