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
      const res = await plaidTransactions.findAll(formattedQuery);
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
   * Process and save added transactions 
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
   * Create a single transaction
   * @param {Object} transaction - Transaction data to create
   * @returns {Promise<Object>} Created transaction
   */
  async createTransaction(transaction) {
    try {
      if (!transaction) {
        throw new CustomError('INVALID_PARAMS', 'Missing transaction data');
      }
      
      const result = await plaidTransactions.save(transaction);
      return result;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new CustomError('TRANSACTION_SAVE_ERROR', 
        `Failed to save transaction: ${error.message}`);
    }
  }

  /**
   * Update a single transaction
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

      console.log('result', result);
      
      return result;
    } catch (error) {
      console.error('Error in batch processing modified transactions:', error);
      throw new CustomError('TRANSACTION_BATCH_ERROR', 
        `Failed to process batch of ${transactions?.length} modifications: ${error.message}`);
    }
  }

  /**
   * Remove a single transaction
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
        throw new CustomError('NOT_FOUND', 'Transaction not found or not removed');
      }
      
      return result;
    } catch (error) {
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

  /**
   * Manually add a transaction from error data
   * @returns {Promise<Object>} Added transaction
   */
  async addTransactionFromError(transaction, userId, syncSessionId = null) {
    try {
      // Validate input
      if (!transaction || !transaction.transaction_id) {
        throw new Error('Invalid transaction data');
      }

      if (!userId) {
        throw new Error('User ID is required');
      }
      
      // Enrich transaction with userId and metadata
      const enrichedTransaction = this._enrichTransaction(transaction, userId);
      
      // Check if this transaction already exists
      const existing = await this.fetchTransactionByTransactionId(transaction.transaction_id, userId);
      
      if (existing) {
        throw new CustomError('DUPLICATE_TRANSACTION', 'Transaction already exists in the database');
      }
      
      // Save the transaction
      const result = await plaidTransactions.save(enrichedTransaction);
      
      // If a sync session ID was provided, update the failed transactions to mark this as manually added
      if (syncSessionId) {
        try {
          // Import dynamically to avoid circular dependencies
          const [SyncSessions, syncSessionService] = await Promise.all([
            import('../../models/syncSession.js').then(module => module.default),
            import('./syncSessionService.js').then(module => module.default)
          ]);
          
          // Get the session
          const session = await SyncSessions.findOne(syncSessionId);
          
          if (session) {
            // Make sure failedTransactions is properly initialized
            const failedTransactions = session.failedTransactions || {
              added: [],
              modified: [],
              removed: [],
              skipped: []
            };
            
            // Find the transaction in modified list (if it exists)
            const modifiedList = failedTransactions.modified || [];
            const index = modifiedList.findIndex(t => t.transaction_id === transaction.transaction_id);
            
            if (index >= 0) {
              // Update the transaction in the list to mark it as manually added
              modifiedList[index] = {
                ...modifiedList[index],
                manuallyAdded: true,
                addedAt: Date.now()
              };
              
              // Use the specialized method for updating transaction data
              await syncSessionService.updateSessionWithTransactionData(
                session,
                {
                  failedTransactions: {
                    ...failedTransactions,
                    modified: modifiedList
                  }
                }
              );
            }
          }
        } catch (err) {
          console.error('Error updating sync session:', err);
          // Don't fail the whole operation if just the session update fails
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error manually adding transaction:', error);
      throw CustomError.createFormattedError(error, {
        transactionId: transaction?.transaction_id,
        userId,
        operation: 'add_transaction_from_error'
      });
    }
  }

  /**
   * Helper method to enrich a transaction with user ID and metadata
   * @private
   */
  _enrichTransaction(transaction, userId) {
    return {
      ...transaction,
      userId,
      manuallyAdded: true,
      addedAt: Date.now()
    };
  }
}

export default new TransactionQueryService(); 