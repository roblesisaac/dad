import { task, events } from '@ampt/sdk';
import { transactionService, itemService } from '../services/plaid/index.js';

const tasks = (function() {
  /**
   * Task for processing a batch of transactions
   * This task processes a single batch in the background
   */
  const processBatch = task('sync.batch', { 
    timeout: 60 * 1000, // 1 minute timeout
    maxRetries: 3
  }, async ({ body }) => {
    const { itemId, user } = body;
    
    try {
      // Get the full item first
      const item = await itemService.getUserItems(user._id, itemId);
      if (!item) {
        throw new Error('ITEM_NOT_FOUND: Item not found for this user');
      }
      
      // Process a single batch
      const batchResult = await transactionService.processSingleBatch(item, user);
      
      // If there are more batches to process, schedule the next one
      if (batchResult.hasMore) {
        events.publish('continue-batch-sync', { after: 1000 }, { itemId, user });
      }
      
      return batchResult;
    } catch (error) {
      throw error;
    }
  });

  /**
   * Task for initiating a full sync process
   * This starts the batch process and continues until all batches are processed
   */
  const startBatchSync = task('sync.start', { 
    timeout: 5 * 60 * 1000, // 5 minute timeout
    maxRetries: 2
  }, async ({ body }) => {
    const { itemId, user } = body;
    
    try {
      // Get the item
      const item = await itemService.getUserItems(user._id, itemId);
      if (!item) {
        throw new Error('ITEM_NOT_FOUND: Item not found for this user');
      }
      
      // Initialize the sync state (reset if completed or error)
      if (!item.syncData?.status || 
          item.syncData?.status === 'completed' || 
          item.syncData?.status === 'error') {
        await itemService.updateItemSyncStatus(itemId, user._id, {
          status: 'in_progress',
          lastSyncTime: Date.now(),
          cursor: item.syncData?.cursor || null,
          error: null,
          batchNumber: 0,
          stats: {
            added: 0,
            modified: 0,
            removed: 0
          }
        });
      }
      
      // Process the first batch
      return await processBatch.run({ itemId, user });
    } catch (error) {
      throw error;
    }
  });
  
  /**
   * Task for syncing multiple items
   */
  const syncMultipleItems = task('sync.items', async ({ body }) => {
    const { itemIds, user } = body;
    
    let results = [];
    
    for (const itemId of itemIds) {
      try {
        const result = await startBatchSync.run({ itemId, user });
        results.push({ itemId, result });
      } catch (error) {
        results.push({ 
          itemId, 
          error: error.message || 'Unknown error' 
        });
      }
    }
    
    return { results };
  });

  return {
    /**
     * Process a single batch for an item
     * @param {string} itemId - Item ID
     * @param {Object} user - User data
     * @returns {Promise<Object>} Batch result
     */
    processBatch: async function(itemId, user) {
      if (!itemId || !user?._id) {
        throw new Error('INVALID_PARAMS: Missing required parameters');
      }
      return await processBatch.run({ itemId, user });
    },
    
    /**
     * Start a full batch sync process for an item
     * @param {string} itemId - Item ID
     * @param {Object} user - User data
     * @returns {Promise<Object>} Initial batch result
     */
    startBatchSync: async function(itemId, user) {
      if (!itemId || !user?._id) {
        throw new Error('INVALID_PARAMS: Missing required parameters');
      }
      return await startBatchSync.run({ itemId, user });
    },
    
    /**
     * Sync multiple items
     * @param {Array<string>} itemIds - Array of item IDs
     * @param {Object} user - User data
     * @returns {Promise<Object>} Results for all items
     */
    syncItems: async function(itemIds, user) {
      if (!itemIds?.length || !user?._id) {
        throw new Error('INVALID_PARAMS: Missing required parameters');
      }
      return await syncMultipleItems.run({ itemIds, user });
    }
  };
})();

// Event handler for continuing batch processing
events.on('continue-batch-sync', async (event) => {
  const { itemId, user } = event.body;
  try {
    await tasks.processBatch(itemId, user);
  } catch (error) {
    console.error(`Failed to continue batch sync for item ${itemId}:`, error);
  }
});

export default tasks;