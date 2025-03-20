import PlaidBaseService from './baseService.js';
import itemService from './itemService.js';

class PlaidService extends PlaidBaseService {
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