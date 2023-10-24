import { params } from '@ampt/sdk';
import { data } from '@ampt/data';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { decryptWithKey, decrypt } from '../utils/encryption';
import { isEmptyObject, scrub } from '../../src/utils';

import plaidAccounts from '../models/plaidAccounts';
import plaidGroups from '../models/plaidGroups';
import plaidItems from '../models/plaidItems';
import plaidTransactions from '../models/plaidTransactions';

import tasks from '../tasks/plaid';

const {
  AMPT_URL,
  PLAID_CLIENT_ID,
  PLAID_SECRET_DEVELOPMENT,
  PLAID_SECRET_SANDBOX,
  ENV_NAME
} = params().list();

const app = function() {
  let plaidClient;

  function buildUserQueryForTransactions(userId, query) {
    if (isEmptyObject(query)) {
      return {
        transaction_id: '*',
        userId
      };
    }
  
    const { account_id } = query;
    const userInfo = `${account_id || ''}:`;

    for(const prop in query) {
      if(isMeta(prop) || prop==='select') {
        continue
      }

      if(prop === 'date') {
        query.date = formatDateForQuery(userInfo, query.date);
        continue;
      }

      query[prop] = `${userInfo}${query[prop].replace('*', '')}*`;
    };

    delete query.account_id;
    return { userId, ...query };
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
    const { items } = await plaidAccounts.find({
      account_id: `*`,
      userId
    });

    return items;
  }

  function fetchUserGroups(userId, groupId) {
    if(groupId) {
      return plaidGroups.findOne(groupId);    
    }

    return plaidGroups.findAll({ name: '*', userId });
  }

  async function fetchItemById(itemId, userId) {
    const item = await plaidItems.findOne(itemId);
    
    if(item.userId === userId) {
      return item;
    }

    warn(userId, itemId, 'Item');
    return false;
  }

  function fetchTransactions(query) {
    if(typeof query === 'string') {
      query = { name:  `*`, userId: query }
    }

    return plaidTransactions.findAll(query);
  }

  async function fetchTransactionById(_id, userId) {
    const transaction = await plaidTransactions.findOne(_id);

    if(transaction.userId === userId) {
      return transaction;
    }

    warn(userId, _id, 'Transaction');
    return null;
  }

  async function fetchUserItems(userId) {
    const { items } = await plaidItems.find({ itemId: '*', userId });
    
    return items;
  }

  function formatDateForQuery(userInfo, dateRange) {
    const [startDate, endDate] = dateRange.split('_');

    let formatted = `${userInfo}`;

    if(startDate) formatted += startDate;

    if(endDate) {
      formatted += `|date_${userInfo}${endDate}`;
    } else {
      formatted += '*';
    }

    return formatted;
  }

  function accountAlreadySynced(existingUserAccounts, retrievedAccount) {
    return existingUserAccounts.find(itm => itm.account_id === retrievedAccount.account_id);
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

    plaidClient = plaidClient || new PlaidApi(config);
  }

  function isMeta(str) {
    return [
      ...Array.from({ length: 5 }, (_, i) => `label${i + 1}`), 
      'meta', 
      'overwrite', 
      'ttl', 
      'limit',
      'reverse',
      'start'
    ].includes(str);
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

      const item = await plaidItems.save({
        accessToken: access_token,
        itemId: item_id,
        syncStatus: 'sync in progress...',
        req
      });
  
      return { access_token, ...item };
    } catch (err) {
      console.error('Error saving plaid access data...', { err });
    }
  }

  async function syncUserAccounts(user) {
    let retrievedAccounts = [];

    for(const item of await fetchUserItems(user._id)) {
      const access_token = decryptAccessToken(item.accessToken, user.encryptionKey);

      retrievedAccounts = [
        ...retrievedAccounts,
        ...await retrieveAccountsFromPlaidForItem(access_token)
      ]
    }

    const existingUserAccounts = await fetchUserAccounts(user._id);
    const synced = {
      accounts: [],
      groups: []
    };

    for(const retrievedAccount of retrievedAccounts) {
      if(accountAlreadySynced(existingUserAccounts, retrievedAccount)) {
        const updatedAccount = await updateAccount(retrievedAccount.account_id, user._id, retrievedAccount);

        synced.accounts.push(updatedAccount);
        synced.groups.push( await userGroupUpdate(user._id, updatedAccount) );
        continue;
      }

      const newSavedAccount = await plaidAccounts.save({ ...retrievedAccount, req: { user } });
      
      synced.accounts.push(newSavedAccount);
      synced.groups.push( await userGroupSave(user, newSavedAccount) );
    }

    return synced;
  }

  function updateAccount(account_id, userId, retrievedAccount) {
    return plaidAccounts.update({ account_id, userId }, retrievedAccount);
  }

  function userGroupSave(user, retrievedAccount) {
    const { _id, account_id, mask, name, balances } = retrievedAccount;

    return plaidGroups.save({ 
      accounts: [
        {
          _id,
          account_id,
          mask,
          name,
          current: balances?.current
        }
      ],
      name: mask,
      req: { user } 
     });
  }

  function userGroupUpdate(userId, updatedAccount) {
    const { _id, account_id, mask, name, balances } = updatedAccount;

    return plaidGroups.update({ name: mask, userId }, { 
      accounts: [
        {
          _id,
          account_id,
          mask,
          name,
          current: balances?.current
        }
      ],
      name: mask
     });
  }

  function warn(userId, itemId, product) {
    console.warn(`Unauthorized attempt: User ${userId} tried to access Plaid ${product} (${itemId}) without proper authorization.`);
  }

  function getDuplicateIds(existingTransactions) {
    const uniqueItemsMap = new Map();  
    const duplicatesToRemove = [];
  
    for (const item of existingTransactions) {
      const uniqueKey = `account_id=${item.account_id}&transaction_id=${item.transaction_id}`;

      if (uniqueItemsMap.has(uniqueKey)) {
        duplicatesToRemove.push(item._id);
      } else {
        uniqueItemsMap.set(uniqueKey);
      }
    }

    return duplicatesToRemove;
  }

  function removeFromDb(duplicates) {
    duplicates = Array.isArray(duplicates) ? duplicates : [duplicates];

    return data.remove(duplicates);
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
        client_name: 'StrumBook',
        products: [
          'transactions', 
          // 'income',
          // 'liabilities'
        ],
        country_codes: ['US'],
        language: 'en',
        redirect_uri: `${AMPT_URL}/spendingreport`
      };

      try {
        const { data } = await plaidClient.linkTokenCreate(request);

        res.json(data.link_token);
        return data;
      } catch (error) {
        throw new Error(`Error on plaid linkTokenCreater: ${error.message}`);
      }
    },
    exchangeTokenAndSavePlaidItem: async function(req, res) {
      const { publicToken } = req.body;
      const { user } = req;

      const accessData = await exchangePublicToken(publicToken);
      const { _id: itemId } = await savePlaidAccessData(accessData, { user });
      const { accounts, groups } = await syncUserAccounts(user);

      tasks.syncTransactions(itemId, user._id);

      res.json({ accounts, groups });
    },
    getAccounts: async (req, res) => {
      const accounts = await fetchUserAccounts(req.user._id);
      res.json(accounts);
    },
    getGroups: async (req, res) => {
      const groups = await fetchUserGroups(req.user._id, req.params._id);
      
      res.json(groups);
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
      const transactions = await fetchTransactions(userQueryForDate);

      res.json(transactions);
    },
    initSyncTransactions: async function ({ params, user }, res) {
      initClient();

      const { itemId } = params;
      const { _id: userId } = user;
      const { syncStatus } = await fetchItemById(itemId, userId);

      if(syncStatus === 'sync in progress...') {
        return res.json({ syncStatus });
      }

      await plaidItems.update(itemId, { syncStatus: 'sync in progress...' });
      tasks.syncTransactions(itemId, user._id);

      res.json('sync initiated...');
    },
    getDuplicates: async function({ user }, res) {
      const transactions = await plaidTransactions.findAll({ date: '*', userId: user._id });
      const idsToRemove = getDuplicateIds(transactions)

      res.json(idsToRemove);
    },
    removeFromDb: async function(req, res) {
      const removed = await removeFromDb(req.body);

      res.json(removed)
    },
    syncAccounts: async function({ user }, res) {
      initClient();

      res.json( await syncUserAccounts(user) );
    },
    syncAllUserData: async function({ user }, res) {
      const { accounts, groups } = await syncUserAccounts(user);
      const items = await plaidItems.findAll({ itemId: '*', userId: user._id });
      let itemsToSync = 0;
      let itemsAlreadySyncing = 0;

      for(const item of items) {
        if(item.syncStatus !== 'complete') {
          itemsAlreadySyncing++;
          continue;
        };

        await plaidItems.update(item._id, { syncStatus: 'sync in progress...' });
        tasks.syncTransactions(item._id, user._id);
        itemsToSync++;
      }

      res.json({
        itemsAlreadySyncing,
        itemsToSync,
        accounts,
        groups
      });
    }
  }
}();

app.init();

export default app;