import plaidAccounts from '../models/plaidAccounts.js';
import plaidGroups from '../models/plaidGroups.js';
import plaidItems from '../models/plaidItems.js';
import { decryptAccessToken } from './oldPlaidLinkService.js';
import { plaidClientInstance } from './oldPlaidClient.js';

export async function syncUserAccounts(user) {
  if (!user?._id || !user?.encryptionKey) {
    throw new Error('INVALID_USER: Missing required user data');
  }

  let retrievedAccountsFromPlaid = [];
  try {
    const userItems = await fetchUserItemsFromDb(user._id);
    if (!userItems?.length) {
      throw new Error('NO_ITEMS: No Plaid items found for user');
    }

    const encryptedKey = user.encryptionKey;

    for (const item of userItems) {
      try {
        const accounts = await retrieveAccountsFromPlaidForItem(item, encryptedKey);
        retrievedAccountsFromPlaid = [...retrievedAccountsFromPlaid, ...accounts];
      } catch (error) {
        console.error(`Error retrieving accounts for item ${item._id}:`, error);
        // Continue with other items even if one fails
      }
    }

    if (!retrievedAccountsFromPlaid.length) {
      throw new Error('NO_ACCOUNTS: Failed to retrieve any accounts from Plaid');
    }

    const existingUserAccounts = await fetchUserAccounts(user._id);
    const existingGroups = await plaidGroups.findAll({ userId: user._id, name: '*' });

    return await syncAccountsAndGroups(
      retrievedAccountsFromPlaid, 
      existingUserAccounts, 
      existingGroups, 
      user
    );
  } catch (error) {
    // Preserve Plaid error codes if they exist
    if (error.error_code) {
      throw error;
    }
    throw new Error(`SYNC_ERROR: ${error.message}`);
  }
}

async function retrieveAccountsFromPlaidForItem(item, encryptedKey) {
  if (!item?.accessToken) {
    throw new Error('INVALID_ITEM: Missing access token');
  }

  try {
    const access_token = decryptAccessToken(item.accessToken, encryptedKey);
    const { data } = await plaidClientInstance.accountsGet({ access_token });

    if (!data?.accounts) {
      throw new Error('Invalid response from Plaid');
    }

    return data.accounts.map(account => ({
      ...account,
      itemId: data.item.item_id
    }));
  } catch (error) {
    // Check for specific Plaid errors
    if (error.error_code === 'ITEM_LOGIN_REQUIRED') {
      throw {
        error_code: 'ITEM_LOGIN_REQUIRED',
        error_message: 'This connection requires reauthentication',
        item_id: item.itemId
      };
    }
    throw new Error(`Failed to retrieve accounts: ${error.message}`);
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
async function fetchUserItemsFromDb(userId) {
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
  const encryptedKey = user.encryptionKey;

  for (const item of userItems) {
    const access_token = decryptAccessToken(item.accessToken, encryptedKey);
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
  fetchUserItemsFromDb,
  fetchItemById,
  syncItems,
  fetchUserAccounts,
  updateAccount
}; 