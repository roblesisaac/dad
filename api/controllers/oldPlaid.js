import { scrub } from '../../src/utils.js';
import tasks from '../tasks/plaid.js';
import { 
  plaidLinkService, 
  plaidAccountService, 
  plaidTransactionService 
} from '../services/oldIndex.js';

const plaidController = {
  connectLink: async (req, res) => {
    try {
      const data = await plaidLinkService.createLinkToken(req.user, req.params.itemId);
      res.json(data.link_token);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  exchangeTokenAndSavePlaidItem: async (req, res) => {
    try {
      const { publicToken } = req.body;

      const { 
        exchangePublicToken, 
        savePlaidAccessData 
      } = plaidLinkService;

      const accessData = await exchangePublicToken(publicToken);
      const encryptedKey = req.user.encryptionKey;
      const userId = req.user._id;

      const { _id: itemId } = await savePlaidAccessData(accessData, encryptedKey);

      const { accounts, groups } = await plaidAccountService.syncUserAccounts(req.user);
      

      tasks.syncTransactionsForItem(itemId, userId, encryptedKey);

      res.json({ accounts, groups });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getPlaidItems: async (req, res) => {
    try {
        const legacyId = req.user._id;
        const itemId = req.params._id;
        let response;

      if (itemId) {
        response = await plaidAccountService.fetchItemById(itemId, legacyId);
      } else {
        response = await plaidAccountService.fetchUserItemsFromDb(legacyId);
      }

      if (!response) return res.json(null);

      const scrubbed = scrub(response, ['accessToken', 'itemId', 'userId']);
      res.json(scrubbed);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getTransactions: async (req, res) => {
    try {
      const { _id } = req.params;
      const { user, query } = req;
      const userId = user._id;

      if (_id) {
        const transaction = await plaidTransactionService.fetchTransactionById(_id, userId);
        return res.json(transaction);
      }

      const userQueryForDate = plaidTransactionService.buildUserQueryForTransactions(userId, query);
      const transactions = await plaidTransactionService.fetchTransactions(userQueryForDate);

      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getAllTransactionCount: async (req, res) => {
    try {
      const userId = req.user._id;
      const count = await plaidTransactionService.getAllTransactionCount(userId);
      res.json(count);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getDuplicates: async function ({ user }, res) {
    try {
      const userId = req.user._id;
      const duplicates = await plaidTransactionService.findDuplicates(userId);
      res.json(duplicates);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  removeAllTransactionsFromDatabase: async function ({ user, query }, res) {
    try {
      if (query.confirm !== 'remove all transactions') {
        return res.json(`You must type "remove all transactions" to confirm.`);
      }

      await tasks.removeAllUserTransactions(user);
      res.json(`Removing all your transactions. You will be notified at ${user.email} when the process is complete.`);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  removeFromDb: async function (req, res) {
    try {
      const removed = await plaidTransactionService.removeFromDb(req.body);
      res.json(removed);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  retreivePlaidItems: async function ({ user }, res) {
    try {
      const userId = user._id;
      const userItems = await plaidAccountService.fetchUserItemsFromDb(userId);
      const syncedItems = await plaidAccountService.syncItems(userItems, user);

      res.json(scrub(syncedItems, 'accessToken'));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  syncAccountsAndGroups: async function ({ user }, res) {
    try {
      // Validate user has required data
      if (!user?._id || !user?.encryptionKey) {
        return res.status(400).json({
          error: 'AUTH_ERROR',
          message: 'Missing required user authentication data'
        });
      }

      try {
        const syncedData = await plaidAccountService.syncUserAccounts(user);
        
        // Validate the response
        if (!syncedData || !syncedData.accounts || !syncedData.groups) {
          return res.status(400).json({
            error: 'SYNC_ERROR',
            message: 'Failed to sync accounts and groups'
          });
        }

        // Check for account errors
        const accountsWithErrors = syncedData.accounts.filter(account => account.error);
        if (accountsWithErrors.length > 0) {
          return res.status(400).json({
            error: 'ITEM_ERROR',
            message: 'One or more accounts need to be reconnected',
            accounts: accountsWithErrors
          });
        }

        // If no groups exist, return specific error
        if (!syncedData.groups?.length) {
          return res.status(400).json({
            error: 'NO_GROUPS',
            message: 'No account groups found. Please set up your accounts.'
          });
        }

        res.json(syncedData);
      } catch (plaidError) {
        // Handle Plaid API specific errors
        if (plaidError.error_code) {
          return res.status(400).json({
            error: plaidError.error_code,
            message: plaidError.error_message || 'Error connecting to financial institution'
          });
        }
        
        throw plaidError; // Pass other errors to outer catch
      }
    } catch (error) {
      console.error('Sync accounts error:', error);
      
      res.status(500).json({ 
        error: 'SERVER_ERROR',
        message: 'An unexpected error occurred while syncing accounts'
      });
    }
  },

  syncAllUserTransactions: async function ({ user }, res) {
    try {
      const response = await plaidTransactionService.syncAllUserTransactions(user);
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  syncTransactionsForItem: async (req, res = null) => {
    try {
      if (!req.params?.itemId || !req.user?._id) {
        throw new Error('Missing required parameters: itemId or userId');
      }

      const userId = req.user._id;
      const encryptedKey = req.user.encryptionKey; 

      const response = await plaidTransactionService.syncTransactionsForItem(
        req.params.itemId, 
        userId,
        encryptedKey
      );
      
      if (res) {
        return res.json(response);
      }
      
      return response;
    } catch (error) {
      console.error('Error syncing transactions:', error);
      if (res) {
        return res.status(500).json({ error: error.message });
      }
      throw error;
    }
  },

  updateDates: (_, res) => {
    try {
      tasks.updateAllDates();
      res.json('updating dates...');
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  test: async (_, res) => {
    try {
      res.json('test');
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

export default plaidController;