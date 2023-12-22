import { task } from '@ampt/sdk';
import { data } from '@ampt/data';

import plaid from '../controllers/plaid';
import plaidTransactions from '../models/plaidTransactions';
import Sites from '../models/sites';
import notify from '../utils/notify';

import { generateToken } from '../utils/encryption';

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

  const syncTransactions = task('sync.transactions', async ({ body }) => {
    let { itemId, userId } = body;
    
    return await plaid.syncTransactionsForItem(itemId, userId);
  });

  const testTask = task('test.joined', { timeout: 60*20*1000 }, async ({ body }) => {
    const token = generateToken({ test: 'true' });
  
    console.log({
      timeIs: Date.now(),
      token: token.length,
      body
    });
  });
  
  return {
    removeAllUserTransactions: async ({ _id, email }) => {
      removeAllTransactionsFromDatabase.run({ user: { _id, email } });
    },
    syncTransactionsForItem: async function(itemId, userId) {
      syncTransactions.run({ itemId, userId });
    },
    test: function() {
      console.log(Date.now(), 'test running...');

      const result = testTask.run({ test: 'tasker12' })

      return {
        message: 'running',
        result
      };
    }
  }
})();

export default tasks;