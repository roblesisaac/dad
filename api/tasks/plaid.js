import { task } from '@ampt/sdk';
import { data } from '@ampt/data';

import plaid from '../controllers/plaid';
import plaidTransactions from '../models/plaidTransactions';
import Sites from '../models/sites';
import notify from '../utils/notify';

const tasks = (function() {
  const removeAllTransactionsFromDatabase = task('plaid.removeAllTransactions', { timeout: 60*20*1000 }, async ({ body }) => {
    const { user } = body;
    const transactions = await plaidTransactions.findAll({ date: '*', userId: user._id });
    const idsToRemove = transactions.map(t => t._id);
    let removeCount = 0;

    while (idsToRemove.length) {
      const idBatch = idsToRemove.splice(0, 25);

      removeCount += idBatch.length;
      await data.remove(idBatch);
    }

    const site = await Sites.findOne();

    await notify.email(user.email, {
      subject: `${site.name} Transactions Have Been Removed`,
      template: `<p>Count of items Removed: ${ removeCount }</p>`
    });

    return removeCount;
  });

  const syncTransactions = task('sync.transactions', { timeout: 60*30*1000 }, async ({ body }) => {
    let { itemId, userId } = body;
    
    return await plaid.syncTransactionsForItem(itemId, userId);
  });

  const syncTransactionsForItems = task('sync.itemIds', { timeout: 60*30*1000 }, async ({ body }) => {
    const { itemIds, userId } = body;

    let results = [];

    for (const itemId of itemIds) {
      try {
        const result = await plaid.syncTransactionsForItem(itemId, userId);

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

  const updateAllDates = task('update.allDates', { timeout: 30*60*1000 }, async () => {

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
  
  return {
    removeAllUserTransactions: async ({ _id, email }) => {
      removeAllTransactionsFromDatabase.run({ user: { _id, email } });
    },
    syncTransactionsForItem: async function(itemId, userId) {
      syncTransactions.run({ itemId, userId });
    },
    syncTransactionsForItems: async function (itemIds, userId) {
      syncTransactionsForItems.run({ itemIds, userId });
    },
    updateAllDates: async function () {
      return 'Not implemented';
      // return updateAllDates.run();
    }
  }
})();

export default tasks;