import { events, params } from '@ampt/sdk';
import { data } from '@ampt/data';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { decryptWithKey, decrypt } from '../utils/encryption';
import { isEmptyObject, scrub, formatDate } from '../../src/utils';
import { isMeta } from '../utils/records/utils';

import plaidAccounts from '../models/plaidAccounts';
import plaidItem from '../models/plaidItems';
import plaidTransaction from '../models/plaidTransactions';

const {
  AMPT_URL,
  PLAID_CLIENT_ID,
  PLAID_SECRET_SANDBOX
} = params().list();

const app = function() {
  let plaidClient;

  async function applyTransactionUpdates(_id, access_token, cursor, req, has_more, plaidData) {
    const { added, modified, removed } = plaidData;

    const existingTransactions = added.length || removed.length 
      ? await fetchAllUserTransactions(req.user._id)
      : [];
    
    for (const transaction of added) {
      const existingItem = findExistingTransaction(existingTransactions, transaction);

      if(!existingItem) {
        await plaidTransaction.save(transaction, req);
      }
    }

    for (const transaction of modified) {
      const { transaction_id } = transaction;
      await plaidTransaction.update({ transaction_id }, transaction);
    }

    const removeIds = removed.map(removed => {
      return findExistingTransaction(existingTransactions, removed)._id;
    });
    
    if(removeIds.lengths) await data.remove(removeIds);

    if(has_more) {
      return await syncTransactions({
        body: {
          _id, access_token, cursor, req
        }
      });
    }

    await completeTransactionsSync(_id, cursor);
  }

  function dataIsEmpty(plaidData) {
    return ['added', 'modified', 'removed'].every(
      arrName => plaidData[arrName].length === 0
    );
  }

  function buildUserQueryForDate(user_id, query) {
    if (isEmptyObject(query)) {
      return user_id;
    }
  
    const { account_id, startDate, endDate, start, select } = query;
    const userTree = `${user_id}${account_id}`;
    let date = `${userTree}`;

    if(startDate) {
      date += startDate;
    }
    
    if (endDate) {
      date += `|date_${userTree}${endDate}`;
    } else {
      date += '*';
    }

    console.log(date);
  
    return {
      date,
      select,
      start
    };
  }

  function completeTransactionsSync(_id, cursor) {  
    const nowInPST = new Date(Date.now() - 8 * 3600000);
    
    return plaidItem.update(_id, { 
      lastSynced: nowInPST,
      syncStatus: `complete`, 
      cursor
    });
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

    plaidClient = plaidClient || new PlaidApi(config);
  }

  function buildRequest(userId) {
    return {
      user: { client_user_id: userId },
      client_name: 'Plaid Test App',
      products: ['auth', 'transactions'],
      country_codes: ['US'],
      language: 'en',
      redirect_uri: `${AMPT_URL}/spendingreport`
    };
  }

  function decryptAccessToken(accessToken, encryptionKey) {
    accessToken = decrypt(accessToken);
    return decryptWithKey(accessToken, encryptionKey);
  }

  async function exchangePublicToken(publicToken) {
    try {
      const { data } = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });

      return data;
    } catch (error) {
      console.error('Error exchanging public token:', error);
    }
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

  async function fetchUserAccounts(userId) {
    return plaidAccounts.find({
      account_id: `${userId}*`
    });
  }

  async function fetchItemById(_id, userId) {
    const item = await plaidItem.findOne(_id);
    
    if(item.userId === userId) {
      return item;
    }

    warn(userId, _id, 'Item');
    return false;
  }

  function fetchTransactions(query) {
    if(typeof query === 'string') {
      const userId = query;
      query = { name:  `${userId}*`}
    }

    return plaidTransaction.find(query);
  }

  async function fetchTransactionById(_id, userId) {
    const transaction = await plaidTransaction.findOne(_id);

    if(transaction.userId === userId) {
      return transaction;
    }

    warn(userId, _id, 'Transaction');
    return null;
  }

  function fetchUserItems(userId) {
    return plaidItem.find({ itemId: `${userId}*`});
  }

  function findExistingTransaction(existingTransactions, transaction) {
    return existingTransactions.find(itm => 
      itm.transaction_id === transaction.transaction_id
    );
  }

  function hasMatch(userAccounts, retrieved) {
    return userAccounts.find(itm => itm.account_id === retrieved.account_id);
  }

  async function retrieveAccountsFromPlaidForItem(access_token) {
    const { data } = await plaidClient.accountsGet({ access_token });

    if(!data.accounts) {
      return [];
    }
    
    return data.accounts.map(account => ({ 
      ...account, 
      itemId: data.item.item_id 
    }));
  }

  async function savePlaidAccessData(accessData, req) {
    try {
      const { access_token, item_id } = accessData;
      
      const item = await plaidItem.save({
        accessToken: access_token,
        itemId: item_id,
        syncStatus: 'sync in progress...'
      }, req);
  
      return { access_token, ...item };
    } catch (err) {
      console.error('Error saving plaid access data...', { err });
    }
  }

  function subscribeEvent(eventName, handlerFunction) {
    return events.on(eventName, { timeout: 60000 }, async (event) => {
      try {
        console.log(`Firing event: ${eventName}`);
        await handlerFunction(event);
      } catch (error) {
        console.error({
          message: `Error trying to execute ${eventName}`,
          error
        });
      }
    });
  }

  async function saveAccountsForNewPlaidItem(access_token, req) {
    try {
      const retrievedAccounts = await retrieveAccountsFromPlaidForItem(access_token);
      const saved = [];
  
      for(const retrieved of retrievedAccounts) {
        saved.push(await plaidAccounts.save(retrieved, req));
      }
  
      return saved;
    } catch (err) {
      console.log(`Error at 'saveAccountsForNewPlaidItem'`, err);
    }
  }

  async function syncTransactions({ body }) {
    let { 
      _id, access_token, cursor, req
    } = body;

    const request = {
      access_token,
      cursor,
      options: { include_personal_finance_category: true }
    };

    const response = await plaidClient.transactionsSync(request);

    const { data: plaidData } = response;
    const { next_cursor, has_more } = plaidData;

    if(dataIsEmpty(plaidData) && !has_more) {
      return await completeTransactionsSync(_id, next_cursor);
    }

    await applyTransactionUpdates(_id, access_token, next_cursor, req, has_more, plaidData);
  }

  function warn(userId, _id, product) {
    console.warn(`Unauthorized attempt: User ${userId} tried to access Plaid ${product} (${_id}) without proper authorization.`);
  }

  return {
    init: function() {
      subscribeEvent('plaid.syncTransactions', syncTransactions);
      initClient();
    },
    exchangeTokenAndSavePlaidItem: async function(req, res) {
      const { publicToken } = req.body;
      const { user } = req;

      const accessData = await exchangePublicToken(publicToken);
      const { _id, access_token } = await savePlaidAccessData(accessData, { user });
      const accounts = await saveAccountsForNewPlaidItem(access_token, { user });

      await events.publish('plaid.syncTransactions', {
        _id, access_token, cursor: '', req: { user }
      });

      res.json(accounts);
    },
    getAccounts: async (req, res) => {
      const accounts = await fetchUserAccounts(req.user._id);
      res.json(accounts);
    },
    getLinkToken: async (req, res) => {
      const request = buildRequest(req.user._id);

      const response = await plaidClient.linkTokenCreate(request);
      const { link_token } = response.data;

      res.json(link_token);
    },
    getPlaidItems: async (req, res) => {    
      const { params, user } = req;
      let response;

      if(params._id) {
        response = await fetchItemById(params._id, user._id);
      } else {
        response = await fetchUserItems(user._id);
      }

      if(!response) {
        return res.json(null);
      }

      const scrubbed = scrub(response, ['accessToken', 'itemId', 'userId']);
      return res.json(scrubbed);
    },
    getTransactions: async (req, res) => {
      const { _id } = req.params;
      const { user, query } = req;
      
      if(_id) {
        const transaction = await fetchTransactionById(_id, user._id);
        return res.json(transaction);
      }

      const userQueryForDate = buildUserQueryForDate(user._id, query);
      const transactions = await fetchTransactions(userQueryForDate);
      res.json(transactions);
    },
    initSyncTransactions: async function ({ params, user }, res) {
      initClient();

      const { _id } = params;
      let { accessToken, cursor, syncStatus } = await fetchItemById(_id, user._id);

      const access_token = decryptAccessToken(accessToken, user.encryptionKey);

      if(syncStatus === 'sync in progress...') {
        return res.json({ syncStatus });
      }

      await plaidItem.update(_id, { syncStatus: 'sync in progress...' });

      await events.publish('plaid.syncTransactions', {
        _id, access_token, cursor, req: { user }
      });

      res.json('sync initiated...');
    },
    syncAccounts: async function({ user }, res) {
      initClient();

      let retrievedAccounts = [];

      for(const item of await fetchUserItems(user._id)) {
        const access_token = decryptAccessToken(item.accessToken, user.encryptionKey);

        retrievedAccounts = retrievedAccounts.concat(
          await retrieveAccountsFromPlaidForItem(access_token)
        );
      }

      const userAccounts = await fetchUserAccounts(user._id);
      const synced = [];

      for(const retrieved of retrievedAccounts) {
        if(hasMatch(userAccounts, retrieved)) {
          continue;
        }

        synced.push(retrieved);
        await plaidAccounts.save(retrieved, { user });
      }

      res.json(synced);
    }
  }
}();

app.init();

export default app;