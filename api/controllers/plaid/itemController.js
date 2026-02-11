import plaidService from '../../services/plaid/plaidService.js';
import itemService from '../../services/plaid/itemService.js';
import accountService from '../../services/plaid/accountService.js';
import dataExportService from '../../services/plaid/dataExportService.js';
import dataDeletionService from '../../services/plaid/dataDeletionService.js';
import scrub from '../../utils/scrub';

function parseBooleanFlag(value, defaultValue = true) {
  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

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

  async downloadAllData(req, res) {
    try {
      const userId = req.user._id;
      const exportData = await dataExportService.getUserPlaidDataBatch(userId, {
        batchSize: req.query.batchSize,
        cursors: {
          itemsStart: req.query.itemsStart,
          transactionsStart: req.query.transactionsStart,
          accountsStart: req.query.accountsStart,
          accountGroupsStart: req.query.accountGroupsStart,
          syncSessionsStart: req.query.syncSessionsStart
        },
        includes: {
          items: parseBooleanFlag(req.query.includeItems, true),
          transactions: parseBooleanFlag(req.query.includeTransactions, true),
          accounts: parseBooleanFlag(req.query.includeAccounts, true),
          accountGroups: parseBooleanFlag(req.query.includeAccountGroups, true),
          syncSessions: parseBooleanFlag(req.query.includeSyncSessions, true)
        }
      });

      res.status(200).json(exportData);
    } catch (error) {
      const [errorCode = 'EXPORT_ERROR', errorMessage = error.message] = error.message.split(': ');

      res.status(400).json({
        error: errorCode,
        message: errorMessage
      });
    }
  },

  async deleteSelectedData(req, res) {
    try {
      const userId = req.user._id;
      const payload = req.body || {};
      const deletionResult = await dataDeletionService.deleteUserPlaidDataBatch(userId, {
        batchSize: payload.batchSize || req.query.batchSize,
        includes: {
          items: parseBooleanFlag(payload.includeItems ?? req.query.includeItems, false),
          transactions: parseBooleanFlag(payload.includeTransactions ?? req.query.includeTransactions, false),
          accounts: parseBooleanFlag(payload.includeAccounts ?? req.query.includeAccounts, false),
          accountGroups: parseBooleanFlag(payload.includeAccountGroups ?? req.query.includeAccountGroups, false),
          syncSessions: parseBooleanFlag(payload.includeSyncSessions ?? req.query.includeSyncSessions, false)
        }
      });

      res.status(200).json(deletionResult);
    } catch (error) {
      const [errorCode = 'DELETE_ERROR', errorMessage = error.message] = error.message.split(': ');

      res.status(400).json({
        error: errorCode,
        message: errorMessage
      });
    }
  },

  async resetItemCursor(req, res) {
    try {
      const { _id: itemId } = req.params;
      const userId = req.user._id;

      if (!itemId) {
        return res.status(400).json({
          error: 'INVALID_PARAMS',
          message: 'Item ID is required'
        });
      }

      const updatedItem = await itemService.resetItemCursor(itemId, userId);
      res.status(200).json(scrub(updatedItem, 'accessToken'));
    } catch (error) {
      const [errorCode = 'CURSOR_RESET_ERROR', errorMessage = error.message] = error.message.split(': ');

      res.status(400).json({
        error: errorCode,
        message: errorMessage
      });
    }
  }
};
