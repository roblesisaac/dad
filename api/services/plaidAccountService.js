import plaidAccounts from '../models/plaidAccounts.js';
import plaidGroups from '../models/plaidGroups.js';
import plaidItems from '../models/plaidItems.js';
import { decryptAccessToken } from './plaidLinkService.js';
import { plaidClientInstance } from './plaidClient.js';

export async function syncUserAccounts(user) {
  let retrievedAccountsFromPlaid = [];
  const userItems = await fetchUserItems(user._id);

  for (const item of userItems) {
    retrievedAccountsFromPlaid = [
      ...retrievedAccountsFromPlaid,
      ...await retrieveAccountsFromPlaidForItem(item, user)
    ];
  }

  const existingUserAccounts = await fetchUserAccounts(user._id);
  const existingGroups = await plaidGroups.findAll({ userId: user._id, name: '*' });

  return await syncAccountsAndGroups(retrievedAccountsFromPlaid, existingUserAccounts, existingGroups, user);
}

async function retrieveAccountsFromPlaidForItem(item, user) {
  try {
    const access_token = decryptAccessToken(item.accessToken, user.encryptionKey);
    const { data } = await plaidClientInstance.accountsGet({ access_token });

    if (!data.accounts) return [];

    return data.accounts.map(account => ({
      ...account,
      itemId: data.item.item_id
    }));
  } catch (error) {
    throw new Error(`Error retrieving accounts: ${error.message}`);
  }
}

async function syncAccountsAndGroups(retrievedAccountsFromPlaid, existingAccounts, existingGroups, user) {
  const synced = { accounts: [], groups: [] };

  for (const retrievedAccount of retrievedAccountsFromPlaid) {
    if (isAccountAlreadySaved(existingAccounts, retrievedAccount)) {
      const updatedAccount = await updateAccount(retrievedAccount.account_id, user._id, retrievedAccount);
      synced.accounts.push(updatedAccount);
      continue;
    }

    const newSavedAccount = await plaidAccounts.save({ ...retrievedAccount, req: { user } });
    synced.accounts.push(newSavedAccount);
    synced.groups.push(await userGroupSave(user, newSavedAccount));
  }

  const updatedGroups = await updateExistingGroups(existingGroups, synced.accounts);
  synced.groups = [...synced.groups, ...updatedGroups];

  return synced;
}

// Helper functions from original plaid.js
async function fetchUserItems(userId) {
  try {
    const { items } = await plaidItems.find({ itemId: '*', userId });
    return items;
  } catch (err) {
    throw new Error(`Error fetching user items: ${err.message}`);
  }
}

async function fetchItemById(itemId, userId) {
  const item = await plaidItems.findOne(itemId);

  if (item.userId === userId) {
    return item;
  }

  console.warn(`Unauthorized attempt: User ${userId} tried to access Plaid Item (${itemId}) without proper authorization.`);
  return false;
}

async function fetchUserAccounts(userId) {
  const { items } = await plaidAccounts.find({
    account_id: `*`,
    userId
  });
  return items;
}

async function updateAccount(account_id, userId, retrievedAccount) {
  try {
    return await plaidAccounts.update({ account_id, userId }, retrievedAccount);
  } catch (error) {
    throw new Error(`Error updating account: ${error.message}`);
  }
}

async function userGroupSave(user, retrievedAccount) {
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

async function updateExistingGroups(existingGroups, updatedAccounts) {
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

function isAccountAlreadySaved(existingUserAccounts, retrievedAccount) {
  return existingUserAccounts.find(itm => itm.account_id === retrievedAccount.account_id);
}

async function syncItems(userItems, user) {
  let syncedItems = [];
  
  for (const item of userItems) {
    const access_token = decryptAccessToken(item.accessToken, user.encryptionKey);
    try {
      const response = await plaidClientInstance.itemGet({ access_token });
      syncedItems.push(response.data.item);
    } catch (error) {
      console.error(`Error syncing item: ${error.message}`);
    }
  }
  
  return syncedItems;
}

export default {
  syncUserAccounts,
  fetchUserItems,
  fetchItemById,
  syncItems,
  fetchUserAccounts,
  updateAccount
}; 