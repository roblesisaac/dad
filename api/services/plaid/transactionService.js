import PlaidBaseService from './baseService.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import { itemService, plaidService } from './index.js';
import { plaidClientInstance } from './plaidClientConfig.js';

class PlaidTransactionService extends PlaidBaseService {
  async syncTransactionsForItem(item, user) {
    if (!user) {
      throw new Error('INVALID_USER: Missing required user data');
    }

    try {
      // Get or validate item
      const validatedItem = await this._validateAndGetItem(item, user);

      console.log('Validated item:', validatedItem);
      
      // Check if sync already in progress
      if (this._isSyncInProgress(validatedItem)) {
        return this._createSyncResponse('IN_PROGRESS', validatedItem);
      }

      // Initialize sync
      const syncSession = await this._initializeSync(validatedItem, user);
      
      try {
        // Perform sync
        const result = await this._performSync(syncSession, validatedItem, user);
        
        // Complete sync
        await this._completeSync(validatedItem, result, user);
        
        return this._createSyncResponse('COMPLETED', validatedItem, result);
      } catch (error) {
        // Handle sync error
        await this._handleSyncError(validatedItem, error, user);
        throw error;
      }
    } catch (error) {
      console.error('Error in syncTransactionsForItem:', error);
      throw this._formatError(error);
    }
  }

  async _validateAndGetItem(item, user) {
    try {
      if (typeof item === 'string') {
        if (!user?._id) {
          throw new Error('INVALID_USER: User ID is required to fetch item');
        }
        const foundItem = await itemService.getUserItems(user._id, item);
        if (!foundItem) {
          throw new Error('ITEM_NOT_FOUND: Item not found for this user');
        }
        return foundItem;
      }

      if (!item?.accessToken || !item?._id || !item?.userId) {
        throw new Error('INVALID_ITEM: Missing required item data');
      }

      return item;
    } catch (error) {
      throw this._formatError(error);
    }
  }

  _isSyncInProgress(item) {
    return ['in_progress', 'queued'].includes(item.syncData?.status);
  }

  async _initializeSync(item, user) {
    const syncData = {
      status: 'in_progress',
      lastSyncTime: Date.now(),
      nextSyncTime: Date.now() + (24 * 60 * 60 * 1000),
      cursor: item.syncData?.cursor || null,
      error: null
    };

    await itemService.updateItemSyncStatus(
      item.itemId,
      user._id,
      syncData
    );

    return {
      added: [],
      modified: [],
      removed: [],
      cursor: syncData.cursor
    };
  }

  async _performSync(syncSession, item, user) {
    const access_token = itemService.decryptAccessToken(item, user);
    let hasMore = true;
    let cursor = syncSession.cursor;
    let batchCount = 0;
    let lastCursor = null;
    const RATE_LIMIT_DELAY = 2000;

    // Store these values to avoid losing them between batches
    const { itemId, userId } = item;

    while (hasMore) {
      console.log(`Processing batch ${++batchCount} for item:`, itemId, {
        currentCursor: cursor,
        lastCursor,
        batchCount
      });
      
      try {
        // Get batch of transactions from Plaid
        console.log('Fetching transactions from Plaid:', {
          itemId,
          cursor,
          batchCount
        });

        const batch = await plaidService.fetchTransactionsFromPlaid(
          access_token, 
          cursor
        );

        console.log('Received batch from Plaid:', {
          itemId,
          batchCount,
          hasAdded: !!batch.added?.length,
          addedCount: batch.added?.length || 0,
          hasModified: !!batch.modified?.length,
          modifiedCount: batch.modified?.length || 0,
          hasRemoved: !!batch.removed?.length,
          removedCount: batch.removed?.length || 0,
          hasNextCursor: !!batch.next_cursor,
          nextCursor: batch.next_cursor
        });

        // Validate batch data
        if (!batch) {
          console.error('Received null batch from Plaid');
          throw new Error('INVALID_RESPONSE: Null batch response from Plaid');
        }

        // Store current cursor before processing
        lastCursor = cursor;

        // Process batch even if empty (might have cursor updates)
        await this._processBatch(batch, syncSession, itemId, userId);

        // Update cursor and check if more data available
        cursor = batch.next_cursor;
        hasMore = cursor !== null && cursor !== lastCursor;

        console.log('Batch processing complete:', {
          itemId,
          batchCount,
          previousCursor: lastCursor,
          newCursor: cursor,
          hasMore,
          totalProcessed: {
            added: syncSession.added.length,
            modified: syncSession.modified.length,
            removed: syncSession.removed.length
          }
        });

        // Update sync progress if we have more batches
        if (hasMore) {
          const progressData = {
            status: 'in_progress',
            cursor,
            stats: {
              added: syncSession.added.length,
              modified: syncSession.modified.length,
              removed: syncSession.removed.length
            }
          };

          try {
            await itemService.updateItemSyncStatus(itemId, userId, progressData);
          } catch (updateError) {
            console.error('Failed to update sync status:', updateError);
          }

          // Add delay between requests to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
      } catch (error) {
        console.error('Batch processing error:', {
          itemId,
          batchCount,
          error: error.message,
          errorResponse: error.response?.data,
          errorStatus: error.response?.status
        });

        // Handle rate limit errors
        if (error.response?.status === 429) {
          console.log('Rate limit hit, waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue; // Retry the same batch
        }

        // Handle EPIPE errors
        if (error.message.includes('EPIPE')) {
          console.log('EPIPE error, retrying after delay...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue; // Retry the same batch
        }

        try {
          await this._handleSyncError({ itemId, userId }, error, user);
        } catch (handleError) {
          console.error('Failed to handle sync error:', handleError);
        }
        throw error;
      }
    }

    return syncSession;
  }

  async _processBatch(batch, syncSession, itemId, userId) {
    try {
      // Add new transactions to running totals
      if (batch.added?.length) {
        console.log(`Processing ${batch.added.length} new transactions`);
        syncSession.added = [...syncSession.added, ...batch.added];
        await this._saveNewTransactions(batch.added, itemId, userId);
      }

      // Add modified transactions to running totals
      if (batch.modified?.length) {
        console.log(`Processing ${batch.modified.length} modified transactions`);
        syncSession.modified = [...syncSession.modified, ...batch.modified];
        await this._updateModifiedTransactions(batch.modified, itemId, userId);
      }

      // Add removed transactions to running totals
      if (batch.removed?.length) {
        console.log(`Processing ${batch.removed.length} removed transactions`);
        syncSession.removed = [...syncSession.removed, ...batch.removed];
        await this._removeTransactions(batch.removed);
      }
    } catch (error) {
      console.error('Error in _processBatch:', {
        error: error.message,
        itemId,
        batchSize: {
          added: batch.added?.length || 0,
          modified: batch.modified?.length || 0,
          removed: batch.removed?.length || 0
        }
      });
      throw error;
    }
  }

  async _saveNewTransactions(transactions, itemId, userId) {
    try {
      const formattedTransactions = transactions.map(transaction => ({
        ...transaction,
        userId,
        itemId
      }));

      console.log(`Saving ${formattedTransactions.length} new transactions`);
      const result = await plaidTransactions.insertMany(formattedTransactions);
      console.log(`Successfully saved ${result.length} transactions`);
      return result;
    } catch (error) {
      if (error.message.startsWith('BATCH_INSERT_ERROR')) {
        // Log the failed inserts but continue with the successful ones
        console.error('Some transactions failed to insert:', error.cause);
        return error.cause.inserted;
      }
      throw new Error(`SAVE_ERROR: Failed to save transactions - ${error.message}`);
    }
  }

  async _updateModifiedTransactions(transactions, itemId, userId) {
    const results = [];
    const errors = [];

    for (const transaction of transactions) {
      try {
        const updated = await plaidTransactions.update(
          { transaction_id: transaction.transaction_id },
          { ...transaction, userId, itemId }
        );
        results.push(updated);
      } catch (error) {
        errors.push({
          transaction,
          error: error.message
        });
      }
    }

    if (errors.length > 0) {
      console.error('Some transactions failed to update:', errors);
    }

    return results;
  }

  async _removeTransactions(transactionIds) {
    await plaidTransactions.deleteMany({ 
      transaction_id: { $in: transactionIds }
    });
  }

  async _completeSync(item, result, user) {
    const syncData = {
      status: 'completed',
      lastSyncTime: Date.now(),
      nextSyncTime: Date.now() + (24 * 60 * 60 * 1000),
      cursor: result.cursor,
      error: null,
      stats: {
        added: result.added.length,
        modified: result.modified.length,
        removed: result.removed.length,
        lastTransactionDate: this._getLatestTransactionDate(result.added)
      }
    };

    await itemService.updateItemSyncStatus(
      item.itemId, 
      user._id,
      syncData
    );
  }

  async _handleSyncError(item, error, user) {
    const errorData = {
      status: 'error',
      error: {
        code: error.error_code || 'SYNC_ERROR',
        message: error.message,
        timestamp: Date.now()
      }
    };

    await itemService.updateItemSyncStatus(
      item.itemId,
      user._id,
      errorData
    );
  }

  _createSyncResponse(status, item, result = null) {
    const response = {
      status,
      itemId: item._id,
      lastSyncTime: item.syncData?.lastSyncTime,
      nextSyncTime: item.syncData?.nextSyncTime
    };

    if (result) {
      response.stats = {
        added: result.added.length,
        modified: result.modified.length,
        removed: result.removed.length
      };
    }

    if (status === 'ERROR') {
      response.error = item.syncData?.error;
    }

    return response;
  }

  _getLatestTransactionDate(transactions) {
    if (!transactions.length) return null;
    return transactions
      .map(t => t.date)
      .sort((a, b) => new Date(b) - new Date(a))[0];
  }

  _formatError(error) {
    return error.error_code ? 
      error : 
      new Error(`SYNC_ERROR: ${error.message}`);
  }

  async syncAllUserTransactions(user) {
    this.validateUser(user);

    try {
      const items = await itemService.getUserItems(user._id);
      if (!items?.length) {
        throw new Error('NO_ITEMS: No items found for user');
      }

      const syncResults = [];
      for (const item of items) {
        try {
          const result = await this.syncTransactionsForItem(item, user);
          syncResults.push({ itemId: item._id, ...result });
        } catch (error) {
          console.error(`Error syncing transactions for item ${item._id}:`, error);
          syncResults.push({
            itemId: item._id,
            error: error.error_code || 'SYNC_ERROR',
            message: error.message
          });
        }
      }

      return { syncResults };
    } catch (error) {
      throw new Error(`SYNC_ERROR: ${error.message}`);
    }
  }

  async processAndSaveTransactions(transactions, userId, itemId) {
    const { added, modified, removed } = transactions;

    try {
      // Handle removed transactions
      if (removed?.length) {
        await plaidTransactions.deleteMany({ 
          transaction_id: { $in: removed.map(t => t.transaction_id) }
        });
      }

      // Handle modified transactions
      if (modified?.length) {
        for (const transaction of modified) {
          await plaidTransactions.update(
            { transaction_id: transaction.transaction_id },
            { ...transaction, userId, itemId }
          );
        }
      }

      // Handle new transactions
      if (added?.length) {
        await plaidTransactions.insertMany(
          added.map(transaction => ({ ...transaction, userId, itemId }))
        );
      }

      return {
        added: added?.length || 0,
        modified: modified?.length || 0,
        removed: removed?.length || 0
      };
    } catch (error) {
      throw new Error(`DB_ERROR: Error processing transactions - ${error.message}`);
    }
  }

  async fetchTransactions(query) {
    try {
      return await plaidTransactions.find(query);
    } catch (error) {
      throw new Error(`FETCH_ERROR: ${error.message}`);
    }
  }

  async fetchTransactionById(transactionId, userId) {
    try {
      const transaction = await plaidTransactions.findOne({ 
        transaction_id: transactionId,
        userId 
      });
      
      if (!transaction) {
        throw new Error('TRANSACTION_NOT_FOUND: Transaction not found');
      }
      
      return transaction;
    } catch (error) {
      throw new Error(`FETCH_ERROR: ${error.message}`);
    }
  }

  buildUserQueryForTransactions(userId, queryParams) {
    const query = { userId };

    if (queryParams.account_id) {
      query.account_id = queryParams.account_id;
    }

    if (queryParams.date) {
      const [startDate, endDate] = queryParams.date.split(',');
      query.authorized_date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    return query;
  }

  async findDuplicates(userId) {
    try {
      const transactions = await this.fetchTransactions({ userId });
      const duplicates = new Map();

      transactions.forEach(transaction => {
        const key = `${transaction.amount}-${transaction.date}-${transaction.name}`;
        if (!duplicates.has(key)) {
          duplicates.set(key, []);
        }
        duplicates.get(key).push(transaction);
      });

      return Array.from(duplicates.values())
        .filter(group => group.length > 1);
    } catch (error) {
      throw new Error(`DUPLICATE_CHECK_ERROR: ${error.message}`);
    }
  }

  async removeFromDb(transactionIds) {
    try {
      await plaidTransactions.deleteMany({ 
        transaction_id: { $in: transactionIds }
      });
      return { removed: transactionIds.length };
    } catch (error) {
      throw new Error(`DELETE_ERROR: ${error.message}`);
    }
  }
}

export default new PlaidTransactionService(plaidClientInstance); 