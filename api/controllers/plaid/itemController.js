import plaidService from '../../services/plaid/plaidService.js';
import itemService from '../../services/plaid/itemService.js';
import accountService from '../../services/plaid/accountService.js';
import scrub from '../../utils/scrub';

export default {
  async getUserItems(req, res) {
    try {
      const { _id: itemId } = req.params;
      const userId = req.user._id;
      const items = itemId 
        ? await itemService.getItem(itemId, userId) 
        : await itemService.getUserItems(userId);
        
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
      const userItems = await itemService.getUserItems(req.user._id);
      const syncedItems = [];

      for (const item of userItems) {
        const plaidItem = await plaidService.syncItemFromPlaid(item, req.user);
        syncedItems.push(plaidItem);
      }

      res.json(scrub(syncedItems, 'accessToken'));
    } catch (error) {
      const [errorCode = 'SYNC_ERROR', errorMessage = error.message] = error.message.split(': ');
      res.status(400).json({ 
        error: errorCode,
        message: errorMessage
      });
    }
  },

  async syncAccountsAndGroups({ user }, res) {
    try {
      const syncedData = await accountService.syncAccountsAndGroups(user);
      res.json(syncedData);
    } catch (error) {
      // Always return 400 for expected errors
      const [errorCode = 'SYNC_ERROR', errorMessage = error.message] = error.message.split(': ');
      
      // Log the error for debugging
      console.error('Sync accounts error:', {
        code: errorCode,
        message: errorMessage,
        originalError: error
      });

      res.status(400).json({ 
        error: errorCode,
        message: errorMessage
      });
    }
  }
};

