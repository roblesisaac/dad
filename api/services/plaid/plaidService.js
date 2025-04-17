import PlaidBaseService from './baseService.js';
import itemService from './itemService.js';
import crypto from 'crypto';

class PlaidService extends PlaidBaseService {
  /**
   * Fetch accounts from Plaid
   * @returns {Promise<Array>} Accounts data
   */
  async fetchAccountsFromPlaid(item, user) {
    if (!item?.accessToken) {
      throw new Error('INVALID_ITEM: Missing access token');
    }
  
    try {
      const access_token = itemService.decryptAccessToken(item, user);
      const data = await this.handleResponse(
        this.client.accountsGet({ access_token })
      );
  
      return data.accounts.map(account => ({
        ...account,
        itemId: data.item.item_id
      }));
    } catch (error) {
      if (error.error_code === 'ITEM_LOGIN_REQUIRED') {
        throw {
          error_code: 'ITEM_LOGIN_REQUIRED',
          error_message: 'This connection requires reauthentication',
          item_id: item.itemId
        };
      }
      throw new Error(`ACCOUNT_FETCH_ERROR: ${error.message}`);
    }
  }

  /**
   * Fetch item info from Plaid
   * @returns {Promise<Object>} Plaid item data
   */
  async syncItemFromPlaid(item, user) {
    const access_token = itemService.decryptAccessToken(item, user);
    const plaidItem = await this.client.itemGet({ access_token });
    return plaidItem;
  }

  /**
   * Fetch transactions from Plaid
   * @returns {Promise<Object>} Transactions data
   */
  async syncLatestTransactionsFromPlaid(access_token, cursor = null, startDate = null) {
    try {
      const request = {
        access_token,
        cursor,
        options: {
          include_personal_finance_category: true,
          include_original_description: true
        }
      };

      if (startDate) {
        request.start_date = startDate;
      }

      return await this.handleResponse(
        this.client.transactionsSync(request)
      );
    } catch (error) {
      throw new Error(`PLAID_API_ERROR: ${error.message}`);
    }
  }

  /**
   * Generate a client user ID from an identifier
   * @returns {string} - Hashed client user ID
   */
  generateClientUserId(identifier) {
    return crypto
      .createHash('sha256')
      .update(identifier.toLowerCase().trim())
      .digest('hex')
      .slice(0, 32);
  }

  /**
   * Create a Plaid Link token
   * @returns {Promise<string>} - Link token
   */
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
        const item = await itemService.getItem(itemId, user._id);
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

  /**
   * Exchange a public token for an access token
   * @returns {Promise<Object>} - Access token data
   */
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

  /**
   * Invalidate an existing access token and create a new one
   * @param {Object} item - Plaid item with the token to invalidate
   * @param {Object} user - User object owning the item
   * @returns {Promise<Object>} Result with new access token info
   */
  async invalidateAndRotateAccessToken(item, user) {
    if (!item?.accessToken) {
      throw new Error('INVALID_ITEM: Missing access token');
    }

    try {
      const access_token = itemService.decryptAccessToken(item, user);
      
      // Call Plaid API to invalidate and create a new token
      const response = await this.handleResponse(
        this.client.itemAccessTokenInvalidate({ access_token })
      );
      
      // Save the new access token
      const accessData = {
        access_token: response.new_access_token,
        item_id: item.itemId
      };
      
      // Save the new token to database
      await itemService.savePlaidAccessData(accessData, user);
      
      return {
        success: true,
        itemId: item.itemId,
        message: 'Access token successfully rotated'
      };
    } catch (error) {
      if (error.error_code) {
        throw {
          error_code: error.error_code,
          error_message: error.error_message || 'Plaid token rotation failed'
        };
      }
      throw new Error(`TOKEN_ROTATION_ERROR: ${error.message}`);
    }
  }

  /**
   * Unlink a Plaid item but preserve item data locally for future relinking
   * @param {Object} item - Plaid item to unlink
   * @param {Object} user - User object owning the item
   * @returns {Promise<Object>} Result of the operation
   */
  async unlinkAndRelinkItem(item, user) {
    if (!item?.accessToken) {
      throw new Error('INVALID_ITEM: Missing access token');
    }

    try {
      // Get original item data before modifications
      const validatedItem = await itemService.validateAndGetItem(item, user);
      if (!validatedItem) {
        throw new Error('ITEM_NOT_FOUND: Item data not found');
      }

      // Decrypt the access token for Plaid API call
      const access_token = itemService.decryptAccessToken(validatedItem, user);
      
      // Remove the item from Plaid
      await this.handleResponse(
        this.client.itemRemove({ access_token })
      );
      
      // Mark the item as unlinked in our database but preserve the data
      const unlinkResult = await itemService.markItemAsUnlinked(validatedItem.itemId, user._id);
      
      if (!unlinkResult.success) {
        throw new Error('DB_ERROR: Failed to update item status in database');
      }
      
      // Create a link token for reconnection
      const link_token = await this.createLinkToken(user);
      
      return {
        success: true,
        itemId: validatedItem.itemId,
        institutionId: validatedItem.institutionId,
        institutionName: validatedItem.institutionName,
        message: 'Item successfully unlinked and ready for reconnection',
        link_token
      };
    } catch (error) {
      if (error.error_code) {
        throw {
          error_code: error.error_code,
          error_message: error.error_message || 'Plaid unlink operation failed'
        };
      }
      throw new Error(`UNLINK_ERROR: ${error.message}`);
    }
  }

  /**
   * Relink a previously unlinked item with a new access token
   * @param {String} itemId - Original item ID to relink
   * @param {Object} accessData - New access token data from Plaid
   * @param {Object} user - User object
   * @returns {Promise<Object>} Result of the relinking operation
   */
  async relinkItem(itemId, accessData, user) {
    try {
      if (!itemId || !accessData?.access_token || !accessData?.item_id) {
        throw new Error('INVALID_PARAMS: Missing required relinking data');
      }
      
      // Get the original unlinked item
      const originalItem = await itemService.getItem(itemId, user._id);
      
      if (!originalItem) {
        throw new Error('ITEM_NOT_FOUND: Original item not found for relinking');
      }
      
      if (originalItem.status !== 'unlinked') {
        throw new Error('INVALID_STATE: Item is not in unlinked state');
      }
      
      // Save the new access data to the existing item record
      const relinkResult = await itemService.relinkItem(itemId, accessData, user);
      
      // Update related transactions and sync sessions
      let recordUpdateResults = { transactionsUpdated: 0, sessionsUpdated: 0 };
      
      if (relinkResult.success) {
        recordUpdateResults = await itemService.updateRelatedRecords(
          itemId, 
          originalItem.itemId, 
          accessData.item_id,
          user._id
        );
      }
      
      return {
        success: true,
        itemId: accessData.item_id,
        originalItemId: itemId,
        message: 'Item successfully relinked',
        transactionsUpdated: recordUpdateResults.transactionsUpdated || 0,
        sessionsUpdated: recordUpdateResults.sessionsUpdated || 0
      };
    } catch (error) {
      console.error('Relink error:', error);
      throw new Error(`RELINK_ERROR: ${error.message}`);
    }
  }
}

export default new PlaidService(); 