import PlaidBaseService from './baseService.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import { CustomError } from './customError.js';

/**
 * Service responsible for querying and retrieving transactions
 * Handles search, filtering, and specialized queries
 */
class TransactionQueryService extends PlaidBaseService {
  /**
   * Format a date range query for specific account
   * @private
   */
  _formatDateForQuery(accountId, dateRange) {
    if (!accountId || !dateRange) {
      return null;
    }
    
    // Split the date range by underscore separator
    const [startDate, endDate] = dateRange.split('_');
    
    if (!startDate) return null;
    
    if (endDate) {
      return `${accountId}:${startDate.trim()}|accountdate_${accountId}:${endDate.trim()}`;
    } else {
      return `${accountId}:${startDate.trim()}*`;
    }
  }
  async fetchTransactions(user, query) {
    try {
      // Initialize the formatted query with the user ID
      const formattedQuery = { userId: user._id };
      
      // Format account_id if present
      if (query.account_id) {
        formattedQuery.account_id = `${query.account_id}:${query.account_id}*`;
      }
      
      // Format date range for accountdate if present
      if (query.date && query.account_id) {
        const formattedDate = this._formatDateForQuery(query.account_id, query.date);
        if (formattedDate) {
          formattedQuery.accountdate = formattedDate;
        }
      }
      
      // Remove any keys that shouldn't be in the final query
      ['date', 'select'].forEach(key => {
        delete query[key];
      });
      
      // Execute the query
      const res = await plaidTransactions.find(formattedQuery);
      return Array.isArray(res) ? res : (res.items || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new CustomError('FETCH_ERROR', error.message);
    }
  }
  async fetchTransactionById(transactionId, userId) {
    try {
      if (!transactionId || !userId) {
        throw new CustomError('INVALID_PARAMS', 'Missing transaction ID or user ID');
      }
      
      const transaction = await plaidTransactions.findOne({
        transaction_id: transactionId,
        userId
      });
      
      if (!transaction) {
        throw new CustomError('NOT_FOUND', 'Transaction not found');
      }
      
      return transaction;
    } catch (error) {
      console.error('Error fetching transaction by ID:', error);
      throw CustomError.createFormattedError(error, {
        transactionId,
        userId,
        operation: 'fetch_transaction'
      });
    }
  }

  async fetchTransactionByTransactionId(transactionId, userId) {
    const transaction = await plaidTransactions.findOne({
      transaction_id: transactionId,
      userId
    });
    return transaction;
  }

  async fetchTransactionByCursor(cursor, userId) {
    const transaction = await plaidTransactions.findOne({
      cursor,
      userId
    });
    return transaction;
  }

  async fetchTransactionsBySyncTime(syncTime, userId) {
    const transactions = await plaidTransactions.findAll({
      syncTime,
      userId
    });
    return transactions;
  }

  async findDuplicates(userId) {
    try {
      // Find potential duplicates based on name, amount, and date
      const transactions = await plaidTransactions.findAll({
        userId,
        transaction_id: '*'
      });
      
      const duplicateGroups = {};
      
      // Group transactions by name, amount, and date to find duplicates
      transactions.forEach(tx => {
        // Create a key based on name, amount, and date
        const key = `${tx.name}_${tx.amount}_${tx.date}`;
        
        if (!duplicateGroups[key]) {
          duplicateGroups[key] = [];
        }
        
        duplicateGroups[key].push(tx);
      });
      
      // Filter for groups with more than one transaction
      const results = Object.values(duplicateGroups)
        .filter(group => group.length > 1)
        .map(group => ({
          key: `${group[0].name}_${group[0].amount}_${group[0].date}`,
          count: group.length,
          transactions: group
        }));
      
      return results;
    } catch (error) {
      console.error('Error finding duplicates:', error);
      throw new CustomError('DUPLICATE_SEARCH_ERROR', error.message);
    }
  }

  /**
   * Batch creates multiple transactions
   * @param {Array} transactions - Array of transaction objects to create
   * @param {Object} user - User object with _id
   * @param {Object} options - Additional options (syncTime, cursor, etc.)
   * @returns {Promise<number>} Count of transactions created
   */
  async batchCreateTransactions(transactions, user, options = {}) {
    if (!transactions || !transactions.length) {
      return 0;
    }
    
    try {
      const { itemId, cursor, syncTime } = options;
      
      const formattedTransactions = transactions.map(transaction => ({
        ...transaction,
        userId: user._id,
        itemId: itemId || transaction.itemId,
        cursor: cursor || transaction.cursor,
        user: { _id: user._id },
        syncTime
      }));
      
      // Use insertMany for batch inserts
      const results = await plaidTransactions.insertMany(formattedTransactions);
      
      return results.length;
    } catch (error) {
      console.error('Error creating transactions:', error);
      throw new CustomError('TRANSACTION_SAVE_ERROR', 
        `Failed to save ${transactions.length} transactions: ${error.message}`);
    }
  }

  /**
   * Batch updates multiple transactions
   * @param {Array} transactions - Array of transaction objects to update
   * @param {Object} user - User object with _id
   * @param {Object} options - Additional options (syncTime, cursor, etc.)
   * @returns {Promise<number>} Count of transactions updated
   */
  async batchUpdateTransactions(transactions, user, options = {}) {
    if (!transactions || !transactions.length) {
      return 0;
    }
    
    try {
      const { syncTime, cursor } = options;
      
      const updatePromises = transactions.map(transaction => {
        // Build update object
        const updates = { ...transaction };
        
        // Skip _id field if present as it shouldn't be modified
        delete updates._id;
        
        // Add metadata if provided in options
        if (cursor) updates.cursor = cursor;
        if (syncTime) updates.syncTime = syncTime;
        
        // Use update method with filter including userId for security
        return plaidTransactions.update(
          { 
            transaction_id: transaction.transaction_id, 
            userId: user._id 
          }, 
          updates
        );
      });
      
      // Execute updates in parallel
      const results = await Promise.all(updatePromises);
      return results.filter(result => result !== null).length;
    } catch (error) {
      console.error('Error updating transactions:', error);
      throw new CustomError('TRANSACTION_UPDATE_ERROR', 
        `Failed to update ${transactions.length} transactions: ${error.message}`);
    }
  }

  /**
   * Batch removes transactions by their transaction_ids
   * @param {Array<string>} transactionIds - Array of transaction IDs to remove
   * @param {string} userId - User ID
   * @returns {Promise<number>} Count of transactions removed
   */
  async batchRemoveTransactions(transactionIds, userId) {
    if (!transactionIds || !transactionIds.length) {
      return 0;
    }
    
    try {
      let deletedCount = 0;
      
      // Process deletions in batches to avoid too many concurrent operations
      const batchSize = 25;
      
      for (let i = 0; i < transactionIds.length; i += batchSize) {
        const batch = transactionIds.slice(i, i + batchSize);
        
        // Process this batch of deletions in parallel
        const deletePromises = batch.map(async (id) => {
          try {
            // Use the correct erase method for deletion
            const result = await plaidTransactions.erase({
              transaction_id: id,
              userId // Include userId to ensure we only delete user's transactions
            });
            
            return result.removed ? 1 : 0;
          } catch (err) {
            console.warn(`Failed to delete transaction ${id}: ${err.message}`);
            return 0;
          }
        });
        
        // Wait for all deletions in this batch
        const results = await Promise.all(deletePromises);
        deletedCount += results.reduce((sum, count) => sum + count, 0);
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error removing transactions:', error);
      throw new CustomError('TRANSACTION_REMOVE_ERROR', 
        `Failed to remove transactions: ${error.message}`);
    }
  }
}

export default new TransactionQueryService(); 