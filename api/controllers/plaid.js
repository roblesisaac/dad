import { events, params } from '@ampt/sdk';
import { data } from '@ampt/data';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { encrypt, decryptWithKey, decrypt } from '../utils/encryption';
import { isEmptyObject } from '../../src/utils';

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

  async function applyTransactionUpdates({ body }) {
    const { 
      _id, cursor, req,
      added, modified, removed 
    } = body;

    const userQuery = buildUserQuery(req.user._id);
    const existingTransactions = await fetchAllUserTransactions(userQuery);
    
    for (const transaction of added) {
      const isAlreadyAdded = existingTransactions.find(itm => 
        itm.transaction_id === transaction.transaction_id
      );

      if(!isAlreadyAdded) {
        await plaidTransaction.save(transaction, req);
      }
    }

    for (const transaction of modified) {
      const { transaction_id } = transaction;
      await plaidTransaction.update({ transaction_id }, transaction);
    }

    const removeIds = removed.map(({ transaction_id }) => transaction_id);
    if(removeIds.lengths) await data.remove(removeIds);
  
    const nowInPST = new Date(Date.now() - 8 * 3600000)
    await plaidItem.update(_id, { 
      lastSynced: nowInPST,
      syncStatus: `complete`, 
      cursor 
    });
  }

  function buildConfiguration() {
    return new Configuration({
      basePath: PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
          'PLAID-SECRET': PLAID_SECRET_SANDBOX,
          'Plaid-Version': '2020-09-14',
        },
      },
    });
  }

  function buildUserQuery(userId, query) {
    const user_id = `${encrypt(userId)}`;

    for (const prop in query) {
      if(['limit', 'start'].includes(prop)) {
        continue;
      }
      query[prop] = `${user_id}${query[prop]}*`
    }

    return isEmptyObject(query) ? user_id : query;
  }

  function initClient() {
    plaidClient = plaidClient || new PlaidApi(buildConfiguration());
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
      const response = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });

      return response.data;
    } catch (error) {
      console.error('Error exchanging public token:', error);
    }
  }

  async function fetchAllUserTransactions(userQuery) {
    let transactions = [];
    let lastKey = true;

    while(lastKey) {
      const start = typeof lastKey === 'string' ? lastKey : undefined;
      const fetched = await fetchTransactions({ start, ...userQuery });

      transactions = transactions.concat(fetched.items || fetched);
      lastKey = fetched.lastKey;
    }

    return transactions;
  }

  async function fetchUserAccounts(userId) {
    return plaidAccounts.find({
      account_id: `${encrypt(userId)}*`
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
      query = { account_id:  `${userId}*`}
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
    userId = encrypt(userId);
    return plaidItem.find({ itemId: `${userId}*`});
  }

  async function retrieveAccountsFromPlaidForItem({ accessToken }, { encryptionKey }) {
    const access_token = decryptAccessToken(accessToken, encryptionKey);
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
    const { access_token, item_id } = accessData;
    
    const item = await plaidItem.save({
      accessToken: access_token,
      itemId: item_id
    }, req);

    return item;
  }

  function scrub(response, propsToRemove) {
    propsToRemove = Array.isArray(propsToRemove) ? propsToRemove : [propsToRemove];

    if(Array.isArray(response)) {
      return response.map(item => {
        for(const removeProp of propsToRemove) {
          delete item[removeProp];
        }
  
        return item;
      });
    }

    for(const removeProp of propsToRemove) {
      delete response[removeProp];
    }

    return response;
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

  async function syncTransactions({ body }) {
    let { 
      _id, access_token, cursor, req, 
      added, modified, removed 
    } = body;

    const request = {
      access_token,
      cursor,
      options: { include_personal_finance_category: true },
    };

    const response = await plaidClient.transactionsSync(request);

    const { data } = response;

    added = added.concat(data.added);
    modified = modified.concat(data.modified);
    removed = removed.concat(data.removed);

    cursor = data.next_cursor;
    const { has_more } = data;

    events.publish(
      `plaid.${has_more ? 'syncTransactions' : 'applyTransactionUpdates'}`,
      {
        _id, access_token, cursor:'', req,
        added, modified, removed
      }
    );
  }

  function warn(userId, _id, product) {
    console.warn(`Unauthorized attempt: User ${userId} tried to access Plaid ${product} (${_id}) without proper authorization.`);
  }

  return {
    init: function() {
      subscribeEvent('plaid.syncTransactions', syncTransactions);
      subscribeEvent('plaid.applyTransactionUpdates', applyTransactionUpdates);
      initClient();
    },
    exchangeToken: async function(req, res) {
      const { publicToken } = req.body;

      const accessData = await exchangePublicToken(publicToken);
      await savePlaidAccessData(accessData, req);

      res.json({ success: true });
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

      const userQuery = buildUserQuery(user._id, query)
      const transactions = await fetchTransactions(userQuery);
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

      events.publish('plaid.syncTransactions', {
        _id, access_token, cursor, req: { user },
        added: [], modified: [], removed: []
      });

      res.json('sync initiated...');
    },
    syncAccounts: async function({ user }, res) {
      initClient();

      const items = await fetchUserItems(user._id);
      let retrievedAccounts = [];

      for(const item of items) {
        retrievedAccounts = retrievedAccounts.concat(
          await retrieveAccountsFromPlaidForItem(item, user)
        );
      }

      const userAccounts = await fetchUserAccounts(user._id);
      const synced = [];

      for(const retrieved of retrievedAccounts) {
        const hasMatch = userAccounts.find(itm => itm.account_id === retrieved.account_id);

        if(hasMatch) {
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