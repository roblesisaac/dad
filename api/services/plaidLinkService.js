import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { params } from '@ampt/sdk';
import { decryptWithKey, decrypt } from '../utils/encryption.js';
import plaidItems from '../models/plaidItems.js';

const {
  PLAID_CLIENT_ID,
  PLAID_SECRET_PROD,
  PLAID_SECRET_SANDBOX,
  ENV_NAME
} = params().list();

function initPlaidClient() {
  const environment = ENV_NAME === 'prod' ? 'production' : 'sandbox';

  const config = new Configuration({
    basePath: PlaidEnvironments[environment],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': environment === 'production' ? PLAID_SECRET_PROD : PLAID_SECRET_SANDBOX,
        'Plaid-Version': '2020-09-14',
      },
    },
  });

  return new PlaidApi(config);
}

const plaidClientInstance = initPlaidClient();

export async function createLinkToken(user, itemId = null) {
  const request = {
    user: { client_user_id: user._id },
    client_name: 'TrackTabs',
    products: ['transactions'],
    country_codes: ['US'],
    language: 'en'
  };

  if (itemId) {
    const item = await plaidItems.findOne({ userId: user._id, itemId });
    const access_token = decryptAccessToken(item.accessToken, user.encryptionKey);

    delete request.products;
    request.access_token = access_token;
  }

  try {
    const plaidLinkData = await plaidClientInstance.linkTokenCreate(request);
    return plaidLinkData.data;
  } catch (error) {
    throw new Error(`Error creating link token: ${error.message}`);
  }
}

export async function exchangePublicToken(publicToken) {
  try {
    const { data } = await plaidClientInstance.itemPublicTokenExchange({
      public_token: publicToken,
    });
    return data;
  } catch (error) {
    throw new Error(`Error exchanging public token: ${error.message}`);
  }
}

export function decryptAccessToken(accessToken, encryptionKey) {
  try {
    accessToken = decrypt(accessToken);
    return decryptWithKey(accessToken, encryptionKey);
  } catch (error) {
    throw new Error(`Error decrypting access token: ${error.message}`);
  }
}

export async function savePlaidAccessData(accessData, req) {
  try {
    const { access_token, item_id } = accessData;

    const item = await plaidItems.save({
      accessToken: access_token,
      itemId: item_id,
      syncData: {
        result: {},
        status: 'queued'
      },
      req
    });

    return { access_token, ...item };
  } catch (err) {
    throw new Error(`Error saving plaid access data: ${err.message}`);
  }
}

export default {
  createLinkToken,
  exchangePublicToken,
  decryptAccessToken,
  initPlaidClient,
  savePlaidAccessData
}; 