import PlaidBaseService from './baseService.js';
import plaidItems from '../../models/plaidItems.js';
import { decrypt, decryptWithKey } from '../../utils/encryption.js';
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
   * @param {string} itemId - Item ID
   * @param {string} userId - User ID
   * @param {Object} syncData - Sync status data to update
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
        batchNumber: 0,
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
          { itemId: item_id, userId: user._id },
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

  /**
   * Validates item data and retrieves it if needed
   * @param {Object|String} item - Item object or ID
   * @param {Object} user - User object
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
   * @param {string} itemId - Item ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update (e.g., institutionName)
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
  }

  /**
   * Deletes a Plaid item and its associated data
   * @param {string} itemId - Item ID (Plaid item_id)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Result of the deletion
   */
  async deleteItem(itemId, userId) {
    try {
      if (!itemId || !userId) {
        throw new Error('INVALID_PARAMS: Missing itemId or userId');
      }

      // Get the item to verify it exists
      const item = await this.getItem(itemId, userId);

      if (!item) {
        console.warn(`Item ${itemId} not found for user ${userId}, may already be deleted`);
        return { deleted: false, reason: 'not_found' };
      }

      // Import plaidAccounts here to avoid circular dependencies
      const plaidAccounts = (await import('../../models/plaidAccounts.js')).default;

      // Find and delete associated accounts
      let deletedAccountsCount = 0;
      try {
        const { items: accounts } = await plaidAccounts.find({ itemId, userId });
        if (accounts && accounts.length > 0) {
          for (const account of accounts) {
            if (account && account._id) {
              await plaidAccounts.erase(account._id);
              deletedAccountsCount++;
            }
          }
        }
        console.log(`Deleted ${deletedAccountsCount} accounts for item ${itemId}`);
      } catch (accountError) {
        console.error(`Error deleting accounts for item ${itemId}:`, accountError);
        // Continue with item deletion
      }

      // Delete the item using its _id
      const result = await plaidItems.erase(item._id);

      console.log(`Deleted corrupted item ${itemId} for user ${userId}`);

      return { deleted: true, itemId, _id: item._id, deletedAccountsCount };
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new Error(`ITEM_DELETE_ERROR: ${error.message}`);
    }
  }

  /**
   * Migrates transactions from old items to a new item, then cleans up old items
   * Used when a user reconnects after credentials expire
   * @param {string} newItemId - The new item ID to migrate transactions to
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Migration results
   */
  async migrateAndCleanupOldItems(newItemId, userId) {
    try {
      if (!newItemId || !userId) {
        throw new Error('INVALID_PARAMS: Missing newItemId or userId');
      }

      // Get all items for the user
      const allItems = await this.getUserItems(userId);

      // Filter out the new item to get old items
      const oldItems = allItems.filter(item => item.itemId !== newItemId);

      if (oldItems.length === 0) {
        console.log('No old items to migrate');
        return { migrated: 0, deletedItems: 0, message: 'No old items found' };
      }

      // Import transaction model
      const plaidTransactions = (await import('../../models/plaidTransactions.js')).default;

      let migratedTransactions = 0;
      let deletedItems = 0;

      for (const oldItem of oldItems) {
        try {
          // Find all transactions for this old item
          const { items: transactions } = await plaidTransactions.find({
            itemId: oldItem.itemId,
            userId
          });

          if (transactions && transactions.length > 0) {
            console.log(`Migrating ${transactions.length} transactions from ${oldItem.itemId} to ${newItemId}`);

            // Update each transaction to point to the new item
            for (const transaction of transactions) {
              if (transaction && transaction._id) {
                try {
                  await plaidTransactions.update(transaction._id, {
                    itemId: newItemId
                  });
                  migratedTransactions++;
                } catch (updateError) {
                  console.error(`Failed to migrate transaction ${transaction._id}:`, updateError);
                }
              }
            }
          }

          // Now delete the old item (this also deletes its accounts)
          await this.deleteItem(oldItem.itemId, userId);
          deletedItems++;

        } catch (itemError) {
          console.error(`Error processing old item ${oldItem.itemId}:`, itemError);
          // Continue with other items
        }
      }

      console.log(`Migration complete: ${migratedTransactions} transactions migrated, ${deletedItems} old items deleted`);

      return {
        migrated: migratedTransactions,
        deletedItems,
        message: `Migrated ${migratedTransactions} transactions from ${deletedItems} old items`
      };
    } catch (error) {
      console.error('Error in migration:', error);
      throw new Error(`MIGRATION_ERROR: ${error.message}`);
    }
  }
}

export default new ItemService(); 