import PlaidBaseService from './baseService.js';
import plaidAccounts from '../../models/plaidAccounts.js';
import plaidGroups from '../../models/plaidGroups.js';
import { itemService, linkService } from './index.js';
import { plaidClientInstance } from './plaidClientConfig.js';

class PlaidAccountService extends PlaidBaseService {
  async syncUserAccounts(user) {
    this.validateUser(user);

    try {
      const userItems = await itemService.getItems(user._id);
      if (!userItems?.length) {
        throw new Error('NO_ITEMS: No Plaid items found for user');
      }

      let retrievedAccountsFromPlaid = [];
      for (const item of userItems) {
        try {
          const accounts = await this.retrieveAccountsFromPlaidForItem(item, user.encryptionKey);
          retrievedAccountsFromPlaid = [...retrievedAccountsFromPlaid, ...accounts];
        } catch (error) {
          console.error(`Error retrieving accounts for item ${item._id}:`, error);
          // Continue with other items even if one fails
        }
      }

      if (!retrievedAccountsFromPlaid.length) {
        throw new Error('NO_ACCOUNTS: Failed to retrieve any accounts from Plaid');
      }

      const existingUserAccounts = await this.fetchUserAccounts(user._id);
      const existingGroups = await plaidGroups.findAll({ userId: user._id, name: '*' });

      return await this.syncAccountsAndGroups(
        retrievedAccountsFromPlaid,
        existingUserAccounts,
        existingGroups,
        user
      );
    } catch (error) {
      // Ensure error is properly formatted
      const formattedError = new Error(
        error.message.includes(':') ? error.message : `SYNC_ERROR: ${error.message}`
      );
      throw formattedError;
    }
  }

  async retrieveAccountsFromPlaidForItem(item, encryptedKey) {
    if (!item?.accessToken) {
      throw new Error('INVALID_ITEM: Missing access token');
    }

    try {
      const access_token = linkService.decryptAccessToken(item.accessToken, encryptedKey);
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

  async syncAccountsAndGroups(retrievedAccountsFromPlaid, existingAccounts, existingGroups, user) {
    const synced = { accounts: [], groups: [] };

    for (const retrievedAccount of retrievedAccountsFromPlaid) {
      if (this.isAccountAlreadySaved(existingAccounts, retrievedAccount)) {
        const updatedAccount = await this.updateAccount(retrievedAccount.account_id, user._id, retrievedAccount);
        synced.accounts.push(updatedAccount);
        continue;
      }
      const newSavedAccount = await plaidAccounts.save({ ...retrievedAccount, req: { user } });
      synced.accounts.push(newSavedAccount);
      synced.groups.push(await this.userGroupSave(user, newSavedAccount));
    }

    const updatedGroups = await this.updateExistingGroups(existingGroups, synced.accounts);
    synced.groups = [...synced.groups, ...updatedGroups];

    return synced;
  }

  async fetchUserAccounts(userId) {
    const { items } = await plaidAccounts.find({
      account_id: `*`,
      userId
    });
    return items;
  }

  async updateAccount(account_id, userId, retrievedAccount) {
    try {
      return await plaidAccounts.update({ account_id, userId }, retrievedAccount);
    } catch (error) {
      throw new Error(`Error updating account: ${error.message}`);
    }
  }

  async userGroupSave(user, retrievedAccount) {
    try {
      const { _id, account_id, mask, name, balances } = retrievedAccount;

      const current = balances?.current || 0;
      const available = balances?.available || 0;

      return plaidGroups.save({
        accounts: [
          {
            _id,
            account_id,
            mask,
            name,
            current: Number.isNaN(current) ? 0 : current,
            available: Number.isNaN(available) ? 0 : available
          }
        ],
        name: mask,
        req: { user }
      });
    } catch (error) {
      throw new Error(`Error saving user group: ${error.message}`);
    }
  }

  async updateExistingGroups(existingGroups, updatedAccounts) {
    const updatedGroups = [];
    for (const group of existingGroups) {
      const accounts = group.accounts.map(account => {
        const updatedAccount = updatedAccounts.find(itm => itm.account_id === account.account_id);
        if (!updatedAccount) return account;

        const current = updatedAccount.balances?.current || 0;
        const available = updatedAccount.balances?.available || 0;

        return {
          ...updatedAccount,
          current: Number.isNaN(current) ? 0 : current,
          available: Number.isNaN(available) ? 0 : available
        };
      });

      const updatedGroup = await plaidGroups.update(group._id, { accounts });
      updatedGroups.push(updatedGroup);
    }
    return updatedGroups;
  }

  isAccountAlreadySaved(existingUserAccounts, retrievedAccount) {
    return existingUserAccounts.find(itm => itm.account_id === retrievedAccount.account_id);
  }

  async syncItems(userItems, user) {
    let syncedItems = [];
    const encryptedKey = user.encryptionKey;

    for (const item of userItems) {
      const access_token = linkService.decryptAccessToken(item.accessToken, encryptedKey);
      try {
        const response = await this.handleResponse(
          this.client.itemGet({ access_token })
        );
        syncedItems.push(response.item);
      } catch (error) {
        console.error(`Error syncing item: ${error.message}`);
      }
    }
    
    return syncedItems;
  }
}

export default new PlaidAccountService(plaidClientInstance); 