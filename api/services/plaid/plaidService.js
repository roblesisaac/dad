import PlaidBaseService from './baseService.js';
import { itemService, transactionService } from './index.js';
import { plaidClientInstance } from './plaidClientConfig.js';

class PlaidService extends PlaidBaseService {
  /**
   * Synchronizes items using the batch-based approach
   * @param {Object} user - User data
   * @param {Array} userItems - Array of user items
   * @returns {Promise<Array>} Synced items results
   */
  async syncItems(user, userItems) {
    try {
      let syncResults = [];

      for (const item of userItems) {
        try {
          // Check current sync status
          const currentStatus = item.syncData?.status || 'none';
          
          // Only start a new sync if one is not already in progress
          if (currentStatus !== 'in_progress') {
            // Initialize sync state
            await itemService.updateItemSyncStatus(item._id, user._id, {
              status: 'in_progress',
              lastSyncTime: Date.now(),
              cursor: item.syncData?.cursor || null,
              error: null,
              batchNumber: 0,
              stats: {
                added: 0,
                modified: 0,
                removed: 0
              }
            });
            
            // Process the first batch without awaiting (start in background)
            transactionService.processSingleBatch(item, user)
              .then(result => {
                console.log(`First batch processed for item ${item._id}:`, {
                  hasMore: result.hasMore,
                  added: result.batchResults.added,
                  modified: result.batchResults.modified,
                  removed: result.batchResults.removed
                });
              })
              .catch(err => {
                console.error(`Error processing first batch for item ${item._id}:`, err);
              });
          }
          
          syncResults.push({
            itemId: item._id,
            status: 'sync_initiated',
            message: currentStatus === 'in_progress' ? 
              'Sync already in progress' : 'Sync initiated',
            currentStatus
          });
        } catch (error) {
          syncResults.push({
            itemId: item._id,
            status: 'error',
            error: error.message || 'Unknown error',
            currentStatus: item.syncData?.status || 'none'
          });
        }
      }

      if (!syncResults.length) {
        throw new Error('SYNC_ERROR: Failed to start sync for any items');
      }

      return syncResults;
    } catch (error) {
      throw new Error(`ITEM_SYNC_ERROR: ${error.message}`);
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
  async fetchItemFromPlaid(item, user) {
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
  async fetchTransactionsFromPlaid(access_token, cursor = null, startDate = null) {
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

export default new PlaidService(plaidClientInstance); 