import PlaidBaseService from './baseService.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import { CustomError } from './customError.js';

/**
 * Service responsible for querying and retrieving transactions
 * Handles search, filtering, and specialized queries
 */
class TransactionQueryService extends PlaidBaseService {
  _datePattern = /^\d{4}-\d{2}-\d{2}$/;
  _pageLimit = 250;

  _isValidIsoDate(date) {
    return typeof date === 'string' && this._datePattern.test(date);
  }

  _parseDateRange(dateRange) {
    if (!dateRange || typeof dateRange !== 'string') {
      return null;
    }

    const [startDateRaw, endDateRaw] = dateRange.split('_');
    const startDate = startDateRaw?.trim();
    const endDate = endDateRaw?.trim();

    if (!this._isValidIsoDate(startDate)) {
      return null;
    }

    if (endDate && !this._isValidIsoDate(endDate)) {
      return null;
    }

    return { startDate, endDate: endDate || null };
  }

  _buildMonthPrefixes(startDate, endDate) {
    const prefixes = [];
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return prefixes;
    }

    let cursorYear = start.getUTCFullYear();
    let cursorMonth = start.getUTCMonth() + 1;
    const endYear = end.getUTCFullYear();
    const endMonth = end.getUTCMonth() + 1;

    while (cursorYear < endYear || (cursorYear === endYear && cursorMonth <= endMonth)) {
      prefixes.push(`${cursorYear}-${String(cursorMonth).padStart(2, '0')}`);
      cursorMonth += 1;
      if (cursorMonth > 12) {
        cursorMonth = 1;
        cursorYear += 1;
      }
    }

    return prefixes;
  }

  _getTransactionDate(transaction = {}) {
    return transaction.authorized_date || transaction.date || '';
  }

  _isTransactionInRange(transaction, startDate, endDate) {
    const txDate = this._getTransactionDate(transaction);
    if (!this._isValidIsoDate(txDate)) {
      return false;
    }

    if (txDate < startDate) {
      return false;
    }

    if (endDate && txDate > endDate) {
      return false;
    }

    return true;
  }

  _buildDedupeKey(transaction = {}) {
    return transaction.transaction_id
      || `${transaction.account_id || ''}-${transaction.authorized_date || transaction.date || ''}-${transaction.amount || ''}-${transaction.name || ''}`;
  }

  async _fetchTransactionsForMonthPrefix(userId, accountId, monthPrefix) {
    return await plaidTransactions.findAll({
      userId,
      accountdate: `${accountId}:${monthPrefix}*`
    }, {
      limit: this._pageLimit
    });
  }

  async _fetchTransactionsByMonthRange(userId, accountId, startDate, endDate) {
    const monthPrefixes = this._buildMonthPrefixes(startDate, endDate);
    const deduped = new Map();

    for (const monthPrefix of monthPrefixes) {
      const monthTransactions = await this._fetchTransactionsForMonthPrefix(userId, accountId, monthPrefix);

      for (const transaction of monthTransactions) {
        if (!transaction) {
          continue;
        }

        deduped.set(this._buildDedupeKey(transaction), transaction);
      }
    }

    return [...deduped.values()].filter(transaction =>
      this._isTransactionInRange(transaction, startDate, endDate)
    );
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
  async fetchTransactions(user, query) {
    try {
      const userId = user?._id;
      if (!userId) {
        throw new CustomError('INVALID_USER', 'Missing user identifier');
      }

      const accountId = query?.account_id;
      const parsedDateRange = this._parseDateRange(query?.date);

      // Primary strategy for bounded ranges: query month prefixes (YYYY-MM*)
      // to avoid large single-range lookups and edge-case range parsing failures.
      if (accountId && parsedDateRange?.startDate && parsedDateRange?.endDate) {
        return await this._fetchTransactionsByMonthRange(
          userId,
          accountId,
          parsedDateRange.startDate,
          parsedDateRange.endDate
        );
      }

      // Initialize the formatted query with the user ID
      const formattedQuery = { userId };

      // Format date range for accountdate if present
      if (query?.date && accountId) {
        const formattedDate = this._formatDateForQuery(accountId, query.date);
        if (formattedDate) {
          formattedQuery.accountdate = formattedDate;
        }
      } else if (accountId) {
        // Account-only query fallback uses accountdate label prefix directly.
        formattedQuery.accountdate = `${accountId}:*`;
      }

      // Execute the query across all pages
      const res = await plaidTransactions.findAll(formattedQuery, {
        limit: this._pageLimit
      });
      return Array.isArray(res) ? res : (res.items || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);

      if (error.message?.includes('Pagination cursor repeated')) {
        throw new CustomError('PAGINATION_CURSOR_LOOP', error.message);
      }

      if (error.message?.includes('Pagination exceeded safe limit')) {
        throw new CustomError('PAGINATION_LIMIT_EXCEEDED', error.message);
      }

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
   * Process and save added transactions 
   * @param {Array} transactions - Transactions to add
   * @param {Object} item - Item data
   * @param {Object} user - User object
   * @param {String} cursor - Current cursor
   * @param {Number} syncTime - Current sync syncTime timestamp
   * @returns {Promise<Object>} Result with success count and failed transactions
   */
  async processAddedTransactions(transactions, item, user, cursor, syncTime) {
    try {
      // Initialize result tracking
      const result = {
        successCount: 0,
        failedTransactions: []
      };

      if (!transactions || transactions.length === 0) {
        return result;
      }

      // Process transactions individually to track failures
      for (const transaction of transactions) {
        try {
          // Prepare transaction metadata
          const enrichedTransaction = {
            ...transaction,
            userId: user._id,
            itemId: item.itemId,
            cursor,
            syncTime
          };

          // Attempt to create the transaction
          await this.createTransaction(enrichedTransaction);

          // Increment success count
          result.successCount++;
        } catch (err) {
          // Record failed transaction with error details
          result.failedTransactions.push({
            transaction_id: transaction.transaction_id,
            error: {
              message: err.message,
              code: err.code || 'TRANSACTION_SAVE_ERROR',
              timestamp: new Date().toISOString()
            },
            transaction: { ...transaction } // Store original transaction data for retry
          });

          console.error(`Error saving transaction ${transaction.transaction_id}:`, err.message);
        }
      }

      return result;
    } catch (error) {
      console.error('Error in batch processing added transactions:', error);
      throw new CustomError('TRANSACTION_BATCH_ERROR',
        `Failed to process batch of ${transactions?.length} transactions: ${error.message}`);
    }
  }

  /**
   * Create a single transaction (idempotent: duplicates are no-ops)
   * @param {Object} transaction - Transaction data to create
   * @returns {Promise<Object>} Created or existing transaction
   */
  async createTransaction(transaction) {
    try {
      if (!transaction) {
        throw new CustomError('INVALID_PARAMS', 'Missing transaction data');
      }

      const result = await plaidTransactions.save(transaction);
      return result;
    } catch (error) {
      // Idempotent: if duplicate transaction_id, treat as no-op success
      if (error.message?.includes("Duplicate value for 'transaction_id'")) {
        console.log(`Idempotent no-op: transaction ${transaction.transaction_id} already exists`);
        return { transaction_id: transaction.transaction_id, wasNoOp: true };
      }
      console.error('Error creating transaction:', error);
      throw new CustomError('TRANSACTION_SAVE_ERROR',
        `Failed to save transaction: ${error.message}`);
    }
  }

  /**
   * Update a single transaction
   * @param {String} transactionId - Transaction ID to update
   * @param {String} userId - User ID for security
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated transaction
   */
  async updateTransaction(transactionId, userId, updateData) {
    try {
      if (!transactionId || !userId || !updateData) {
        throw new CustomError('INVALID_PARAMS', 'Missing required parameters');
      }

      // Skip _id field if present as it shouldn't be modified
      const updates = { ...updateData };
      delete updates._id;

      const result = await plaidTransactions.update(
        { transaction_id: transactionId, userId },
        updates
      );

      if (!result) {
        throw new CustomError('NOT_FOUND', 'Transaction not found or not updated');
      }

      return result;
    } catch (error) {
      // Idempotent: if transaction missing, upsert by creating it
      if (error.message?.includes('No item found with filter') || error.code === 'NOT_FOUND') {
        console.log(`Idempotent upsert: transaction ${transactionId} not found, creating`);
        return await this.createTransaction({ ...updateData, transaction_id: transactionId, userId });
      }
      console.error('Error updating transaction:', error);
      throw CustomError.createFormattedError(error, {
        transactionId,
        userId,
        operation: 'update_transaction'
      });
    }
  }

  /**
   * Process and update modified transactions
   * @param {Array} transactions - Transactions to modify
   * @param {Object} user - User object
   * @param {String} cursor - Current cursor
   * @param {Number} syncTime - Current sync syncTime timestamp
   * @returns {Promise<Object>} Result with success count and failed transactions
   */
  async processModifiedTransactions(transactions, user, cursor, syncTime) {
    try {
      // Initialize result tracking
      const result = {
        successCount: 0,
        failedTransactions: []
      };

      if (!transactions || transactions.length === 0) {
        return result;
      }

      // Process transactions individually to track failures
      for (const transaction of transactions) {
        try {
          // Prepare transaction metadata
          const updateData = {
            ...transaction,
            cursor,
            syncTime
          };

          // Attempt to update the transaction
          await this.updateTransaction(
            transaction.transaction_id,
            user._id,
            updateData
          );

          // Increment success count
          result.successCount++;
        } catch (err) {
          // Record failed transaction with error details
          result.failedTransactions.push({
            transaction_id: transaction.transaction_id,
            error: {
              message: err.message,
              code: err.code || 'TRANSACTION_UPDATE_ERROR',
              timestamp: new Date().toISOString()
            },
            transaction: { ...transaction } // Store original transaction data for retry
          });

          console.error(`Error updating transaction ${transaction.transaction_id}:`, err.message);
        }
      }

      return result;
    } catch (error) {
      console.error('Error in batch processing modified transactions:', error);
      throw new CustomError('TRANSACTION_BATCH_ERROR',
        `Failed to process batch of ${transactions?.length} modifications: ${error.message}`);
    }
  }

  /**
   * Remove a single transaction
   * @param {String} transactionId - Transaction ID to remove
   * @param {String} userId - User ID for security
   * @returns {Promise<Object>} Result with removed status
   */
  async removeTransaction(transactionId, userId) {
    try {
      if (!transactionId || !userId) {
        throw new CustomError('INVALID_PARAMS', 'Missing required parameters');
      }

      const result = await plaidTransactions.erase({
        transaction_id: transactionId,
        userId
      });

      if (!result || !result.removed) {
        // Idempotent: if transaction already missing, treat as no-op success
        console.log(`Idempotent no-op: transaction ${transactionId} already removed`);
        return { removed: true, wasNoOp: true };
      }

      return result;
    } catch (error) {
      // Idempotent: if transaction not found during erase, treat as no-op
      if (error.message?.includes('Item not found when trying to perform erase') || error.code === 'NOT_FOUND') {
        console.log(`Idempotent no-op: transaction ${transactionId} not found for removal`);
        return { removed: true, wasNoOp: true };
      }
      console.error('Error removing transaction:', error);
      throw CustomError.createFormattedError(error, {
        transactionId,
        userId,
        operation: 'remove_transaction'
      });
    }
  }

  /**
   * Process and remove deleted transactions
   * @param {Array} transactionsToRemove - IDs of transactions to remove
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Result with success count and failed transactions
   */
  async processRemovedTransactions(transactionsToRemove, userId) {
    try {
      // Initialize result tracking
      const result = {
        successCount: 0,
        failedTransactions: []
      };

      if (!transactionsToRemove || transactionsToRemove.length === 0) {
        return result;
      }

      // Extract transaction IDs
      const transactionIds = transactionsToRemove.map(tx => tx.transaction_id);

      // Process transactions individually to track failures
      for (const transactionId of transactionIds) {
        try {
          // Attempt to remove the transaction
          await this.removeTransaction(transactionId, userId);

          // Increment success count
          result.successCount++;
        } catch (err) {
          // Record failed transaction with error details
          result.failedTransactions.push({
            transaction_id: transactionId,
            error: {
              message: err.message,
              code: err.code || 'TRANSACTION_REMOVE_ERROR',
              timestamp: new Date().toISOString()
            }
          });

          console.error(`Error removing transaction ${transactionId}:`, err.message);
        }
      }

      return result;
    } catch (error) {
      console.error('Error in batch processing removed transactions:', error);
      throw new CustomError('TRANSACTION_BATCH_ERROR',
        `Failed to process batch of ${transactionsToRemove?.length} removals: ${error.message}`);
    }
  }
}

export default new TransactionQueryService(); 
