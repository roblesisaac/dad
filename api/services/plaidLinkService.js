import { decryptWithKey, decrypt } from '../utils/encryption.js';
import plaidItems from '../models/plaidItems.js';
import { plaidClientInstance } from './plaidClient.js';

export async function createLinkToken(user, itemId = null) {
  if (!user?._id) {
    throw new Error('INVALID_USER: User ID is required');
  }

  const request = {
    user: { client_user_id: user._id },
    client_name: 'TrackTabs',
    products: ['transactions'],
    country_codes: ['US'],
    language: 'en'
  };

  if (itemId) {
    try {
      const item = await plaidItems.findOne({ userId: user._id, itemId });
      if (!item) {
        throw new Error('ITEM_NOT_FOUND: Invalid item ID');
      }
      const access_token = decryptAccessToken(item.accessToken, user.encryptionKey);
      delete request.products;
      request.access_token = access_token;
    } catch (error) {
      throw new Error(`ITEM_ACCESS_ERROR: ${error.message}`);
    }
  }

  try {
    const plaidLinkData = await plaidClientInstance.linkTokenCreate(request);
    return plaidLinkData.data;
  } catch (error) {
    throw new Error(`LINK_TOKEN_ERROR: ${error.message}`);
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

export function decryptAccessToken(dblEncryptedAccessToken, encryptedKey) {
  if (!dblEncryptedAccessToken || !encryptedKey) {
    throw new Error('DECRYPT_ERROR: Missing required encryption data');
  }

  try {
    const encryptedAccessToken = decrypt(dblEncryptedAccessToken);
    const key = decrypt(encryptedKey, 'buffer');
    return decryptWithKey(encryptedAccessToken, key);
  } catch (error) {
    throw new Error(`DECRYPT_ERROR: Failed to decrypt access token - ${error.message}`);
  }
}

export async function savePlaidAccessData(accessData, encryptedKey) {
  try {
    const { access_token, item_id } = accessData;
    const encryptionKey = decrypt(encryptedKey, 'buffer');

    const item = await plaidItems.update({ item_id }, {
      accessToken: access_token,
      itemId: item_id,
      syncData: {
        result: {},
        status: 'queued'
      },
      encryptionKey
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
  savePlaidAccessData
};