import { params } from '@ampt/sdk';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { decryptWithKey, decrypt } from '../utils/encryption';
import { isEmptyObject, scrub } from '../../src/utils';
import { isMeta } from '../utils/records/utils';

import plaidAccounts from '../models/plaidAccounts';
import plaidItem from '../models/plaidItems';
import plaidTransaction from '../models/plaidTransactions';

import tasks from '../tasks/plaid';
import plaid from '../routes/plaid';

const {
  AMPT_URL,
  PLAID_CLIENT_ID,
  PLAID_SECRET_DEVELOPMENT,
  PLAID_SECRET_SANDBOX
} = params().list();

const app = function() {
  let plaidClient;

  function buildUserQueryForTransactions(user_id, query) {
    if (isEmptyObject(query)) {
      return user_id;
    }
  
    const { account_id } = query;
    const userTree = `${user_id}${account_id}`;

    for(const prop in query) {
      if(isMeta(prop) || prop==='select') {
        continue
      }

      if(prop === 'date') {
        query[prop] = formatDateForQuery(userTree, query[prop]);
        continue;
      }

      query[prop] = `${userTree}${query[prop].replace('*', '')}*`;
    };

    delete query.account_id;  
    return query
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

  async function fetchUserAccounts(userId) {
    return plaidAccounts.find({
      account_id: `${userId}*`
    });
  }

  async function fetchItemById(itemId, userId) {
    const item = await plaidItem.findOne(itemId);
    
    if(item.userId === userId) {
      return item;
    }

    warn(userId, itemId, 'Item');
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

  function formatDateForQuery(userTree, dateRange) {
    const [startDate, endDate] = dateRange.split('_');

    let formatted = userTree;

    if(startDate) formatted += startDate;

    if(endDate) {
      formatted += `|date_${userTree}${endDate}`;
    } else {
      formatted += '*';
    }

    return formatted;
  }

  function hasMatch(userAccounts, retrieved) {
    return userAccounts.find(itm => itm.account_id === retrieved.account_id);
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

  function warn(userId, itemId, product) {
    console.warn(`Unauthorized attempt: User ${userId} tried to access Plaid ${product} (${itemId}) without proper authorization.`);
  }

  return {
    init: function() {
      initClient();
      return plaidClient;
    },
    connectLink: async (req, res) => {
      const { user } = req;

      const request = {
        user: { client_user_id: user._id },
        client_name: 'UISHEET',
        products: ['auth', 'transactions'],
        country_codes: ['US'],
        language: 'en',
        redirect_uri: `${AMPT_URL}/spendingreport`
      };

      const { data } = await plaidClient.linkTokenCreate(request);

      res.json(data.link_token);
      return data;
    },
    exchangeTokenAndSavePlaidItem: async function(req, res) {
      const { publicToken } = req.body;
      const { user } = req;

      const accessData = await exchangePublicToken(publicToken);
      const { _id: itemId, access_token } = await savePlaidAccessData(accessData, { user });
      const accounts = await saveAccountsForNewPlaidItem(access_token, { user });

      tasks.syncTransactions(itemId, user._id);

      res.json(accounts);
    },
    getAccounts: async (req, res) => {
      const accounts = await fetchUserAccounts(req.user._id);
      res.json(accounts);
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

      const userQueryForDate = buildUserQueryForTransactions(user._id, query);

      let transactions = [];
      let lastKey = true;
  
      while(lastKey) {
        const start = typeof lastKey === 'string' ? lastKey : undefined;
        const filter = { start, ...userQueryForDate };
        const fetched = await fetchTransactions(filter);
  
        transactions = transactions.concat(fetched.items || fetched);
        lastKey = fetched.lastKey;
      }

      res.json(transactions);
    },
    initSyncTransactions: async function ({ params, user }, res) {
      initClient();

      const { _id: itemId } = params;
      const { _id: userId } = user;
      const { syncStatus } = await fetchItemById(itemId, userId);

      if(syncStatus === 'sync in progress...') {
        return res.json({ syncStatus });
      }

      await plaidItem.update(itemId, { syncStatus: 'sync in progress...' });
      tasks.syncTransactions(itemId, user._id);

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