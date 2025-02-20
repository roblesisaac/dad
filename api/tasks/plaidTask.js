import { task, events } from '@ampt/sdk';
import { transactionService, itemService } from '../services/plaid/index.js';

const tasks = (function() {
  const syncTransactions = task('sync.transactions', { 
    timeout: 60 * 60 * 1000, // 1 hour timeout
    maxRetries: 3
  }, async ({ body }) => {
    const { itemId, user } = body;
    
    try {
      // Get the full item first
      const item = await itemService.getUserItems(user._id, itemId);
      if (!item) {
        throw new Error('ITEM_NOT_FOUND: Item not found for this user');
      }

      console.log('Starting sync task for item:', {
        itemId: item.itemId,
        userId: user._id
      });
      
      const result = await transactionService.syncTransactionsForItem(item, user);
      
      console.log('Sync completed:', {
        itemId: item.itemId,
        stats: result.stats
      });

      return result;
    } catch (error) {
      console.error('Sync task error:', error);
      throw error;
    }
  });

  const syncTransactionsForItems = task('sync.itemIds', async ({ body }) => {
    const { itemIds, user } = body;

    let results = [];

    for (const itemId of itemIds) {
      try {
        // Get the item first
        const item = await itemService.getUserItems(user._id, itemId);
        if (!item) {
          throw new Error(`Item not found: ${itemId}`);
        }
        const result = await transactionService.syncTransactionsForItem(item, user);
        results.push(result);
      } catch (e) {
        console.error({
          error: `Error with task 'syncTransactionsForItems' for itemId: ${itemId}`,
          errorMessage: e.toString()
        });
      }
    }

    return results;
  });

  const syncTest = task('sync.test', { timeout: 10*1000 }, async ({ body }) => {
    const { round } = body;

    if(round > 3) {
      return 'completed';
    }

    events.publish('requeue-task', { after: 5000 }, { round: round+1 });
    
    return 'task still in progress incomplete...';
  });
  
  return {
    syncTransactionsForItem: async function(itemId, user) {
      if (!itemId || !user?._id) {
        throw new Error('INVALID_PARAMS: Missing required parameters');
      }
      return await syncTransactions.run({ itemId, user });
    },
    syncTransactionsForItems: async function (itemIds, user) {
      syncTransactionsForItems.run({ itemIds, user });
    },
    updateAllDates: async function () {
      return 'Not implemented yet';
    },
    test: async function(round=1) {
      return await syncTest.run({ round });
    }
  };
})();

events.on('requeue-task', async (event) => {
  const { round } = event.body;
  tasks.test(round);
});

export default tasks;