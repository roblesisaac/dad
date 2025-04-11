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
  },
  
  async updateItem(req, res) {
    try {
      const { _id: itemId } = req.params;
      const userId = req.user._id;
      
      if (!itemId) {
        return res.status(400).json({
          error: 'INVALID_PARAMS',
          message: 'Item ID is required'
        });
      }
      
      // Extract allowed update fields from the request body
      const updateData = {};
      if (req.body.institutionName !== undefined) {
        updateData.institutionName = req.body.institutionName;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: 'INVALID_UPDATE',
          message: 'No valid fields to update'
        });
      }
      
      const updatedItem = await itemService.updateItem(itemId, userId, updateData);
      res.json(scrub(updatedItem, 'accessToken'));
    } catch (error) {
      const [errorCode = 'UPDATE_ERROR', errorMessage = error.message] = error.message.split(': ');
      
      // Log the error for debugging
      console.error('Update item error:', {
        code: errorCode,
        message: errorMessage,
        originalError: error
      });
      
      res.status(400).json({ 
        error: errorCode,
        message: errorMessage
      });
    }
  },
  
  async unlinkItem(req, res) {
    try {
      const { _id: itemId } = req.params;
      const userId = req.user._id;
      
      if (!itemId) {
        return res.status(400).json({
          error: 'INVALID_PARAMS',
          message: 'Item ID is required'
        });
      }
      
      // Call the itemService to unlink (soft-delete) the item
      // This keeps the item record but marks it as disconnected
      // and preserves essential metadata
      const result = await itemService.unlinkItem(itemId, userId);
      
      res.json({
        success: true,
        message: 'Item unlinked successfully',
        itemId: result.itemId
      });
    } catch (error) {
      const [errorCode = 'UNLINK_ERROR', errorMessage = error.message] = error.message.split(': ');
      
      console.error('Unlink item error:', {
        code: errorCode,
        message: errorMessage,
        originalError: error
      });
      
      res.status(400).json({ 
        error: errorCode,
        message: errorMessage
      });
    }
  },
  
  async relinkItem(req, res) {
    try {
      const { _id: itemId } = req.params;
      const { public_token } = req.body;
      const userId = req.user._id;
      
      if (!itemId || !public_token) {
        return res.status(400).json({
          error: 'INVALID_PARAMS',
          message: 'Item ID and public token are required'
        });
      }
      
      // Get the unlinked item to preserve its metadata
      const unlinkedItem = await itemService.getItem(itemId, userId);
      
      if (!unlinkedItem) {
        return res.status(404).json({
          error: 'ITEM_NOT_FOUND',
          message: 'The item to relink was not found'
        });
      }
      
      // Exchange the public token and relink the item
      // This will use the original itemId and preserve the sync cursor
      const result = await itemService.relinkItem(itemId, userId, public_token);
      
      res.json({
        success: true,
        message: 'Item relinked successfully',
        itemId: result.itemId,
        status: result.status
      });
    } catch (error) {
      const [errorCode = 'RELINK_ERROR', errorMessage = error.message] = error.message.split(': ');
      
      console.error('Relink item error:', {
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

