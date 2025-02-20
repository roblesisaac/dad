import PlaidBaseService from './baseService.js';
import plaidItems from '../../models/plaidItems.js';
import { itemService } from './index.js';
import plaidTasks from '../../tasks/plaidTask.js';
import { plaidClientInstance } from './plaidClientConfig.js';

class PlaidService extends PlaidBaseService {
  async syncItems(user, userItems) {
    try {
      let syncedItems = [];

      for (const item of userItems) {
        try {
          console.log({
            userItem: item
          });
          const plaidItem = await this.fetchItemFromPlaid(item, user);

          console.log({
            fetchedPlaidItem: plaidItem
          })
          const syncedItem = await plaidTasks.syncTransactionsForItem(plaidItem._id, user);

          syncedItems.push(syncedItem);
        } catch (error) {
          console.error(`Error syncing item ${item._id}:`, error);
          // Continue with other items even if one fails
        }
      }

      if (!syncedItems.length) {
        throw new Error('SYNC_ERROR: Failed to sync any items');
      }

      return syncedItems;
    } catch (error) {
      throw new Error(`ITEM_SYNC_ERROR: ${error.message}`);
    }
  }

  async fetchAccountsFromPlaid(item, user) {
    if (!item?.accessToken) {
        throw new Error('INVALID_ITEM: Missing access token');
      }
  
      try {
        const access_token = itemService.decryptAccessToken(item, user);
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

  async fetchItemFromPlaid(item, user) {
    const access_token = itemService.decryptAccessToken(item, user);
    const plaidItem = await this.client.itemGet({ access_token });
    return plaidItem;
  }

  async fetchTransactionsFromPlaid(access_token, cursor = null, startDate = null) {
    try {
      const request = {
        access_token,
        cursor,
        options: {
          include_personal_finance_category: true
        }
      };

      if (startDate) {
        request.start_date = startDate;
      }

      return await this.handleResponse(
        this.client.transactionsSync(request)
      );
    } catch (error) {
      throw new Error(`PLAID_API_ERROR: ${error.message}`);
    }
  }
}

export default new PlaidService(plaidClientInstance); 