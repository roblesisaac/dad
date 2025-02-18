import PlaidBaseService from './baseService.js';
import plaidAccounts from '../../models/plaidAccounts.js';
import plaidGroups from '../../models/plaidGroups.js';
import { itemService } from './index.js';
import { decryptAccessToken } from './linkService.js';
import { plaidClientInstance } from '../plaidClient.js';

class PlaidAccountService extends PlaidBaseService {
  async syncUserAccounts(user) {
    this.validateUser(user);

    try {
      const userItems = await itemService.getItems(user._id);
      if (!userItems?.length) {
        throw new Error('NO_ITEMS: No Plaid items found for user');
      }

      let retrievedAccountsFromPlaid = [];
      for (const item of userItems) {
        try {
          const accounts = await this.retrieveAccountsFromPlaidForItem(item, user.encryptionKey);
          retrievedAccountsFromPlaid = [...retrievedAccountsFromPlaid, ...accounts];
        } catch (error) {
          console.error(`Error retrieving accounts for item ${item._id}:`, error);
          // Continue with other items even if one fails
        }
      }

      if (!retrievedAccountsFromPlaid.length) {
        throw new Error('NO_ACCOUNTS: Failed to retrieve any accounts from Plaid');
      }

      const existingUserAccounts = await this.fetchUserAccounts(user._id);
      const existingGroups = await plaidGroups.findAll({ userId: user._id, name: '*' });

      return await this.syncAccountsAndGroups(
        retrievedAccountsFromPlaid,
        existingUserAccounts,
        existingGroups,
        user
      );
    } catch (error) {
      // Ensure error is properly formatted
      const formattedError = new Error(
        error.message.includes(':') ? error.message : `SYNC_ERROR: ${error.message}`
      );
      throw formattedError;
    }
  }

  async retrieveAccountsFromPlaidForItem(item, encryptedKey) {
    if (!item?.accessToken) {
      throw new Error('INVALID_ITEM: Missing access token');
    }

    try {
      const access_token = decryptAccessToken(item.accessToken, encryptedKey);
      const data = await this.handleResponse(
        this.client.accountsGet({ access_token })
      );

      return data.accounts.map(account => ({
        ...account,
        itemId: data.item.item_id
      }));
    } catch (error) {
      if (error.error_code === 'ITEM_LOGIN_REQUIRED') {
        throw {
          error_code: 'ITEM_LOGIN_REQUIRED',
          error_message: 'This connection requires reauthentication',
          item_id: item.itemId
        };
      }
      throw new Error(`ACCOUNT_FETCH_ERROR: ${error.message}`);
    }
  }

  // ... other helper methods from your original plaidAccountService
}

export default new PlaidAccountService(plaidClientInstance); 