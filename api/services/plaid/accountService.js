import PlaidBaseService from './baseService.js';
import plaidAccounts from '../../models/plaidAccounts.js';
import plaidGroups from '../../models/plaidGroups.js';
import itemService from './itemService.js';
import plaidService from './plaidService.js';

class PlaidAccountService extends PlaidBaseService {
  async syncAccountsAndGroups(user) {
    this.validateUser(user);

    try {
      // Get the user's items
      const userItems = await itemService.getUserItems(user._id);
      if (!userItems?.length) {
        return null;
      }

      // Fetch the accounts from Plaid
      let fetchedAccounts = [];
      const itemsNeedingReauth = []; // Track items that need re-authentication

      for (const item of userItems) {
        try {
          const accounts = await plaidService.fetchAccountsFromPlaid(
            item, user
          );
          fetchedAccounts = [...fetchedAccounts, ...accounts];
        } catch (error) {
          console.error(`Error retrieving accounts for item ${item._id}:`, error);

          // Check if this is a decryption or authentication error
          const errorMessage = error.message || '';
          const isDecryptError = errorMessage.includes('DECRYPT_ERROR');
          const isLoginRequired = error.error_code === 'ITEM_LOGIN_REQUIRED' ||
            errorMessage.includes('ITEM_LOGIN_REQUIRED');

          if (isDecryptError || isLoginRequired) {
            // Track this item as needing re-authentication
            // We DON'T delete the item here because it has transaction history
            // The cleanup will happen after the user reconnects successfully
            itemsNeedingReauth.push({
              itemId: item.itemId,
              _id: item._id,
              institutionName: item.institutionName || 'Unknown Institution',
              reason: isDecryptError ? 'credentials_expired' : 'login_required',
              message: isDecryptError
                ? 'This account needs to be reconnected'
                : 'Please log in again to this account'
            });
          }
          // Continue with other items even if one fails
        }
      }

      // If no accounts were retrieved but we have items needing reauth,
      // return the reauth info instead of throwing an error
      if (!fetchedAccounts.length) {
        if (itemsNeedingReauth.length > 0) {
          return {
            accounts: [],
            groups: [],
            itemsNeedingReauth
          };
        }
        throw new Error('NO_ACCOUNTS: Failed to retrieve any accounts from Plaid');
      }

      // Fetch the user's existing accounts and groups
      const existingUserAccounts = await this.fetchUserAccounts(user._id);
      const existingGroups = await plaidGroups.findAll({ userId: user._id, name: '*' });

      // Sync the accounts and groups
      const saved = await this.saveAccountsAndGroups(
        fetchedAccounts,
        existingUserAccounts,
        existingGroups,
        user
      );

      // Include items needing reauth in the response if any
      if (itemsNeedingReauth.length > 0) {
        saved.itemsNeedingReauth = itemsNeedingReauth;
      }

      return saved;
    } catch (error) {
      // Ensure error is properly formatted
      const formattedError = new Error(
        error.message.includes(':') ? error.message : `SYNC_ERROR: ${error.message}`
      );
      throw formattedError;
    }
  }

  async saveAccountsAndGroups(fetchedAccounts, existingAccounts, existingGroups, user) {
    const synced = { accounts: [], groups: [] };

    for (const retrievedAccount of fetchedAccounts) {
      const isExisting = this.isExistingAccount(existingAccounts, retrievedAccount);

      // Update the account if it already exists
      if (isExisting) {
        const updatedAccount = await this.updateAccount(
          user._id,
          retrievedAccount
        );

        synced.accounts.push(updatedAccount);
        continue;
      }

      // Else, save the account
      const accountData = { ...retrievedAccount, user };
      const savedAc = await plaidAccounts.save(accountData);
      synced.accounts.push(savedAc);

      // Save the group for the account
      const groupData = await this.saveNewGroup(user, savedAc);
      synced.groups.push(groupData);
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

  async updateAccount(userId, retrievedAccount) {
    try {
      const { account_id } = retrievedAccount;
      return await plaidAccounts.update({ account_id, userId }, retrievedAccount);
    } catch (error) {
      throw new Error(`Error updating account: ${error.message}`);
    }
  }

  async saveNewGroup(user, retrievedAccount) {
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

  async updateExistingGroups(existingGroups = [], updatedAccounts = []) {
    const updatedGroups = [];
    for (const group of existingGroups) {
      const accounts = group.accounts?.map(account => {
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

  isExistingAccount(existingUserAccounts, retrievedAccount) {
    return existingUserAccounts.find(itm => itm.account_id === retrievedAccount.account_id);
  }
}

export default new PlaidAccountService(); 