import { task, params } from '@ampt/sdk';
import { data } from '@ampt/data';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { decryptWithKey, decrypt } from '../utils/encryption';
import notify from '../utils/notify';

import plaidItems from '../models/plaidItems';
import Users from '../models/users';
import plaidTransactions from '../models/plaidTransactions';

const {
  PLAID_CLIENT_ID,
  PLAID_SECRET_DEVELOPMENT,
  PLAID_SECRET_SANDBOX,
  ENV_NAME
} = params().list();

const tasks = (function() {
  let plaidClient;

  async function applyTransactionUpdates({ access_token, itemId, cursor, req, has_more, plaidData }) {
    const { added, modified, removed } = plaidData;

    const shouldFetchTransactions = isEmpty(plaidData, ['added', 'removed']);
    const transactionsInDatabase = shouldFetchTransactions
      ? await plaidTransactions.findAll({ name: '*', userId: req.userId })
      : [];
    
    for (const transaction of added) {
      const existingTransaction = findExistingTransaction(transactionsInDatabase, transaction);

      if(!existingTransaction) {
        await plaidTransactions.save({ ...transaction, req });
      }
    }

    for (const transaction of modified) {
      const { transaction_id } = transaction;
      await plaidTransactions.update({ transaction_id }, transaction);
    }

    const removeIds = removed.map(removedTransaction => {
      return findExistingTransaction(transactionsInDatabase, removedTransaction)._id;
    });
    
    if(removeIds.length) await data.remove(removeIds);
    
    await updateItemCursorAndStatus(itemId, cursor, 'update in progres');

    if(has_more) {
      return await fetchTransactionsFromPlaid({ access_token, cursor, itemId, req })
    }

    return await updateItemCursorAndStatus(itemId, cursor, 'complete', req);
  }

  async function buildReq(userId) {
    const user = await Users.findOne(userId);

    return { user };
  }

  function decryptAccessToken(accessToken, encryptionKey) {
    accessToken = decrypt(accessToken);
    return decryptWithKey(accessToken, encryptionKey);
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
    const environment = ENV_NAME === 'prod' ? 'development' : 'sandbox';

    const config = new Configuration({
      basePath: PlaidEnvironments[environment],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
          'PLAID-SECRET': environment === 'sandbox' ? PLAID_SECRET_SANDBOX : PLAID_SECRET_DEVELOPMENT,
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

  async function updateItemCursorAndStatus(itemId, cursor, syncStatus, req) {  
    const pstOptions = { timeZone: 'America/Los_Angeles' };
    const nowInPST = new Date().toLocaleString('en-US', pstOptions);

    await plaidItems.update(itemId, { 
      lastSynced: nowInPST,
      syncStatus, 
      cursor
    });

    if(syncStatus === 'complete' && req?.user) {
      const { user } = req;

      await notify.email(user.email, {
        subject: 'Xmit Sync Complete!',
        template: `Your Xymit account has been successfully synced. Your transactions are now up to date as of ${ nowInPST }.`
      });

    }

    return { itemId, lastSynced: nowInPST };
  }

  const syncTransactions = task('sync.transactions', { timeout: 1200000 }, async ({ body }) => {
    let { itemId, userId } = body;

    plaidClient = plaidClient || initClient();

    const { accessToken, cursor } = await plaidItems.findOne(itemId);
    const req = await buildReq(userId);

    const access_token = decryptAccessToken(accessToken, req.user.encryptionKey);

    return await fetchTransactionsFromPlaid({ access_token, cursor, itemId, req });
  });
  
  return {
    syncTransactions: function(itemId, userId) {
      syncTransactions.run({ itemId, userId });
    }
  }
})();

export default tasks;