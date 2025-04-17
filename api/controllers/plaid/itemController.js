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

  async rotateAccessToken(req, res) {
    try {
      const { _id: itemId } = req.params;
      const userId = req.user._id;
      
      if (!itemId) {
        return res.status(400).json({
          error: 'INVALID_PARAMS',
          message: 'Item ID is required'
        });
      }
      
      // Get the item
      const item = await itemService.getItem(itemId, userId);
      if (!item) {
        return res.status(404).json({
          error: 'ITEM_NOT_FOUND',
          message: 'Bank connection not found'
        });
      }
      
      // Rotate the token
      const result = await plaidService.invalidateAndRotateAccessToken(item, req.user);
      
      // Return success response without access token
      res.json({
        success: true,
        itemId: item.itemId,
        message: 'Access token successfully rotated'
      });
    } catch (error) {
      const [errorCode = 'ROTATION_ERROR', errorMessage = error.message] = error.message.split(': ');
      
      // Log the error for debugging
      console.error('Token rotation error:', {
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

  /**
   * Unlink a Plaid item while preserving its data for future relinking
   */
  async unlinkAndRelinkItem(req, res) {
    try {
      const { _id: itemId } = req.params;
      const userId = req.user._id;
      
      if (!itemId) {
        return res.status(400).json({
          error: 'INVALID_PARAMS',
          message: 'Item ID is required'
        });
      }
      
      // Get the item
      const item = await itemService.getItem(itemId, userId);
      if (!item) {
        return res.status(404).json({
          error: 'ITEM_NOT_FOUND',
          message: 'Bank connection not found'
        });
      }
      
      // Unlink the item
      const result = await plaidService.unlinkAndRelinkItem(item, req.user);
      
      // Return success response with link token for relinking
      res.json({
        success: true,
        itemId: item.itemId,
        institutionName: item.institutionName,
        link_token: result.link_token,
        message: 'Bank successfully unlinked and ready for reconnection'
      });
    } catch (error) {
      const [errorCode = 'UNLINK_ERROR', errorMessage = error.message] = error.message.split(': ');
      
      // Log the error for debugging
      console.error('Unlink error:', {
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
  
  /**
   * Complete the relinking process by saving new access token to unlinked item
   */
  async relinkItem(req, res) {
    try {
      const { 
        originalItemId, 
        publicToken,
        metadata 
      } = req.body;
      
      if (!originalItemId || !publicToken) {
        return res.status(400).json({
          error: 'INVALID_PARAMS',
          message: 'Original item ID and public token are required'
        });
      }
      
      // Exchange public token for access token
      const accessData = await plaidService.exchangePublicToken(publicToken);
      
      if (!accessData || !accessData.access_token) {
        return res.status(400).json({
          error: 'TOKEN_EXCHANGE_ERROR',
          message: 'Failed to exchange public token'
        });
      }
      
      // Relink the item with new access token
      const result = await plaidService.relinkItem(
        originalItemId, 
        accessData, 
        req.user
      );
      
      // Return success response with update counts
      res.json({
        success: true,
        originalItemId,
        newItemId: accessData.item_id,
        institutionName: metadata?.institution?.name || 'Unknown Institution',
        message: 'Bank successfully relinked',
        transactionsUpdated: result.transactionsUpdated || 0,
        sessionsUpdated: result.sessionsUpdated || 0
      });
    } catch (error) {
      const [errorCode = 'RELINK_ERROR', errorMessage = error.message] = error.message.split(': ');
      
      // Log the error for debugging
      console.error('Relink error:', {
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

