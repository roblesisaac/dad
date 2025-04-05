import itemService from '../../services/plaid/itemService.js';
import transactionQueryService from '../../services/plaid/transactionsCrudService.js';
import transactionSyncService from '../../services/plaid/syncTransactionsService.js';

export default {
  /**
   * Get transactions for user
   */
  async getTransactions(req, res) {
    try {
      const user = req.user;
      const { _id } = req.params;
      
      // Handle case with transaction ID
      if (_id) {
        const transaction = await transactionQueryService.fetchTransactionById(_id, user._id);
        return res.json(transaction);
      }
      
      const transactions = await transactionQueryService.fetchTransactions(req.user, req.query);
      
      return res.json(transactions);
    } catch (error) {
      let errorCode = 'TRANSACTION_ERROR';
      let errorMessage = error.message;
      
      if (error.code) {
        errorCode = error.code;
        errorMessage = error.originalMessage || error.message;
      } else if (error.message && error.message.includes(':')) {
        [errorCode, errorMessage] = error.message.split(': ');
      }
      
      return res.status(400).json({
        error: errorCode,
        message: errorMessage
      });
    }
  },

  /**
   * Sync transactions for a specific item
   */
  async syncLatestTransactionsForItem(req, res) {
    try {
      const user = req.user;
      const { itemId } = req.params;

      const item = await itemService.getItem(itemId, user._id)

      if (!item) {
        return res.status(404).json({
          error: 'ITEM_NOT_FOUND',
          message: 'Item not found for this user'
        });
      }

      const syncResult = await transactionSyncService.syncTransactions(item, user);

      const batchResults = {
        added: syncResult.added,
        modified: syncResult.modified,
        removed: syncResult.removed
      };

      const response = {
        hasMore: syncResult.hasMore,
        cursor: syncResult.cursor,
        batchResults,
        addedTransactions: syncResult.addedTransactions
      };
      
      if (syncResult.recovery?.performed) {
        response.recovery = {
          performed: true,
          revertedTo: syncResult.revertedTo,
          removedTransactions: syncResult.recoveryRemovedCount
        };
      }
      
      // Include any failure information
      if (syncResult.hasFailures) {
        response.hasFailures = true;
        response.failureDetails = syncResult.failureDetails;
      }

      return res.json(response);
    } catch (error) {
      let status = 400;
      let errorCode = 'TRANSACTION_ERROR';
      let errorMessage = error.message;
      
      if (error.code === 'SYNC_IN_PROGRESS') {
        status = 409;
      } else if (error.code === 'ITEM_NOT_FOUND') {
        status = 404;
      } else if (error.code === 'RECOVERY_FAILED') {
        status = 500;
        errorCode = 'RECOVERY_FAILED';
      }
      
      if (error.code) {
        errorCode = error.code;
      }
      
      return res.status(status).json({
        error: errorCode,
        message: errorMessage
      });
    }
  },
  
  /**
   * Manually add a transaction from error data
   */
  async addTransactionFromError(req, res) {
    try {
      const user = req.user;
      const { transaction, syncSessionId } = req.body;
      
      if (!transaction || !transaction.transaction_id) {
        return res.status(400).json({
          error: 'INVALID_TRANSACTION',
          message: 'Invalid transaction data provided'
        });
      }
      
      const result = await transactionQueryService.addTransactionFromError(
        transaction, 
        user._id,
        syncSessionId
      );
      
      return res.json({
        success: true,
        transaction: result,
        sessionUpdated: !!syncSessionId
      });
    } catch (error) {
      let status = 400;
      let errorCode = 'TRANSACTION_ERROR';
      let errorMessage = error.message;
      
      if (error.code === 'DUPLICATE_TRANSACTION') {
        errorCode = 'DUPLICATE_TRANSACTION';
      }
      
      return res.status(status).json({
        error: errorCode,
        message: errorMessage
      });
    }
  }
}; 