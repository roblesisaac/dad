import itemService from '../../services/plaid/itemService.js';
import transactionQueryService from '../../services/plaid/transactionsCrudService.js';
import transactionSyncService from '../../services/plaid/syncTransactionsService.js';
import syncSessionService from '../../services/plaid/syncSessionService.js';
import { CustomError } from '../../services/plaid/customError.js';

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
      
      if (syncResult.recoveryPerformed) {
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
   * Get sync sessions for a specific item
   */
  async getSyncSessionsForItem(req, res) {
    try {
      const user = req.user;
      const { itemId } = req.params;
      const { limit = 20 } = req.query;
      
      const item = await itemService.getItem(itemId, user._id);
      
      if (!item) {
        return res.status(404).json({
          error: 'ITEM_NOT_FOUND',
          message: 'Item not found for this user'
        });
      }
      
      const syncSessions = await syncSessionService.getSyncSessionsForItem(
        itemId,
        user._id,
        { limit: parseInt(limit) }
      );
      
      return res.json({
        itemId,
        syncSessions,
        currentSyncId: item.sync_id || null,
        count: syncSessions.length
      });
    } catch (error) {
      return res.status(400).json({
        error: 'FETCH_ERROR',
        message: error.message
      });
    }
  },
  
  /**
   * Revert to a specific sync session
   */
  async revertToSyncSession(req, res) {
    try {
      const user = req.user;
      const { itemId, sessionId } = req.params;
      
      if (!itemId || !sessionId) {
        return res.status(400).json({
          error: 'INVALID_PARAMS',
          message: 'Missing itemId or sessionId'
        });
      }
      
      // Get the item
      const item = await itemService.getItem(itemId, user._id);
      
      if (!item) {
        return res.status(404).json({
          error: 'ITEM_NOT_FOUND',
          message: 'Item not found for this user'
        });
      }
      
      // Get the target sync session
      const targetSession = await syncSessionService.getSyncSession(sessionId, user);
      
      if (!targetSession) {
        return res.status(404).json({
          error: 'SESSION_NOT_FOUND',
          message: 'Sync session not found'
        });
      }
      
      // Ensure the session belongs to the specified item
      if (targetSession.itemId !== itemId) {
        return res.status(400).json({
          error: 'INVALID_SESSION',
          message: 'Session does not belong to the specified item'
        });
      }
      
      // Perform the reversion
      const result = await syncSessionService.revertToSyncSession(targetSession, item, user);
      
      if (!result.success) {
        throw new CustomError('REVERT_FAILED', result.error || 'Failed to revert to session');
      }
      
      return res.json({
        success: true,
        itemId,
        revertedTo: result.revertedTo,
        removedCount: result.removedCount,
        recoverySession: result.recoverySession,
        message: `Successfully reverted to session. ${result.removedCount} transactions removed.`
      });
    } catch (error) {
      return res.status(500).json({
        error: error.code || 'REVERT_ERROR',
        message: error.message
      });
    }
  }
}; 