import { task, params } from '@ampt/sdk';
import { data } from '@ampt/data';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { decryptWithKey, decrypt } from '../utils/encryption';

import plaidItem from '../models/plaidItems';
import users from '../models/users';
import plaidTransaction from '../models/plaidTransactions';

const {
  PLAID_CLIENT_ID,
  // PLAID_SECRET_DEVELOPMENT,
  PLAID_SECRET_SANDBOX
} = params().list();

const tasks = (function() {
  let plaidClient;

  async function applyTransactionUpdates({ access_token, itemId, cursor, req, has_more, plaidData }) {
    const { added, modified, removed } = plaidData;

    const shouldFetchTransactions = isEmpty(plaidData, ['added', 'removed']);
    const transactionsInDatabase = shouldFetchTransactions
      ? await fetchAllUserTransactions(req.user._id)
      : [];
    
    for (const transaction of added) {
      const existingTransaction = findExistingTransaction(transactionsInDatabase, transaction);

      if(!existingTransaction) {
        await plaidTransaction.save(transaction, req);
      }
    }

    for (const transaction of modified) {
      const { transaction_id } = transaction;
      await plaidTransaction.update({ transaction_id }, transaction);
    }

    const removeIds = removed.map(removedTransaction => {
      return findExistingTransaction(transactionsInDatabase, removedTransaction)._id;
    });
    
    if(removeIds.length) await data.remove(removeIds);
    
    await updateItemCursorAndStatus(itemId, cursor, 'update in progres');

    if(has_more) {
      return await fetchTransactionsFromPlaid({ access_token, cursor, itemId, req })
    }

    return await updateItemCursorAndStatus(itemId, cursor, 'complete');
  }

  async function buildReq(userId) {
    const user = await users.find(userId);

    return { user };
  }

  function decryptAccessToken(accessToken, encryptionKey) {
    accessToken = decrypt(accessToken);
    return decryptWithKey(accessToken, encryptionKey);
  }

  async function fetchAllUserTransactions(userId) {
    let transactions = [];
    let lastKey = true;

    while(lastKey) {
      const start = typeof lastKey === 'string' ? lastKey : undefined;
      const filter = { start, name: userId+'*' };
      const fetched = await fetchTransactions(filter);

      transactions = transactions.concat(fetched.items || fetched);
      lastKey = fetched.lastKey;
    }

    return transactions;
  }

  function fetchTransactions(query) {
    if(typeof query === 'string') {
      const userId = query;
      query = { name:  `${userId}*`}
    }

    return plaidTransaction.find(query);
  }

  async function fetchTransactionsFromPlaid({ access_token, cursor, itemId, req }) {
    const request = {
      access_token,
      cursor,
      options: { include_personal_finance_category: true }
    };

    const { data: plaidData } = await plaidClient.transactionsSync(request);
    const { next_cursor, has_more } = plaidData;

    if(isEmpty(plaidData, ['added', 'modified', 'removed']) && !has_more) {
      return await updateItemCursorAndStatus(itemId, next_cursor, 'complete');
    }

    return await applyTransactionUpdates({ access_token, itemId, cursor: next_cursor, req, has_more, plaidData });
  }

  function findExistingTransaction(transactionsInDatabase, transaction) {
    return transactionsInDatabase.find(itm => 
      itm.transaction_id === transaction.transaction_id
    );
  }
  
  function initClient() {
    const config = new Configuration({
      basePath: PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
          'PLAID-SECRET': PLAID_SECRET_SANDBOX,
          'Plaid-Version': '2020-09-14',
        },
      },
    });    

    return new PlaidApi(config);
  }

  function isEmpty(plaidData, propsToCheck) {
    return propsToCheck.every(
      arrName => plaidData[arrName] && plaidData[arrName].length === 0
    );
  }

  async function updateItemCursorAndStatus(itemId, cursor, syncStatus) {  
    const nowInPST = new Date(Date.now() - 8 * 3600000);

    await plaidItem.update(itemId, { 
      lastSynced: nowInPST,
      syncStatus, 
      cursor
    });

    return { itemId, lastSynced: nowInPST };
  }

  const syncTransactions = task('sync.transactions', async ({ body }) => {
    let { itemId, userId } = body;

    const { accessToken, cursor } = await plaidItem.find(itemId);
    const req = await buildReq(userId);
    const access_token = decryptAccessToken(accessToken, req.user.encryptionKey);

    return await fetchTransactionsFromPlaid({ access_token, cursor, itemId, req });
  });
  
  return {
    syncTransactions: function(itemId, userId) {
      plaidClient = plaidClient || initClient();

      syncTransactions.run({ itemId, userId });
    }
  }
})();

export default tasks;