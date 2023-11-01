import { task } from '@ampt/sdk';
import plaid from '../controllers/plaid';

const tasks = (function() {
  const syncTransactions = task('sync.transactions', { timeout: 1200000 }, async ({ body }) => {
    let { itemId, userId } = body;
    
    return await plaid.syncTransactions(itemId, userId);
  });
  
  return {
    syncTransactions: function(itemId, userId) {
      syncTransactions.run({ itemId, userId });
    }
  }
})();

export default tasks;