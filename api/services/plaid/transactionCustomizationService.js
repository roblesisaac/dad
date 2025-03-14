import transactionCustomizations from '../../models/transactionCustomizations.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import { CustomError } from './customError.js';

/**
 * Service responsible for managing transaction customizations
 * Handles creating, updating, and finding customizations
 */
class TransactionCustomizationService {
  /**
   * Creates or updates a customization for a transaction
   * @param {String} transactionId - The Plaid transaction_id
   * @param {Object} customizationData - Customization data to save
   * @param {Object} user - User object
   * @returns {Promise<Object>} Saved customization
   */
  async saveCustomization(transactionId, customizationData, user) {
    if (!user || !user._id) {
      throw new CustomError('INVALID_USER', 'Missing required user data');
    }

    if (!transactionId) {
      throw new CustomError('INVALID_TRANSACTION', 'Transaction ID is required');
    }

    try {
      // Find the transaction to get its internal _id and other required fields
      const transaction = await this._findTransactionById(transactionId, user._id);
      
      if (!transaction) {
        throw new CustomError('TRANSACTION_NOT_FOUND', `Transaction ${transactionId} not found`);
      }
      
      // Check if customization already exists
      const existingCustomization = await this._findExistingCustomization(transaction._id, user._id);
      
      // Prepare customization data
      const customizationToSave = {
        ...customizationData,
        userId: user._id,
        transaction_id: transaction.transaction_id,
        transaction_item_id: transaction._id,
        account_id: transaction.account_id,
        pending_transaction_id: transaction.pending_transaction_id || null,
        authorized_date: transaction.authorized_date || transaction.date,
        amount: transaction.amount.toString()  // Store as string for consistent lookups
      };
      
      // Update existing or create new
      if (existingCustomization) {
        return await transactionCustomizations.update(
          { _id: existingCustomization._id },
          customizationToSave
        );
      } else {
        return await transactionCustomizations.save(customizationToSave);
      }
    } catch (error) {
      throw new CustomError(
        'CUSTOMIZATION_SAVE_ERROR', 
        `Failed to save customization: ${error.message}`,
        { cause: error }
      );
    }
  }

  /**
   * Finds an existing customization for a transaction
   * @param {String} transactionItemId - Internal transaction _id
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} Existing customization or null
   * @private
   */
  async _findExistingCustomization(transactionItemId, userId) {
    const customizations = await transactionCustomizations.find({
      transaction_item_id: transactionItemId,
      userId
    }, { limit: 1 });
    
    return customizations.items.length > 0 ? customizations.items[0] : null;
  }

  /**
   * Finds a transaction by its Plaid transaction_id
   * @param {String} transactionId - Plaid transaction_id
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} Transaction or null
   * @private
   */
  async _findTransactionById(transactionId, userId) {
    const transactions = await plaidTransactions.find({
      transaction_id: transactionId,
      userId
    }, { limit: 1 });
    
    return transactions.items.length > 0 ? transactions.items[0] : null;
  }

  /**
   * Gets customizations for a list of transactions
   * @param {Array<String>} transactionIds - List of Plaid transaction_ids
   * @param {Object} user - User object
   * @returns {Promise<Object>} Map of transaction_id to customization
   */
  async getCustomizationsForTransactions(transactionIds, user) {
    if (!user || !user._id) {
      throw new CustomError('INVALID_USER', 'Missing required user data');
    }

    if (!transactionIds || !transactionIds.length) {
      return {};
    }

    try {
      // First find all the transactions to get their internal _ids
      const transactions = await this._findTransactionsById(transactionIds, user._id);
      
      if (!transactions || transactions.length === 0) {
        return {};
      }
      
      // Extract transaction item IDs
      const transactionItemIds = transactions.map(tx => tx._id);
      
      // Find customizations for these transaction item IDs
      const customizations = await this._findCustomizationsByTransactionItemIds(
        transactionItemIds, 
        user._id
      );
      
      // Create a map of transaction_id to customization
      const customizationMap = {};
      for (const customization of customizations) {
        customizationMap[customization.transaction_id] = customization;
      }
      
      return customizationMap;
    } catch (error) {
      throw new CustomError(
        'CUSTOMIZATION_FETCH_ERROR', 
        `Failed to fetch customizations: ${error.message}`,
        { cause: error }
      );
    }
  }

  /**
   * Finds transactions by their Plaid transaction_ids
   * @param {Array<String>} transactionIds - List of Plaid transaction_ids
   * @param {String} userId - User ID
   * @returns {Promise<Array<Object>>} Transactions
   * @private
   */
  async _findTransactionsById(transactionIds, userId) {
    // Process in batches to avoid potential issues with large queries
    const batchSize = 25;
    const allTransactions = [];
    
    for (let i = 0; i < transactionIds.length; i += batchSize) {
      const batchIds = transactionIds.slice(i, i + batchSize);
      
      // For each ID in batch, find the transaction
      for (const txId of batchIds) {
        const transaction = await this._findTransactionById(txId, userId);
        if (transaction) {
          allTransactions.push(transaction);
        }
      }
    }
    
    return allTransactions;
  }

  /**
   * Finds customizations by transaction item IDs
   * @param {Array<String>} transactionItemIds - List of internal transaction _ids
   * @param {String} userId - User ID
   * @returns {Promise<Array<Object>>} Customizations
   * @private
   */
  async _findCustomizationsByTransactionItemIds(transactionItemIds, userId) {
    // Process in batches to avoid potential issues with large queries
    const batchSize = 25;
    const allCustomizations = [];
    
    for (let i = 0; i < transactionItemIds.length; i += batchSize) {
      const batchIds = transactionItemIds.slice(i, i + batchSize);
      
      // For each ID in batch, find customizations
      for (const txItemId of batchIds) {
        const customization = await this._findExistingCustomization(txItemId, userId);
        if (customization) {
          allCustomizations.push(customization);
        }
      }
    }
    
    return allCustomizations;
  }

  /**
   * Updates all customizations waiting to be relinked
   * This is used after a recovery when new transactions have been fetched
   * @param {String} userId - User ID
   * @returns {Promise<number>} Number of customizations updated
   */
  async relinkPendingCustomizations(userId) {
    try {
      // Find all customizations marked for relinking
      const pendingCustomizations = await transactionCustomizations.find({
        pendingRelink: true,
        userId
      });
      
      if (!pendingCustomizations.items || pendingCustomizations.items.length === 0) {
        return 0;
      }
      
      let updatedCount = 0;
      
      // Process each pending customization
      for (const customization of pendingCustomizations.items) {
        // Extract the transaction_id from the special format
        const txIdMatch = /pending_relink:(.+)/.exec(customization.transaction_item_id);
        if (!txIdMatch || !txIdMatch[1]) continue;
        
        const transactionId = txIdMatch[1];
        
        // Find the new transaction with this transaction_id
        const transaction = await this._findTransactionById(transactionId, userId);
        
        if (!transaction) {
          // Transaction not found yet, skip for now
          continue;
        }
        
        // Update the customization with the new transaction_item_id
        await transactionCustomizations.update(
          { _id: customization._id },
          {
            transaction_item_id: transaction._id,
            pendingRelink: false
          }
        );
        
        updatedCount++;
      }
      
      return updatedCount;
    } catch (error) {
      console.error('Error relinking pending customizations:', error);
      return 0;
    }
  }
}

export default new TransactionCustomizationService(); 