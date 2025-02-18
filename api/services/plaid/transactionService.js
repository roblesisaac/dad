import PlaidBaseService from './baseService';
import plaidTransactions from '../../models/plaidTransactions';
import plaidItems from '../../models/plaidItems';
import { decryptAccessToken } from './linkService';
import { plaidClientInstance } from '../plaidClient';
import tasks from '../../tasks/plaid';

class PlaidTransactionService extends PlaidBaseService {
  async syncTransactionsForItem(item, userId, encryptedKey) {
    if (!userId || !encryptedKey) {
      throw new Error('INVALID_USER: Missing required user data');
    }

    try {
      if (typeof item === 'string') {
        item = await plaidItems.findOne(item);
        if (!item) {
          throw new Error('ITEM_NOT_FOUND: Invalid item ID');
        }
      }

      const { accessToken, syncData } = item;
      
      if (['in_progress'].includes(syncData.status)) {
        return { 
          error: 'SYNC_IN_PROGRESS',
          message: 'Sync already in progress for this item',
          itemId: item._id 
        };
      }

      // ... rest of your existing sync logic
    } catch (error) {
      console.error('Error in syncTransactionsForItem:', error);
      throw error.error_code ? error : new Error(`SYNC_ERROR: ${error.message}`);
    }
  }

  // ... other methods from your original plaidTransactionService
}

export default new PlaidTransactionService(plaidClientInstance); 