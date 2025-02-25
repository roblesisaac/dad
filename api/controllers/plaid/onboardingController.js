import { itemService, transactionService } from '../../services/plaid';

export default {
  async startSync(req, res) {
    try {
      const { itemId } = req.params;
      const user = req.user;
      
      // Make sure we have a valid itemId
      if (!itemId) {
        return res.status(400).json({
          error: 'MISSING_PARAM',
          message: 'Item ID is required'
        });
      }
      
      // First, check if the item exists
      const item = await itemService.getUserItems(user._id, itemId);
      if (!item) {
        return res.status(404).json({
          error: 'ITEM_NOT_FOUND',
          message: 'Item not found for this user'
        });
      }
      
      // Process a single batch using the service - pass the full item object rather than just ID
      const batchResult = await transactionService.processSingleBatch(item, user);
      
      // Get the updated item for latest stats
      const updatedItem = await itemService.getUserItems(user._id, itemId);
      
      // Prepare response
      return res.json({
        status: batchResult.hasMore ? 'in_progress' : 'completed',
        message: batchResult.hasMore ? 'Batch processed, more data available' : 'All batches processed',
        itemId,
        cursor: batchResult.nextCursor,
        hasMore: batchResult.hasMore,
        stats: {
          added: batchResult.batchResults.added || 0,
          modified: batchResult.batchResults.modified || 0,
          removed: batchResult.batchResults.removed || 0,
          totalAdded: updatedItem.syncData?.stats?.added || 0,
          totalModified: updatedItem.syncData?.stats?.modified || 0,
          totalRemoved: updatedItem.syncData?.stats?.removed || 0,
          batchNumber: updatedItem.syncData?.batchNumber || 0
        }
      });
    } catch (error) {
      let errorCode = 'SYNC_ERROR';
      let errorMessage = error.message;
      
      // Try to extract error code and message
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

  async getSyncStatus(req, res) {
    try {
      const { itemId } = req.params;
      
      const item = await itemService.getUserItems(req.user._id, itemId);
      
      if (!item) {
        return res.status(404).json({
          error: 'ITEM_NOT_FOUND',
          message: 'Item not found'
        });
      }

      const { syncData } = item;

      // Add more detailed status info
      res.json({
        completed: syncData.status === 'completed',
        error: syncData.error,
        status: syncData.status,
        hasMore: syncData.status === 'in_progress',
        cursor: syncData.cursor,
        progress: {
          ...syncData.stats,
          batchNumber: syncData.batchNumber,
          lastBatchTime: syncData.stats?.lastBatchTime,
          lastSync: syncData.lastSyncTime,
          nextSync: syncData.nextSyncTime
        }
      });
    } catch (error) {
      let errorCode = 'STATUS_ERROR';
      let errorMessage = error.message;
      
      if (error.message && error.message.includes(':')) {
        [errorCode, errorMessage] = error.message.split(': ');
      }
      
      res.status(400).json({ 
        error: errorCode,
        message: errorMessage
      });
    }
  }
}; 