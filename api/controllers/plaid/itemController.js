import { itemService, accountService } from '../../services/plaid';
import { scrub } from '../../../src/utils';

export default {
  async getItems(req, res) {
    try {
      const { _id: itemId } = req.params;
      const items = await itemService.getItems(req.user._id, itemId);
      res.json(scrub(items, 'accessToken'));
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  },

  async syncItems(req, res) {
    try {
      const syncedItems = await itemService.syncItems(req.user);
      res.json(scrub(syncedItems, 'accessToken'));
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  },

  async syncAccountsAndGroups(req, res) {
    try {
      const syncedData = await accountService.syncUserAccounts(req.user);
      res.json(syncedData);
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0] || 'SYNC_ERROR',
        message: error.message.split(': ')[1] || error.message
      });
    }
  }
}; 