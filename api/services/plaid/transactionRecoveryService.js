import PlaidBaseService from './baseService.js';
import itemService from './itemService.js';
import { CustomError } from './customError.js';
import transactionsCrudService from './transactionsCrudService.js';

/**
 * Service responsible for transaction recovery operations
 * Handles reverting transactions and recovering from failed syncs
 */
class TransactionRecoveryService extends PlaidBaseService {
  /**
   * Recover from a failed sync by reverting to last successful cursor
   * @param {Object|String} item - Item object or ID
   * @param {Object} user - User object
   * @returns {Object} Recovery result
   */
  async recoverFailedSync(item, user) {
    try {
      // Get item data
      const validatedItem = await itemService.validateAndGetItem(item, user);
      
      if (!validatedItem) {
        throw new CustomError('ITEM_NOT_FOUND', 'Item not found');
      }
      
      const { syncData } = validatedItem;
      
      // Check if recovery is needed
      if (syncData?.status !== 'error') {
        return {
          recovered: false,
          message: 'Item not in error state, recovery not needed'
        };
      }
      
      // Check if we have a last successful cursor
      if (!syncData?.lastSuccessfulCursor) {
        return {
          recovered: false,
          message: 'No last successful cursor found for recovery'
        };
      }
      
      // Revert transactions to the last successful cursor
      const revertResult = await this.revertTransactionsToCursor(
        validatedItem.itemId || validatedItem._id,
        user._id,
        syncData.lastSuccessfulCursor
      );
      
      // If reversion failed, return failure
      if (!revertResult.reverted) {
        return {
          recovered: false,
          message: revertResult.message || 'Unknown error during reversion'
        };
      }
      
      // Update recovery stats
      await itemService.updateItemSyncStatus(validatedItem.itemId, user._id, {
        recoveryAttempts: (syncData.recoveryAttempts || 0) + 1,
        lastRecoveryAt: new Date().toISOString()
      });
      
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
   * @private
   */
  _validateRevertParameters(itemId, userId, cursorToRevertTo) {
    if (!itemId || !userId || !cursorToRevertTo) {
      throw new CustomError('INVALID_PARAMS', 
        'Missing required parameters for transaction reversion');
    }
    return true;
  }

  /**
   * Finds and validates a reference transaction for reversion
   * @private
   */
  async _findReferenceTransaction(cursorToRevertTo, userId) {
    const referenceTx = await transactionsCrudService.fetchTransactionByCursor(cursorToRevertTo, userId);
    
    if (!referenceTx) {
      return { 
        valid: false,
        message: 'No reference transaction found with the target cursor' 
      };
    }
    
    // Validate syncId format
    const syncIdParts = referenceTx.syncId.split('_');
    if (syncIdParts.length < 2) {
      return {
        valid: false,
        message: 'Reference transaction has invalid syncId format'
      };
    }
    
    return {
      valid: true,
      transaction: referenceTx,
      batchTime: syncIdParts[syncIdParts.length - 1]
    };
  }

  /**
   * Builds a syncId range query for finding transactions newer than a reference point
   * @private
   */
  _buildSyncIdRangeQuery(itemId, referenceBatchTime) {
    // Format base values without prefix
    const baseSyncId = `${itemId}`;
    
    // Increment the batch time by 1 to exclude the reference transaction
    // and any transactions exactly at the same time
    const incrementedBatchTime = parseInt(referenceBatchTime) + 1;
    
    // Start from the incremented reference batch time
    const startValue = `${baseSyncId}_${incrementedBatchTime}`;
    
    // End at a very high timestamp value (effectively "infinity")
    const endValue = `${baseSyncId}_999999999999`;
    
    // Build the between query using start|end syntax with label name prefix
    // For AmptModel range queries on labels, the format should be:
    // startValue|labelName_endValue
    const betweenQuery = `${startValue}|syncId_${endValue}`;
    
    return betweenQuery;
  }

  /**
   * Reverts transactions to a specific cursor point
   * Useful for recovering from failed syncs or correcting data issues
   * @param {String} itemId - The Plaid item ID
   * @param {String} userId - The user ID
   * @param {String} cursorToRevertTo - Target cursor to revert to
   * @returns {Object} Result of the reversion operation
   */
  async revertTransactionsToCursor(itemId, userId, cursorToRevertTo) {
    try {
      // Validate input parameters
      this._validateRevertParameters(itemId, userId, cursorToRevertTo);
      
      // Find reference transaction
      const referenceResult = await this._findReferenceTransaction(cursorToRevertTo, userId);
      if (!referenceResult.valid) {
        return { 
          reverted: false,
          message: referenceResult.message 
        };
      }
      
      const referenceBatchTime = referenceResult.batchTime;
      
      // Build syncId range query that will only return transactions newer than the reference
      const syncIdRange = this._buildSyncIdRangeQuery(itemId, referenceBatchTime);

      // This will only return transactions after the reference
      const transactionsToRevert = await transactionsCrudService.fetchTransactionsBySyncId(syncIdRange, userId);
      
      // Get transaction IDs to remove
      const txIdsToRemove = transactionsToRevert.map(tx => tx.transaction_id);
      
      // Nothing to remove
      if (txIdsToRemove.length === 0) {
        return { 
          reverted: true,
          message: 'No transactions needed to be reverted',
          revertedTo: cursorToRevertTo,
          removedCount: 0
        };
      }
      
      // Remove the transactions
      const removedCount = await transactionsCrudService.removeTransactionsById(txIdsToRemove, userId);
      
      // Update the item's sync status to use the cursor we reverted to
      await itemService.updateItemSyncStatus(itemId, userId, {
        cursor: cursorToRevertTo,
        status: 'in_progress', // Set to in_progress so we can continue syncing
        error: null  // Clear any errors
      });
      
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