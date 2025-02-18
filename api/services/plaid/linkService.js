import PlaidBaseService from './baseService.js';
import { decrypt, decryptWithKey } from '../../utils/encryption.js';
import plaidItems from '../../models/plaidItems.js';
import { plaidClientInstance } from './plaidClientConfig.js';
import crypto from 'crypto';

class PlaidLinkService extends PlaidBaseService {
  generateClientUserId(identifier) {
    return crypto
      .createHash('sha256')
      .update(identifier.toLowerCase().trim())
      .digest('hex')
      .slice(0, 32);
  }

  async createLinkToken(user, itemId = null) {
    this.validateUser(user);

    const clientUserId = this.generateClientUserId(user._id);

    const request = {
      user: { 
        client_user_id: clientUserId
      },
      client_name: 'TrackTabs',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en'
    };

    if (itemId) {
      try {
        const item = await plaidItems.findOne({ 
          userId: user._id, 
          itemId 
        });
        if (!item) {
          throw new Error('ITEM_NOT_FOUND: Invalid item ID');
        }
        const access_token = this.decryptAccessToken(item.accessToken, user.encryptionKey);
        delete request.products;
        request.access_token = access_token;
      } catch (error) {
        throw new Error(`ITEM_ACCESS_ERROR: ${error.message}`);
      }
    }

    try {
      const { link_token } = await this.handleResponse(
        this.client.linkTokenCreate(request)
      );
      return link_token;
    } catch (error) {
      console.error('Link token creation failed:', error);
      throw new Error(`LINK_TOKEN_ERROR: ${error.message}`);
    }
  }

  async exchangePublicToken(publicToken) {
    if (!publicToken) {
      throw new Error('INVALID_TOKEN: Public token is required');
    }

    try {
      return await this.handleResponse(
        this.client.itemPublicTokenExchange({
          public_token: publicToken,
        })
      );
    } catch (error) {
      throw new Error(`TOKEN_EXCHANGE_ERROR: ${error.message}`);
    }
  }

  decryptAccessToken(dblEncryptedAccessToken, encryptedKey) {
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

  async savePlaidAccessData(accessData, encryptedKey) {
    if (!accessData?.access_token || !accessData?.item_id) {
      throw new Error('INVALID_ACCESS_DATA: Missing required access data');
    }

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
    } catch (error) {
      throw new Error(`SAVE_ERROR: Failed to save Plaid access data - ${error.message}`);
    }
  }

  async getItem(userId, itemId) {
    try {
      const item = await plaidItems.findOne({ userId, itemId });
      if (!item) {
        throw new Error('ITEM_NOT_FOUND: Item not found for this user');
      }
      return item;
    } catch (error) {
      throw new Error(`ITEM_FETCH_ERROR: ${error.message}`);
    }
  }
}

export default new PlaidLinkService(plaidClientInstance); 