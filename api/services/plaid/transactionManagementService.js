import PlaidBaseService from './baseService.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import itemService from './itemService.js';
import { CustomError } from './customError.js';

/**
 * Service responsible for transaction management operations
 * Handles transaction removal, validation, and other basic operations
 */
class TransactionManagementService extends PlaidBaseService {
  /**
   * Removes transactions from the database
   * @param {Array} transactionIds - Array of transaction IDs to remove
   * @returns {Number} Number of transactions removed
   */
  async removeFromDb(transactionIds) {
    if (!transactionIds || !transactionIds.length) {
      return 0;
    }
    
    let removedCount = 0;
    
    // Remove transactions one by one
    for (const id of transactionIds) {
      try {
        const result = await plaidTransactions.erase({ transaction_id: id });
        if (result && result.removed) {
          removedCount++;
        }
      } catch (error) {
        console.error(`Failed to remove transaction ${id}:`, error.message);
      }
    }
    
    return removedCount;
  }

  /**
   * Validates item data and retrieves it if needed
   * @param {Object|String} item - Item object or ID
   * @param {Object} user - User object
   * @returns {Object} Validated item object
   */
  async _validateAndGetItem(item, user) {
    // If item is a string (ID), fetch the actual item
    if (typeof item === 'string') {
      const fetchedItem = await itemService.getItem(item, user._id);
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
        // If no access token, fetch the full item
        const fetchedItem = await itemService.getItem(item.itemId || item._id, user._id);
        if (!fetchedItem) {
          throw new CustomError('ITEM_NOT_FOUND', 'Item not found');
        }
        return fetchedItem;
      }
      
      return item;
    }
    
    throw new CustomError('INVALID_ITEM', 'Invalid item data type');
  }
}

export default new TransactionManagementService(); 