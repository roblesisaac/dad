import PlaidBaseService from './baseService.js';
import plaidAccounts from '../../models/plaidAccounts.js';
import plaidGroups from '../../models/plaidGroups.js';
import itemService from './itemService.js';
import plaidService from './plaidService.js';

class PlaidAccountService extends PlaidBaseService {
  async syncAccountsAndGroups(user) {
    this.validateUser(user);

    try {
      // Always retain access to the local archive, even if every Plaid Item
      // has been disconnected (or an institution is unavailable).
      const userItems = (await itemService.getUserItems(user._id))
        .filter(item => !item.disconnectedAt && item.status !== 'disconnected');

      const readLocalRecords = async () => {
        const [accounts, groups] = await Promise.all([
          this.fetchUserAccounts(user._id),
          plaidGroups.findAll({ userId: user._id, name: '*' })
        ]);
        return { accounts: accounts.filter(Boolean), groups: groups.filter(Boolean) };
      };

      const local = await readLocalRecords();
      if (!userItems.length) {
        return { ...local, itemsNeedingReauth: [] };
      }

      let fetchedAccounts = [];
      const itemsNeedingReauth = [];

      for (const item of userItems) {
        try {
          const accounts = await plaidService.fetchAccountsFromPlaid(item, user);
          fetchedAccounts.push(...accounts);
        } catch (error) {
          console.error(`Error retrieving accounts for item ${item._id}:`, error);
          const errorMessage = error.message || '';
          const isDecryptError = errorMessage.includes('DECRYPT_ERROR');
          const isLoginRequired = error.error_code === 'ITEM_LOGIN_REQUIRED' ||
            errorMessage.includes('ITEM_LOGIN_REQUIRED');

          if (isDecryptError || isLoginRequired) {
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
        }
      }

      if (fetchedAccounts.length) {
        await this.saveAccountsAndGroups(
          fetchedAccounts,
          local.accounts,
          local.groups,
          user
        );
        // Include disconnected accounts in All Accounts / reports, not only
        // active ones returned by Plaid's latest accountsGet.
        const updated = await readLocalRecords();
        return { ...updated, itemsNeedingReauth };
      }

      // Do not hide archived accounts or enter onboarding just because no
      // current Plaid account response succeeded.
      return { ...local, itemsNeedingReauth };
    } catch (error) {
      throw new Error(
        error.message.includes(':') ? error.message : `SYNC_ERROR: ${error.message}`
      );
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
    return await plaidAccounts.findAll({ account_id: '*', userId });
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
        isLabel: false,
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
