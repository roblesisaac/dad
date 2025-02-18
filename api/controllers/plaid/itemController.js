import { itemService, accountService } from '../../services/plaid';
import { scrub } from '../../../src/utils';

export default {
  async getItems(req, res) {
    try {
      const { _id: itemId } = req.params;
      const items = await itemService.getItems(req.user._id, itemId);
      res.json(scrub(items, 'accessToken'));
    } catch (error) {
      const [errorCode = 'SYNC_ERROR', errorMessage = error.message] = error.message.split(': ');
      res.status(400).json({ 
        error: errorCode,
        message: errorMessage
      });
    }
  },

  async syncItems(req, res) {
    try {
      const syncedItems = await itemService.syncItems(req.user);
      res.json(scrub(syncedItems, 'accessToken'));
    } catch (error) {
      const [errorCode = 'SYNC_ERROR', errorMessage = error.message] = error.message.split(': ');
      res.status(400).json({ 
        error: errorCode,
        message: errorMessage
      });
    }
  },

  async syncAccountsAndGroups(req, res) {
    try {
      const syncedData = await accountService.syncUserAccounts(req.user);
      res.json(syncedData);
    } catch (error) {
      const [errorCode = 'SYNC_ERROR', errorMessage = error.message] = error.message.split(': ');
      res.status(400).json({ 
        error: errorCode,
        message: errorMessage
      });
    }
  }
}; 