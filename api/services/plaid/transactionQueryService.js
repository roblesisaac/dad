import PlaidBaseService from './baseService.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import { CustomError } from './customError.js';

/**
 * Service responsible for querying and retrieving transactions
 * Handles search, filtering, and specialized queries
 */
class TransactionQueryService extends PlaidBaseService {
  /**
   * Get the latest transaction date from a set of transactions
   * @private
   */
  _getLatestTransactionDate(transactions) {
    if (!transactions || !transactions.length) {
      return null;
    }
    
    // Sort transactions by date (descending)
    const sorted = [...transactions].sort((a, b) => {
      const dateA = new Date(a.date || a.authorized_date);
      const dateB = new Date(b.date || b.authorized_date);
      return dateB - dateA;
    });
    
    // Return the date of the most recent transaction
    return sorted[0].date || sorted[0].authorized_date;
  }

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

  /**
   * Builds a query for transactions based on user ID and query parameters.
   * @param {string} userId - User ID.
   * @param {Object} queryParams - Query parameters.
   * @returns {Object} Formatted query.
   */
  buildUserQueryForTransactions(userId, queryParams) {
    const { account_id, date, limit, offset, sort_by, sort_desc } = queryParams;
    
    // Start with the user ID
    const query = { userId };
    
    // Add account ID if specified
    if (account_id) {
      query.account_id = account_id;
    }
    
    // Add date range if specified
    if (date) {
      // Parse the date range
      const [startDate, endDate] = date.split('_');
      
      if (startDate && endDate) {
        // Date range query
        query.date = `${startDate.trim()}|${endDate.trim()}`;
      } else if (startDate) {
        // Single date query
        query.date = startDate.trim();
      }
    }
    
    // Add pagination
    const options = {};
    if (limit) {
      options.limit = parseInt(limit, 10);
    }
    if (offset) {
      options.offset = parseInt(offset, 10);
    }
    
    // Add sorting
    if (sort_by) {
      options.sort = { [sort_by]: sort_desc === 'true' ? -1 : 1 };
    } else {
      // Default sort by date, newest first
      options.sort = { date: -1 };
    }
    
    return { query, options };
  }

  /**
   * Finds duplicate transactions for a user
   * @param {string} userId - User ID
   * @returns {Array} Potential duplicate transactions
   */
  async findDuplicates(userId) {
    try {
      // Find potential duplicates based on name, amount, and date
      const transactions = await plaidTransactions.find({
        userId
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
}

export default new TransactionQueryService(); 