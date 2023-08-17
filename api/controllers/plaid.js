import { events, params } from '@ampt/sdk';
import { data } from '@ampt/data';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

import plaidItem from '../models/plaidItems';
import plaidTransaction from '../models/plaidTransactions';
import { encrypt } from '../utils/encryption';

const {
  AMPT_URL,
  PLAID_CLIENT_ID,
  PLAID_SECRET_SANDBOX
} = params().list();

const app = function() {
  let plaidClient;

  async function applyUpdates({ body }) {
    const { 
      _id, cursor, req, 
      added, modified, removed 
    } = body;
    
    for (const transaction of added) {
      await plaidTransaction.save(transaction, req);
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

  function initClient() {
    plaidClient = plaidClient || new PlaidApi(buildConfiguration());
  }

  function buildRequest({ client_user_id, redirect_uri }) {
    return {
      user: { client_user_id },
      client_name: 'Plaid Test App',
      products: ['auth', 'transactions'],
      country_codes: ['US'],
      language: 'en',
      redirect_uri: redirect_uri || `${AMPT_URL}/spendingreport`
    };
  }

  function getItemId(user, { itemId }) {
    if(itemId) itemId = encrypt(itemId.replace('*', ''));
  
    return `${user._id}${itemId || ''}*`
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

  function fetchAccessToken(_id) {
    return plaidItem.findOne(_id);
  }

  async function fetchAccounts(access_token) {
    const { data } = await plaidClient.accountsGet({ access_token });
    return data;
  }

  async function savePlaidAccessData(accessData, req) {
    const { access_token: accessToken, item_id: itemId } = accessData;
    
    const item = await plaidItem.save({
      accessToken,
      itemId
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
      _id, accessToken, cursor, req, 
      added, modified, removed 
    } = body;

    const request = {
      access_token: accessToken,
      cursor,
      options: { include_personal_finance_category: true },
    };

    const response = await plaidClient.transactionsSync(request);

    const { data } = response;

    added = added.concat(data.added);
    modified = modified.concat(data.modified);
    removed = removed.concat(data.removed);

    cursor = data.next_cursor;

    const eventName = data.has_more 
      ? 'plaid.syncTransactions' 
      : 'plaid.applyUpdates';

    events.publish(eventName, {
      _id, accessToken, cursor, req,
      added, modified, removed
    });
  }

  return {
    init: function() {
      subscribeEvent('plaid.syncTransactions', syncTransactions);
      subscribeEvent('plaid.applyUpdates', applyUpdates);
      initClient();
    },
    exchangeToken: async function(req, res) {
      const { publicToken } = req.body;

      const accessData = await exchangePublicToken(publicToken);
      await savePlaidAccessData(accessData, req);

      res.json({ success: true });
    },
    getAccounts: async function(req, res) {
      initClient();

      const { _id } = req.params;

      const { accessToken } = await fetchAccessToken(_id);
      const accounts = await fetchAccounts(accessToken);

      res.json(accounts);
    },
    getLinkToken: async (req, res) => {
      const { redirect_uri, user } = req;

      const request = buildRequest({ 
        client_user_id: user._id, 
        redirect_uri 
      });

      const response = await plaidClient.linkTokenCreate(request);
      const { link_token } = response.data;

      res.json(link_token);
    },
    getPlaidItemsByItemId: async (req, res) => {
      const itemId = getItemId(req.user, req.query);
      const response = await plaidItem.find({ itemId });

      if(!response) {
        return res.json(null);
      }

      const scrubbed = scrub(response, ['accessToken', 'itemId', 'userId']);
      res.json(scrubbed);
    },
    getPlaidItemsBy_id: async (req, res) => {
      const response = await plaidItem.findOne(req.params._id);

      if(!response) {
        return res.json(null);
      }

      if(response.userId === req.user._id) {
        const scrubbed = scrub(response, ['accessToken', 'itemId', 'userId']);
        return res.json(scrubbed);
      }

      res.json('Not authorized to view this item...');
    },
    initSyncEvent: async function ({ params, user }, res) {
      initClient();

      const { _id } = params;
      let { accessToken, cursor, syncStatus } = await plaidItem.find(_id);

      if(syncStatus === 'sync in progress...') {
        return res.json({ syncStatus });
      }

      await plaidItem.update(_id, { syncStatus: 'sync in progress...' });

      events.publish('plaid.syncTransactions', {
        _id, accessToken, cursor, req: { user },
        added: [], modified: [], removed: []
      });

      res.json('sync initiated...');
    }
  }
}();

app.init();

export default app;