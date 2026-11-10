import PlaidBaseService from './baseService.js';
import itemService from './itemService.js';

class PlaidService extends PlaidBaseService {
  /**
   * Revoke a Plaid item access token at Plaid
   * @param {string} access_token - Plaid access token
   * @returns {Promise<Object>} Plaid API response
   */
  async removeItem(access_token) {
    if (!access_token) {
      throw new Error('INVALID_ACCESS_TOKEN: Missing access token');
    }

    try {
      const response = await this.client.itemRemove({ access_token });
      return response.data;
    } catch (error) {
      const code = error?.error_code || error?.response?.data?.error_code;
      // Plaid documents ITEM_NOT_FOUND as an Item already removed or
      // depermissioned. Treat this as idempotent success so local cleanup can
      // recover when the prior remove succeeded but a DB write failed.
      // Do NOT treat INVALID_ACCESS_TOKEN as success; it can indicate a
      // wrong environment or developer account.
      if (code === 'ITEM_NOT_FOUND') {
        return { alreadyRemoved: true };
      }
      this.handlePlaidError({
        error_code: code,
        error_message: error?.error_message || error?.response?.data?.error_message,
        message: error?.message
      });
    }
  }

  /**
   * Fetch accounts from Plaid
   * @param {Object} item - Item data
   * @param {Object} user - User data
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
   * @param {Object} item - Item data
   * @param {Object} user - User data
   * @returns {Promise<Object>} Plaid item data
   */
  async syncItemFromPlaid(item, user) {
    const access_token = itemService.decryptAccessToken(item, user);
    const plaidItem = await this.client.itemGet({ access_token });
    return plaidItem;
  }

  /**
   * Fetch transactions from Plaid
   * @param {string} access_token - Plaid access token
   * @param {string} cursor - Pagination cursor
   * @param {string} startDate - Optional start date
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
}

export default new PlaidService(); 
