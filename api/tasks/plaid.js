import { task, events, params } from '@ampt/sdk';
import { data } from '@ampt/data';

import plaidTransactions from '../models/plaidTransactions';
import notify from '../utils/notify';
import plaidTransactionService from '../services/plaidTransactionService.js';
import { proper } from '../../src/utils';

const { APP_NAME } = params().list();

const tasks = (function() {
  const removeAllTransactionsFromDatabase = task('plaid.removeAllTransactions', { timeout: 60*60*1000 }, async ({ body }) => {
    const { user } = body;
    const transactions = await plaidTransactions.findAll({ date: '*', userId: user._id });
    const idsToRemove = transactions.map(t => t._id);
    let removeCount = 0;

    while (idsToRemove.length) {
      const idBatch = idsToRemove.splice(0, 25);

      removeCount += idBatch.length;
      await data.remove(idBatch);
    }

    const site = { name: proper(APP_NAME) };

    await notify.email(user.email, {
      subject: `${site.name} Transactions Have Been Removed`,
      template: `<p>Count of items Removed: ${ removeCount }</p>`
    });

    return removeCount;
  });

  const syncTransactions = task('sync.transactions', { timeout: 60*60*1000 }, async ({ body }) => {
    let { itemId, userId, encryptedKey } = body;
    
    return await plaidTransactionService.syncTransactionsForItem(itemId, userId, encryptedKey);
  });

  const syncTransactionsForItems = task('sync.itemIds', async ({ body }) => {
    const { itemIds, userId, encryptedKey } = body;

    let results = [];

    for (const itemId of itemIds) {
      try {
        const result = await plaidTransactionService.syncTransactionsForItem(itemId, userId, encryptedKey);

        results.push(result);
      } catch (e) {
        console.error({
          error: `Error with task 'syncTransactionsForItems' for itemId: ${itemId}`,
          errorMessage: e.toString()
        });
      }
    };

    return results;

  });

  const updateAllDates = task('update.allDates', { timeout: 60*60*1000 }, async () => {

    const users = await data.get('users:*');
    let updateCount = 0;

    for (const user of users.items) {
      const userItems = await updateUserTransactions(user.key);
      updateCount += userItems;
    }

    return updateCount;

  });

  async function updateUserTransactions(userId) {
    const transactions = await plaidTransactions.findAll({ transaction_id: '*', userId });
    let updateCount = 0;

    for (const transaction of transactions) {
      try {
        await plaidTransactions.update(transaction._id, transaction);
      } catch (error) {
        console.log(error);
      }
      updateCount++;
    }

    return updateCount;
  }

  const syncTest = task('sync.test', { timeout: 10*1000 }, async ({ body }) => {
    const { round } = body;

    if(round > 3) {

      return 'completed';
    }

    events.publish('requeue-task', { after: 5000 }, { round: round+1 })
    
    return 'task still in progress incomplete...';
  });
  
  return {
    removeAllUserTransactions: async ({ _id, email }) => {
      removeAllTransactionsFromDatabase.run({ user: { _id, email } });
    },
    syncTransactionsForItem: async function(itemId, userId, encryptedKey) {
      syncTransactions.run({ itemId, userId, encryptedKey });
    },
    syncTransactionsForItems: async function (itemIds, userId, encryptedKey) {
      syncTransactionsForItems.run({ itemIds, userId, encryptedKey });
    },
    updateAllDates: async function () {
      return 'Not implemented yet';
      // return updateAllDates.run();
    },
    test: async function(round=1) {
      return await syncTest.run({ round });
    }
  }
})();

//events.publish('requeue-task', { after: '1 minute' }, { name: 'name' });

events.on('requeue-task', async (event) => {
  const { round } = event.body;

  
  tasks.test(round);
});

export default tasks;

export const handler = async (event) => {
  try {
    const { itemId, userId, encryptedKey } = event.body;
    
    // Call the service directly instead of going through the controller
    const result = await plaidTransactionService.syncTransactionsForItem(itemId, userId, encryptedKey);
    
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