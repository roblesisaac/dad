import { transactionService, itemService } from '../../services/plaid/index.js';

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
        const transaction = await transactionService.fetchTransactionById(_id, user._id);
        return res.json(transaction);
      }
      
      // Build query from request parameters
      const query = transactionService.buildUserQueryForTransactions(user._id, req.query);
      
      const transactions = await transactionService.fetchTransactions(query);
      
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
   * Sync transactions for all user items using batch approach
   * This initiates background syncing and returns status immediately
   */
  async syncTransactionsForEachItem(req, res) {
    try {
      const user = req.user;
      const itemIds = req.body?.itemIds || [];
      
      // If no specific itemIds provided, get all user items
      let items = [];
      if (itemIds.length > 0) {
        // Get the specified items
        for (const itemId of itemIds) {
          const item = await itemService.getUserItems(user._id, itemId);
          if (item) items.push(item);
        }
      } else {
        // Get all user items
        items = await itemService.getUserItems(user._id);
      }
      
      if (!items || !items.length) {
        return res.status(404).json({
          error: 'NO_ITEMS',
          message: 'No items found for this user'
        });
      }
      
      // Process a single batch for each item and return status
      const syncResults = [];
      
      for (const item of items) {
        try {
          // Check current sync status
          const currentStatus = item.syncData?.status || 'none';
          
          // Only start a new batch if one is not already in progress
          if (currentStatus !== 'in_progress') {
            // Initialize sync state
            await itemService.updateItemSyncStatus(item.itemId, user._id, {
              status: 'in_progress',
              lastSyncTime: Date.now(),
              cursor: item.syncData?.cursor || null,
              error: null,
              batchNumber: 0,
              stats: {
                added: 0,
                modified: 0,
                removed: 0
              }
            });
          }
          
          // Process just the first batch and wait for it
          const batchResult = await transactionService.processSingleBatch(item, user);
          
          // Get updated item with latest stats
          const updatedItem = await itemService.getUserItems(user._id, item.itemId);
          
          syncResults.push({
            itemId: item._id,
            status: batchResult.hasMore ? 'in_progress' : 'completed',
            hasMore: batchResult.hasMore,
            currentBatch: updatedItem.syncData?.batchNumber || 1,
            cursor: batchResult.nextCursor,
            stats: {
              added: batchResult.batchResults.added || 0,
              modified: batchResult.batchResults.modified || 0,
              removed: batchResult.batchResults.removed || 0,
              totalAdded: updatedItem.syncData?.stats?.added || 0,
              totalModified: updatedItem.syncData?.stats?.modified || 0,
              totalRemoved: updatedItem.syncData?.stats?.removed || 0
            }
          });
        } catch (error) {
          console.error(`Error processing batch for item ${item._id}:`, error);
          
          // Update item to error state
          await itemService.updateItemSyncStatus(item.itemId, user._id, {
            status: 'error',
            error: {
              code: error.code || 'BATCH_PROCESSING_ERROR',
              message: error.message,
              timestamp: new Date().toISOString()
            }
          });
          
          syncResults.push({
            itemId: item._id,
            status: 'error',
            error: error.message || 'Unknown error'
          });
        }
      }
      
      // Return all sync results 
      res.json({
        message: 'Batch processing completed',
        items: syncResults
      });
      
    } catch (error) {
      const errorCode = error.message.split(': ')[0] || 'SYNC_ERROR';
      const errorMessage = error.message.split(': ')[1] || error.message;
      
      return res.status(400).json({
        error: errorCode,
        message: errorMessage
      });
    }
  }
}; 