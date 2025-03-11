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

  /**
   * Fetches transactions based on a query.
   * @param {Object} query - Query object.
   * @returns {Array} Matching transactions.
   */
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

  /**
   * Fetches a transaction by ID and user ID.
   * @param {string} transactionId - Transaction ID.
   * @param {string} userId - User ID.
   * @returns {Object} Transaction data.
   */
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

  async fetchTransactionsBySyncId(syncId, userId) {
    const transactions = await plaidTransactions.findAll({
      syncId,
      userId
    });
    return transactions;
  }

  /**
   * Finds duplicate transactions for a user
   * @param {string} userId - User ID
   * @returns {Array} Potential duplicate transactions
   */
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
   * Removes transactions by ID with error handling
   */
  async removeTransactionsById(transactionIds, userId) {
    let removedCount = 0;
    for (const id of transactionIds) {
      try {
        const result = await plaidTransactions.erase({ transaction_id: id, userId });
        if (result.removed) {
          removedCount++;
        }
      } catch (error) {
        console.error(`Failed to remove transaction ${id}:`, error.message);
      }
    }
    return removedCount;
  }
}

export default new TransactionQueryService(); 