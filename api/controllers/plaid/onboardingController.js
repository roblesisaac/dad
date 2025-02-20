import { itemService, transactionService } from '../../services/plaid';
import tasks from '../../tasks/plaid.js';

export default {
  async startSync(req, res) {
    try {
      const { itemId } = req.params;
      
      // Start background sync task
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
      
      const item = await itemService.getItems(req.user._id, itemId);
      
      if (!item) {
        throw new Error('ITEM_NOT_FOUND: Item not found');
      }

      const { syncData } = item;

      res.json({
        completed: syncData.status === 'completed',
        error: syncData.status === 'failed' ? syncData.result.error : null,
        status: syncData.status
      });
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  }
}; 