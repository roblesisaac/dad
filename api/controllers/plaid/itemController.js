import { plaidService, itemService, accountService } from '../../services/plaid';
import { scrub } from '../../../src/utils';

export default {
  async getUserItems(req, res) {
    try {
      const { _id: itemId } = req.params;
      const items = await itemService.getUserItems(req.user._id, itemId);
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
      const syncedItems = await plaidService.syncItems(req.user);
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