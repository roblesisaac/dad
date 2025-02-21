import PlaidBaseService from './baseService.js';
import plaidAccounts from '../../models/plaidAccounts.js';
import plaidGroups from '../../models/plaidGroups.js';
import { itemService, plaidService } from './index.js';
import { plaidClientInstance } from './plaidClientConfig.js';

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
      for (const item of userItems) {
        try {
          const accounts = await plaidService.fetchAccountsFromPlaid(
            item, user
          );
          fetchedAccounts = [...fetchedAccounts, ...accounts];
        } catch (error) {
          console.error(`Error retrieving accounts for item ${item._id}:`, error);
          // Continue with other items even if one fails
        }
      }

      // If no accounts were retrieved, throw an error
      if (!fetchedAccounts.length) {
        throw new Error('NO_ACCOUNTS: Failed to retrieve any accounts from Plaid');
      }

      // Fetch the user's existing accounts and groups
      const existingUserAccounts = await this.fetchUserAccounts(user._id);
      const existingGroups = await plaidGroups.findAll({ userId: user._id, name: '*' });

      // Sync the accounts and groups
      return await this.saveAccountsAndGroups(
        fetchedAccounts,
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

  async saveAccountsAndGroups(fetchedAccounts, existingAccounts, existingGroups, user) {
    const synced = { accounts: [], groups: [] };

    for (const retrievedAccount of fetchedAccounts) {
      const isSaved = this.isAccountSaved(existingAccounts, retrievedAccount);

      // Update the account if it already exists
      if (isSaved) {
        const updatedAccount = await this.updateAccount(
          retrievedAccount,
          user._id
        );

        synced.accounts.push(updatedAccount);
        continue;
      }

      // Else, save the account
      const accountData = { ...retrievedAccount, user };
      const savedAc = await plaidAccounts.save(accountData);
      synced.accounts.push(savedAc);

      // Save the group for the account
      const groupData = await this.saveGroup(user, savedAc);
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

  async saveGroup(user, retrievedAccount) {
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

  isAccountSaved(existingUserAccounts, retrievedAccount) {
    return existingUserAccounts.find(itm => itm.account_id === retrievedAccount.account_id);
  }
}

export default new PlaidAccountService(plaidClientInstance); 