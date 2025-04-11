import PlaidBaseService from './baseService.js';
import plaidItems from '../../models/plaidItems.js';
import { decrypt, decryptWithKey, encrypt, encryptWithKey } from '../../utils/encryption.js';
import { CustomError } from './customError.js';

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

  async getUserItems(userId) {
    if (!userId) {
      throw new Error('INVALID_USER: User ID is required');
    }

    try {
      const { items } = await plaidItems.find({ itemId: '*', userId });

      if (!items) {
        return [];
      }

      return items.map(item => ({ ...item, user: { _id: userId } }));
    } catch (error) {
      throw new Error(`ITEM_FETCH_ERROR: ${error.message}`);
    }
  }

  async getItem(itemId, userId) {
    const item = await plaidItems.findOne({ itemId, userId });
    if (!item) {
      return null;
    }
    item.user = { _id: userId };
    return item;
  }

  /**
   * Updates an item's sync status
   * @returns {Promise<Object>} Updated item
   */
  async updateItemSyncStatus(itemId, userId, syncDataUpdate) {
    try {
      if (!itemId || !userId) {
        throw new Error('INVALID_PARAMS: Missing itemId or userId');
      }

      // Get the current item first
      const currentItem = await this.getItem(itemId, userId);
      
      if (!currentItem) {
        throw new Error('ITEM_NOT_FOUND: Could not find item to update');
      }
      
      // Create a proper merger of existing and new sync data
      // Handle the case where currentItem.syncData might be null/undefined
      const existingSyncData = currentItem.syncData || {
        status: 'none',
        lastSyncTime: null,
        cursor: null,
        error: null,
        branchNumber: 0,
        stats: {
          added: 0,
          modified: 0,
          removed: 0
        }
      };
      
      // Merge stats if they exist in both objects
      let mergedStats;
      if (syncDataUpdate.stats && existingSyncData.stats) {
        mergedStats = {
          ...existingSyncData.stats,
          ...syncDataUpdate.stats
        };
      } else if (syncDataUpdate.stats) {
        mergedStats = syncDataUpdate.stats;
      } else {
        mergedStats = existingSyncData.stats;
      }
      
      // Create the final sync data object for update
      const updatedSyncData = {
        ...existingSyncData,
        ...syncDataUpdate,
        stats: mergedStats
      };
      
      // Update the item
      const updatedItem = await plaidItems.update(
        { itemId, userId },
        { syncData: updatedSyncData }
      );
      
      if (updatedItem.modifiedCount === 0) {
        throw new Error('ITEM_UPDATE_ERROR: Failed to update item sync status');
      }
      
      // Return the updated item
      return updatedItem;
    } catch (error) {
      console.error('Error updating item sync status:', error);
      throw new Error(`ITEM_UPDATE_ERROR: ${error.message}`);
    }
  }

  async savePlaidAccessData(accessData, user) {
    if (!accessData?.access_token || !accessData?.item_id) {
      throw new Error('INVALID_ACCESS_DATA: Missing required access data');
    }

    try {
      const { access_token, item_id } = accessData;

      const existingItem = await plaidItems.findOne({ itemId: item_id, userId: user._id });
      const accessToken = existingItem
        ? this.setAccessToken(access_token, user)
        : access_token;

      const itemData = {
        itemId: item_id,
        user,
        accessToken
      }

      const savedItem = existingItem
        ? await plaidItems.update({ itemId: item_id, userId: user._id }, itemData)
        : await plaidItems.save(itemData);

      return { 
        itemId: item_id,
        syncData: savedItem.syncData,
        userId: user._id
      }
    } catch (error) {
      console.error('Save error:', error);
      throw new Error(`SAVE_ERROR: Failed to save Plaid access data - ${error.message}`);
    }
  }

  setAccessToken(accessToken, user) {
    const encryptionKey = decrypt(user?.encryptedKey, 'buffer');
    const userEncryptedKey = encryptWithKey(accessToken, encryptionKey);
    const encrypted = encrypt(userEncryptedKey);
    return encrypted;
  }

  /**
   * Validates item data and retrieves it if needed
   * @returns {Object} Validated item object
   */
  async validateAndGetItem(item, user) {
    // If item is a string (ID), fetch the actual item
    if (typeof item === 'string') {
      const fetchedItem = await this.getItem(item, user._id)
      if (!fetchedItem) {
        throw new CustomError('ITEM_NOT_FOUND', 'Item not found');
      }
      return fetchedItem;
    }
    
    // If item is an object, ensure it has required fields
    if (typeof item === 'object' && item !== null) {
      if (!item.itemId && !item._id) {
        throw new CustomError('INVALID_ITEM', 'Item is missing ID');
      }
      
      if (!item.accessToken) {
        const fetchedItem = await this.getItem(item.itemId, user._id);
        if (!fetchedItem) {
          throw new CustomError('ITEM_NOT_FOUND', 'Item not found');
        }
        return fetchedItem;
      }
      
      return item;
    }
    
    throw new CustomError('INVALID_ITEM', 'Invalid item data type');
  }
  
  /**
   * Updates an item's properties
   * @returns {Promise<Object>} Updated item
   */
  async updateItem(itemId, userId, updateData) {
    try {
      if (!itemId || !userId) {
        throw new Error('INVALID_PARAMS: Missing itemId or userId');
      }
      
      // Get the current item first to verify it exists
      const currentItem = await this.getItem(itemId, userId);
      
      if (!currentItem) {
        throw new Error('ITEM_NOT_FOUND: Could not find item to update');
      }
      
      // Validate update data - only allow specific fields to be updated
      const validUpdateFields = ['institutionName', 'institutionId'];
      const sanitizedUpdateData = {};
      
      Object.keys(updateData).forEach(key => {
        if (validUpdateFields.includes(key)) {
          sanitizedUpdateData[key] = updateData[key];
        }
      });
      
      if (Object.keys(sanitizedUpdateData).length === 0) {
        throw new Error('INVALID_UPDATE: No valid fields to update');
      }
      
      // Update the item
      const result = await plaidItems.update(
        { itemId, userId },
        sanitizedUpdateData
      );
      
      if (result.modifiedCount === 0) {
        throw new Error('ITEM_UPDATE_ERROR: Failed to update item');
      }
      
      // Return the updated item
      const updatedItem = await this.getItem(itemId, userId);
      return updatedItem;
    } catch (error) {
      console.error('Error updating item:', error);
      throw new Error(`ITEM_UPDATE_ERROR: ${error.message}`);
    }
  },
  
  /**
   * Unlinks a Plaid item (soft delete)
   * @param {String} itemId - Item ID to unlink
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Result of the unlink operation
   */
  async unlinkItem(itemId, userId) {
    try {
      if (!itemId || !userId) {
        throw new Error('INVALID_PARAMS: Missing itemId or userId');
      }
      
      // Get the current item first to verify it exists
      const currentItem = await this.getItem(itemId, userId);
      
      if (!currentItem) {
        throw new Error('ITEM_NOT_FOUND: Could not find item to unlink');
      }
      
      // Save the current sync cursor and other important metadata
      const { syncData, syncTag, sync_id } = currentItem;
      
      // Mark the item as disconnected but preserve its metadata
      const result = await plaidItems.update(
        { itemId, userId },
        { 
          status: 'disconnected',
          // Preserve the access token but mark that it's invalid
          // We don't remove it completely to maintain the DB structure
          disconnectedAt: Date.now()
        }
      );
      
      if (result.modifiedCount === 0) {
        throw new Error('ITEM_UNLINK_ERROR: Failed to unlink item');
      }
      
      return {
        itemId,
        status: 'disconnected',
        success: true
      };
    } catch (error) {
      console.error('Error unlinking item:', error);
      throw new Error(`ITEM_UNLINK_ERROR: ${error.message}`);
    }
  },
  
  /**
   * Relinks a previously unlinked Plaid item
   * @param {String} itemId - Original item ID
   * @param {String} userId - User ID
   * @param {String} publicToken - New public token from Plaid Link
   * @returns {Promise<Object>} - Result of the relink operation
   */
  async relinkItem(itemId, userId, publicToken) {
    try {
      if (!itemId || !userId || !publicToken) {
        throw new Error('INVALID_PARAMS: Missing required parameters');
      }
      
      // Get the unlinked item to preserve its metadata
      const unlinkedItem = await this.getItem(itemId, userId);
      
      if (!unlinkedItem) {
        throw new Error('ITEM_NOT_FOUND: Could not find item to relink');
      }
      
      // Check if the item is actually disconnected
      if (unlinkedItem.status !== 'disconnected') {
        throw new Error('INVALID_ITEM_STATE: Item is not in disconnected state');
      }
      
      // Save the important metadata
      const { syncData, syncTag, sync_id, institutionName, institutionId } = unlinkedItem;
      
      // Exchange the public token for a new access token via Plaid API
      const plaid = await import('../../services/plaid/plaidService.js')
        .then(module => module.default);
      
      const accessData = await plaid.exchangePublicToken(publicToken);
      
      if (!accessData?.access_token || !accessData?.item_id) {
        throw new Error('INVALID_ACCESS_DATA: Failed to exchange public token');
      }
      
      // Encrypt the new access token
      const encryptionKey = decrypt(unlinkedItem.user?.encryptedKey || '', 'buffer');
      const userEncryptedKey = encryptWithKey(accessData.access_token, encryptionKey);
      const encryptedAccessToken = encrypt(userEncryptedKey);
      
      // Update the item with the new access token while preserving metadata
      const result = await plaidItems.update(
        { itemId, userId },
        { 
          accessToken: encryptedAccessToken,
          status: 'complete',
          // Preserve the existing metadata
          syncData,
          syncTag,
          sync_id,
          // Clear the disconnected timestamp
          disconnectedAt: null
        }
      );
      
      if (result.modifiedCount === 0) {
        throw new Error('ITEM_RELINK_ERROR: Failed to relink item');
      }
      
      return {
        itemId,
        status: 'complete',
        success: true
      };
    } catch (error) {
      console.error('Error relinking item:', error);
      throw new Error(`ITEM_RELINK_ERROR: ${error.message}`);
    }
  }
}

export default new ItemService(); 