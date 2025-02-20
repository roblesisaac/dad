import { task, events, params } from '@ampt/sdk';
import { transactionService } from '../services/plaid/index.js';

const tasks = (function() {
  const removeAllTransactionsFromDatabase = task('plaid.removeAllTransactions', { timeout: 60*60*1000 }, async ({ body }) => {
    const { user } = body;
    return await transactionService.removeAllTransactionsFromDatabase(user);
  });

  const syncTransactions = task('sync.transactions', { timeout: 60*60*1000 }, async ({ body }) => {
    const { itemId, user } = body;
    
    return await transactionService.syncTransactionsForItem(itemId, user);
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
      syncTransactions.run({ itemId, user });
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
    
    // Call the service directly instead of going through the controller
    const result = await transactionService.syncTransactionsForItem(itemId, user);
    
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Task error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};