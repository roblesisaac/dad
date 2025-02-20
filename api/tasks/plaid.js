import { task, events } from '@ampt/sdk';
import { transactionService, itemService } from '../services/plaid/index.js';

const tasks = (function() {
  const removeAllTransactionsFromDatabase = task('plaid.removeAllTransactions', { timeout: 60*60*1000 }, async ({ body }) => {
    const { user } = body;
    return await transactionService.removeAllTransactionsFromDatabase(user);
  });

  const syncTransactions = task('sync.transactions', { timeout: 60*60*1000 }, async ({ body }) => {
    const { itemId, user } = body;
    
    try {
      return await transactionService.syncTransactionsForItem(itemId, user);
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
        const result = await transactionService.syncTransactionsForItem(itemId, user);
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
    removeAllUserTransactions: async ({ _id, email }) => {
      removeAllTransactionsFromDatabase.run({ user: { _id, email } });
    },
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

export const handler = async (event) => {
  try {
    const { itemId, user } = event.body;
    
    if (!itemId || !user?._id) {
      throw new Error('INVALID_PARAMS: Missing required parameters');
    }

    // Validate item exists before starting sync
    const item = await itemService.getItems(user._id, itemId);
    if (!item) {
      throw new Error('ITEM_NOT_FOUND: Item not found for this user');
    }
    
    const result = await transactionService.syncTransactionsForItem(item, user);
    
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Task error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] || error.message
      })
    };
  }
};