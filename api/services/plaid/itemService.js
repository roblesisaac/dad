import PlaidBaseService from './baseService.js';
import plaidItems from '../../models/plaidItems.js';
import { plaidClientInstance } from './plaidClientConfig.js';
import { decrypt, decryptWithKey } from '../../utils/encryption.js';

class ItemService extends PlaidBaseService {
  decryptAccessToken(item, user) {
    const dblEncryptedAccessToken = item.accessToken;
    const { encryptedKey } = user;

    if (!dblEncryptedAccessToken || !encryptedKey) {
      throw new Error('DECRYPT_ERROR: Missing required encryption data');
    }

    try {
      const encryptedAccessToken = decrypt(dblEncryptedAccessToken);
      const key = decrypt(encryptedKey, 'buffer');
      return decryptWithKey(encryptedAccessToken, key);
    } catch (error) {
      throw new Error(`DECRYPT_ERROR: Failed to decrypt access token - ${error.message}`);
    }
  }

  async getUserItems(userId, itemId = null) {
    if (!userId) {
      throw new Error('INVALID_USER: User ID is required');
    }

    try {
      if (itemId) {
        const item = await plaidItems.findOne({ userId, itemId });
        if (!item) {
          return null;
        }
        item.user = { _id: userId };
        return item;
      }

      const { items } = await plaidItems.find({ itemId: '*', userId });
      return items.map(item => ({ ...item, user: { _id: userId } }));
    } catch (error) {
      throw new Error(`ITEM_FETCH_ERROR: ${error.message}`);
    }
  }

  async updateItemSyncStatus(itemId, userId, syncData) {
    try {
      // Ensure we preserve history and stats
      const item = await this.getUserItems(userId, itemId);

      const currentHistory = item.syncData?.history || [];
      const currentStats = item.syncData?.stats || {
        added: 0,
        modified: 0,
        removed: 0
      };

      const updatedSyncData = {
        ...syncData,
        history: [...currentHistory],
        stats: {
          ...currentStats,
          ...(syncData.stats || {})
        }
      };

      // Add to history if status changed
      if (syncData.status && syncData.status !== item.syncData?.status) {
        updatedSyncData.history.push({
          status: syncData.status,
          cursor: syncData.cursor || item.syncData?.cursor,
          timestamp: Date.now(),
          error: syncData.error,
          stats: syncData.stats
        });
      }

      const updated = await plaidItems.update(
        { itemId, userId },
        { syncData: updatedSyncData }
      );

      return { itemId, ...updated.syncData };
    } catch (error) {
      throw new Error(`ITEM_UPDATE_ERROR: ${error.message}`);
    }
  }

  async savePlaidAccessData(accessData, user) {
    if (!accessData?.access_token || !accessData?.item_id) {
      throw new Error('INVALID_ACCESS_DATA: Missing required access data');
    }

    try {
      const { access_token, item_id } = accessData;

      // Let the model handle default syncData
      const itemData = {
        accessToken: access_token,
        itemId: item_id,
        user
      };

      const existingItem = await plaidItems.findOne({ itemId: item_id, userId: user._id });

      let savedItem;
      if (existingItem) {
        savedItem = await plaidItems.update(
          { itemId: item_id },
          itemData
        );
      } else {
        savedItem = await plaidItems.save(itemData);
      }

      return { 
        itemId: item_id,
        syncData: savedItem.syncData,
        userId: user._id
      };
    } catch (error) {
      console.error('Save error:', error);
      throw new Error(`SAVE_ERROR: Failed to save Plaid access data - ${error.message}`);
    }
  }
}

export default new ItemService(plaidClientInstance); 