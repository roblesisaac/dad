import PlaidBaseService from './baseService.js';
import plaidItems from '../../models/plaidItems.js';
import { linkService, transactionService } from './index.js';
import plaidTasks from '../../tasks/plaid.js';
import { plaidClientInstance } from './plaidClientConfig.js';

class PlaidItemService extends PlaidBaseService {
  async getItems(userId, itemId = null) {
    if (!userId) {
      throw new Error('INVALID_USER: User ID is required');
    }

    try {
      if (itemId) {
        const item = await plaidItems.findOne({ userId, itemId });
        if (!item) {
          throw new Error('ITEM_NOT_FOUND: Item not found for this user');
        }
        return item;
      }

      const { items } = await plaidItems.find({ itemId: '*', userId });
      return items;
    } catch (error) {
      throw new Error(`ITEM_FETCH_ERROR: ${error.message}`);
    }
  }

  async syncItems(user) {
    this.validateUser(user);

    try {
      const userItems = await this.getItems(user._id);
      let syncedItems = [];

      for (const item of userItems) {
        try {
          const access_token = linkService.decryptAccessToken(item.accessToken, user.encryptedKey);

          const plaidItem = await this.client.itemGet({ access_token });

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

  async updateItemSyncStatus(itemId, syncData) {
    try {
      syncData.result = syncData.result || {};
      const updated = await plaidItems.update(itemId, { syncData });
      return { itemId, ...updated.syncData };
    } catch (error) {
      throw new Error(`ITEM_UPDATE_ERROR: ${error.message}`);
    }
  }
}

export default new PlaidItemService(plaidClientInstance); 