import { itemService, transactionService } from '../../services/plaid';
import tasks from '../../tasks/plaidTask.js';

export default {
  async startSync(req, res) {
    try {
      const { itemId } = req.params;
      
      const syncPromise = transactionService.syncTransactionsForItem(item, req.user);
      
      // Return immediately while sync runs
      res.json({ 
        status: 'syncing',
        message: 'Sync started',
        itemId
      });

      // Let the sync continue in the background
      await syncPromise.catch(error => {
        console.error('Background sync error:', error);
      });
    } catch (error) {
      const errorCode = error.message.split(': ')[0];
      const errorMessage = error.message.split(': ')[1] || error.message;
      
      res.status(400).json({ 
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
        throw new Error('ITEM_NOT_FOUND: Item not found');
      }

      const { syncData } = item;

      // Add more detailed status info
      res.json({
        completed: syncData.status === 'completed',
        error: syncData.error,
        status: syncData.status,
        progress: {
          ...syncData.stats,
          cursor: syncData.cursor,
          lastSync: syncData.lastSyncTime,
          nextSync: syncData.nextSyncTime
        }
      });
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  }
}; 