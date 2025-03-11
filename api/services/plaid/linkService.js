import PlaidBaseService from './baseService.js';
import itemService from './itemService.js';
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
        const item = await itemService.getUserItems(user._id, itemId);
        const access_token = itemService.decryptAccessToken(item, user);
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
}

export default new PlaidLinkService();