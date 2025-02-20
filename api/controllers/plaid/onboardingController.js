import { itemService } from '../../services/plaid';
import tasks from '../../tasks/plaidTask.js';

export default {
  async startSync(req, res) {
    try {
      const { itemId } = req.params;
      
      await tasks.syncTransactionsForItem(itemId, req.user);
      
      res.json({ 
        status: 'syncing',
        message: 'Initial sync started'
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

      res.json({
        completed: syncData.status === 'completed',
        error: syncData.error,
        status: syncData.status,
        progress: syncData.stats,
        nextSync: syncData.nextSyncTime,
        lastSync: syncData.lastSyncTime
      });
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  }
}; 