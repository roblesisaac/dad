import { params } from '@ampt/sdk';
import { data } from '@ampt/data';

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { decryptWithKey, decrypt } from '../utils/encryption';
import { isEmptyObject, scrub } from '../../src/utils';
import notify from '../utils/notify';

import tasks from '../tasks/plaid';

import plaidAccounts from '../models/plaidAccounts';
import plaidGroups from '../models/plaidGroups';
import plaidItems from '../models/plaidItems';
import plaidTransactions from '../models/plaidTransactions';
import Sites from '../models/sites';
import Users from '../models/users';

const {
  PLAID_CLIENT_ID,
  PLAID_SECRET_PROD,
  PLAID_SECRET_SANDBOX,
  ENV_NAME
} = params().list();

import plaidClient from '../services/plaidClient';

const app = {
  connectLink: async (req, res) => {
    const { user } = req;

    const request = {
      user: { client_user_id: user._id },
      client_name: 'TrackTabs',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en'
    };

    if (req.params.itemId) {
      const item = await plaidItems.findOne({ userId: user._id, itemId: req.params.itemId });
      const access_token = decryptAccessToken(item.accessToken, user.encryptionKey);

      delete request.products;
      request.access_token = access_token;
    }

    try {
      const plaidLinkData = await plaidClient.linkTokenCreate(request);
      const { data } = plaidLinkData;

      res.json(data.link_token);

      return data;
    } catch (error) {
      console.log('error...', error)
      throw new Error(`Error on plaid linkTokenCreater: ${error.message}`);
    }
  },
  exchangeTokenAndSavePlaidItem: async function (req, res) {
    const { publicToken } = req.body;
    const { user } = req;

    const accessData = await exchangePublicToken(publicToken);
    const { _id: itemId } = await savePlaidAccessData(accessData, { user });
    const { accounts, groups } = await syncUserAccounts(user);

    tasks.syncTransactionsForItem(itemId, user._id);

    res.json({ accounts, groups });
  },
  getPlaidItems: async (req, res) => {
    const { params, user } = req;
    let response;

    if (params._id) {
      response = await fetchItemById(params._id, user._id);
    } else {
      response = await fetchUserItems(user._id);
    }

    if (!response) {
      return res.json(null);
    }

    const scrubbed = scrub(response, ['accessToken', 'itemId', 'userId']);
    return res.json(scrubbed);
  },
  getTransactions: async (req, res) => {
    const { _id } = req.params;
    const { user, query } = req;

    if (_id) {
      const transaction = await fetchTransactionById(_id, user._id);
      return res.json(transaction);
    }

    const userQueryForDate = buildUserQueryForTransactions(user._id, query);
    const transactions = await fetchAllTransactionsFromDb(userQueryForDate);

    res.json(transactions);
  },
  getAllTransactionCount: async (req, res) => {
    const allTransactions = await plaidTransactions.findAll({
      userId: req.user._id,
      date: '*'
    });

    res.json(allTransactions.length);
  },
  getDuplicates: async function ({ user }, res) {
    const transactions = await plaidTransactions.findAll({ date: '*', userId: user._id });
    const idsToRemove = getDuplicateIds(transactions)

    res.json(idsToRemove);
  },
  removeAllTransactionsFromDatabase: async function ({ user, query }, res) {
    if (query.confirm !== 'remove all transactions') {
      return res.json(`You must type "remove all transactions" to confirm.`);
    }

    await tasks.removeAllUserTransactions(user);
    res.json(`Removing all your transactions. You will be notified at ${user.email} when the process is complete.`);
  },
  removeFromDb: async function (req, res) {
    const removed = await removeFromDb(req.body);

    res.json(removed);
  },
  retreivePlaidItems: async function ({ user }, res) {
    initClient();

    const userItems = await fetchUserItems(user._id);
    let syncedItems = [];

    for (const item of userItems) {
      const access_token = decryptAccessToken(item.accessToken, user.encryptionKey);

      syncedItems = [
        ...syncedItems,
        await syncItem(access_token)
      ]
    }

    res.json(scrub(syncedItems, 'accessToken'));
  },
  syncAccountsAndGroups: async function ({ user }, res) {
    initClient();

    res.json(await syncUserAccounts(user));
  },
  syncAllUserTransactions: async function ({ user }, res) {
    const response = await syncAllUserTransactions(user);

    res.json(response);
  },
  syncTransactionsForItem,
  updateDates: (_, res) => {
    tasks.updateAllDates();
    res.json('updating dates...');
  },
  test: async (_, res) => {
    try {
      res.json('test');
    } catch (error) {
      res.json(error.message);
    }
  }
};

function buildUserQueryForTransactions(userId, query) {
  if (isEmptyObject(query)) {
    return {
      transaction_id: '*',
      userId
    };
  }

  const { account_id } = query;
  const userInfo = `${account_id || ''}:`;

  for (const prop in query) {
    if (isMeta(prop) || prop === 'select') {
      continue
    }

    if (prop === 'date') {
      query.accountdate = formatDateForQuery(userInfo, query.date);
      delete query.date;
      continue;
    }

    query[prop] = `${userInfo}${query[prop].replace('*', '')}*`;
  };

  delete query.account_id;
  return { userId, ...query };
}

function decryptAccessToken(accessToken, encryptionKey) {
  try {
    accessToken = decrypt(accessToken);
    return decryptWithKey(accessToken, encryptionKey);
  } catch (error) {
    console.error(error.message);
    return {
      success: false,
      result: {
        errorMessage: error.message
      }
    }
  }
}

async function emailSiteOwner(emailData) {
  const site = await Sites.findOne();

  if (!site) {
    console.error('No site found');
    return;
  }

  await notify.email(site.email, emailData);
}

async function exchangePublicToken(publicToken) {
  try {
    const { data } = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    return data;
  } catch (error) {
    console.error('Error exchanging public token:', error);
  }
}

const delay = async () => new Promise(resolve => setTimeout(resolve, 1000));

async function fetchItemById(itemId, userId) {
  const item = await plaidItems.findOne(itemId);

  if (item.userId === userId) {
    return item;
  }

  warn(userId, itemId, 'Item');
  return false;
}

async function fetchTransactionsFromPlaid({ access_token, cursor, startTime }) {
  let added = [];
  let modified = [];
  let removed = [];

  try {
    let hasMore = true;
    let next_cursor;

    while (hasMore) {
      
      if (Date.now() - startTime > 3 * 1000) {
        return { added, modified, removed, next_cursor, sectionedOff: true };
      }

      const request = { access_token, cursor: next_cursor || cursor };
      const { data } = await plaidClient.transactionsSync(request);

      added = added.concat(data.added);
      modified = modified.concat(data.modified);
      removed = removed.concat(data.removed);

      hasMore = data.has_more;
      next_cursor = data.next_cursor;

      if (hasMore) await delay();
    }

    return { added, modified, removed, next_cursor, sectionedOff: false };
  } catch (error) {
    return {
      success: false,
      result: {
        errorMessage: error.message
      }
    };
  }
}

function fetchAllTransactionsFromDb(query) {
  if (typeof query === 'string') {
    query = { name: `*`, userId: query }
  }

  return plaidTransactions.findAll(query);
}

async function fetchTransactionById(_id, userId) {
  const transaction = await plaidTransactions.findOne(_id);

  if (transaction.userId === userId) {
    return transaction;
  }

  warn(userId, _id, 'Transaction');
  return null;
}

async function fetchUserAccounts(userId) {
  const { items } = await plaidAccounts.find({
    account_id: `*`,
    userId
  });

  return items;
}

async function fetchUserItems(userId) {
  try {
    const { items } = await plaidItems.find({ itemId: '*', userId });

    return items;
  } catch (err) {
    return err.toString();
  }

}

function formatDateForQuery(userInfo, dateRange) {
  const [startDate, endDate] = dateRange.split('_');

  let formatted = `${userInfo}`;

  if (startDate) formatted += startDate;

  if (endDate) {
    formatted += `|accountdate_${userInfo}${endDate}`;
  } else {
    formatted += '*';
  }

  return formatted;
}

function getDuplicateIds(existingTransactions) {
  const uniqueItemsMap = new Map();
  const duplicatesToRemove = [];

  for (const item of existingTransactions) {
    const uniqueKey = `account_id=${item.account_id}&transaction_id=${item.transaction_id}`;

    if (uniqueItemsMap.has(uniqueKey)) {
      duplicatesToRemove.push(item._id);
    } else {
      uniqueItemsMap.set(uniqueKey);
    }
  }

  return duplicatesToRemove;
}

async function handleSyncError(itemId, nextSyncData, { result }, handlerName) {
  try {
    result.errorMessage = `${handlerName}: ${result.errorMessage}`;

    console.error(result);

    await emailSiteOwner({
      subject: `TrackTabs Sync Error: ${handlerName}`,
      template: renderErrorProperties({ ...result, itemId })
    });

    return await updatePlaidItemSyncData(itemId, { ...nextSyncData, result, status: 'failed' });

  } catch (error) {
    console.error(error.message);
    return {
      success: false,
      result: {
        errorMessage: `handleSyncError: ${error.message}`
      }
    }
  }
}

function hasSyncError(data) {
  return data.success === false;
}

function initClient() {
  const environment = ENV_NAME === 'prod' ? 'production' : 'sandbox';

  const config = new Configuration({
    basePath: PlaidEnvironments[environment],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': environment === 'production' ? PLAID_SECRET_PROD : PLAID_SECRET_SANDBOX,
        'Plaid-Version': '2020-09-14',
      },
    },
  });

  return new PlaidApi(config);
}

function isAccountAlreadySaved(existingUserAccounts, retrievedAccount) {
  return existingUserAccounts.find(itm => itm.account_id === retrievedAccount.account_id);
}

function isEmpty(plaidData, propsToCheck) {
  return propsToCheck.every(
    arrName => plaidData[arrName] && plaidData[arrName].length === 0
  );
}

function isMeta(str) {
  return [
    ...Array.from({ length: 5 }, (_, i) => `label${i + 1}`),
    'meta',
    'overwrite',
    'ttl',
    'limit',
    'reverse',
    'start'
  ].includes(str);
}

async function itemsAdd(itemsToAdd=[], userId, syncId) {
  if(!itemsToAdd.length) {
    return;
  }

  let itemsAddedCount = 0;

  try {
    for (const transaction of itemsToAdd) {
      await plaidTransactions.save({ ...transaction, userId, syncId });
      itemsAddedCount++;
    }

    return itemsAddedCount;
  } catch (error) {
    return {
      success: false,
      result: {
        itemsAddedCount,
        errorMessage: error.message
      }
    }
  }
}

async function itemsModify(itemsToModify, userId) {
  if(!itemsToModify?.length) {
    return 0;
  }

  let itemsModifiedCount = 0;

  try {
    for (const transaction of itemsToModify) {
      const { transaction_id } = transaction;

      await plaidTransactions.update({ transaction_id, userId }, transaction);
      itemsModifiedCount++;
    }

    return itemsModifiedCount;
  } catch (error) {
    return {
      success: false,
      result: {
        itemsModifiedCount,
        errorMessage: error.message
      }
    }
  }
}

async function itemsRemove(itemsToRemove, userId) {
  if(!itemsToRemove?.length) {
    return 0;
  }

  let itemsRemovedCount = 0;

  try {
    for (const transaction of itemsToRemove) {
      const { transaction_id } = transaction;

      await plaidTransactions.erase({ transaction_id, userId }, transaction);
      itemsRemovedCount++;
    }

    return itemsRemovedCount;
  } catch (error) {
    return {
      success: false,
      result: {
        itemsRemovedCount,
        errorMessage: error.message
      }
    }
  }
}

async function mergePendingCustomNotesToSettled(added=[], userId ) {
  if(added.length > 500) {
    return 0;
  }
  
  let itemsMergedCount = 0;

  try {
    for (const item of added) {
      const { pending_transaction_id } = item;

      const pendingTransaction = await plaidTransactions.findOne({ userId, transaction_id: pending_transaction_id });

      if (!pendingTransaction) {
        continue;
      }

      const { notes, recategorizeAs, tags } = pendingTransaction;

      if (notes || tags.length || recategorizeAs) {
        item.notes = notes;
        item.tags = tags;
        item.recategorizeAs = recategorizeAs;

        itemsMergedCount++;
      }
    }

    return itemsMergedCount;
  } catch (error) {
    return {
      success: false,
      result: {
        itemsMergedCount,
        errorMessage: error.message
      }
    }
  }
}

function renderErrorProperties(result) {
  let errorDetails = `<p style="font-family: 'Arial', sans-serif; font-size: 16px; margin-bottom: 10px;">Sync Error:</p>
    <table style="width:100%; border-collapse: collapse; font-family: 'Arial', sans-serif; font-size: 14px; color: #333;">`;

  let isOddRow = true;

  for (const prop in result) {
    if (Object.prototype.hasOwnProperty.call(result, prop)) {
      const backgroundColor = isOddRow ? '#f3f3ee' : '#ffffff';

      errorDetails += `
        <tr style="background-color: ${backgroundColor};">
          <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold;">${prop}:</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${result[prop]}</td>
        </tr>
      `;

      isOddRow = !isOddRow; // Toggle background color and font weight for the next row
    }
  }

  errorDetails += '</table>';

  return errorDetails;
}

async function removeFromDb(duplicates) {
  duplicates = Array.isArray(duplicates) ? duplicates : [duplicates];

  const idsToRemove = duplicates.splice(0, 25);
  const removed = await data.remove(idsToRemove);

  return {
    removed,
    duplicates
  };
}

async function retrieveAccountsFromPlaidForItem(item, user) {
  try {
    const access_token = decryptAccessToken(item.accessToken, user.encryptionKey)
    const { data } = await plaidClient.accountsGet({ access_token });

    if (!data.accounts) {
      return [];
    }

    return data.accounts.map(account => ({
      ...account,
      itemId: data.item.item_id
    }));
  } catch (error) {
    return [error.toString()];
  }
}

async function savePlaidAccessData(accessData, req) {
  try {
    const { access_token, item_id } = accessData;

    const item = await plaidItems.save({
      accessToken: access_token,
      itemId: item_id,
      syncData: {
        result: {},
        status: 'queued'
      },
      req
    });

    return { access_token, ...item };
  } catch (err) {
    console.error('Error saving plaid access data...', { err });
  }
}

async function syncAllUserTransactions(user) {
  const items = await plaidItems.findAll({ itemId: '*', userId: user._id });
  const syncResults = [];
  const queuedItems = [];

  const days = (n) => n * 24 * 60 * 60 * 1000;
  const fiveDaysAgo = Date.now() - days(5);

  for (const item of items) {

    // sync transaction imediately if its been less than five days since last sync..
    if(item.syncData.cursor !== '' && item.syncData.lastSyncTime > fiveDaysAgo && !item.syncData.result.sectionedOff) {
      syncResults.push(await syncTransactionsForItem(item._id, user._id));

      continue;
    }

    const syncAlreadyInProgress = ['queued', 'in_progress'].includes(item.syncData.status);

    if (syncAlreadyInProgress) {
      syncResults.push({
        taskAlreadyQueued: true,
        itemId: item._id
      });

      continue;
    }

    // add to queue if last sync was greater than 5 days and a sync is not already in progress or the cursor is blank
    await updatePlaidItemSyncData(item._id, { ...item.syncData, status: 'queued' });

    syncResults.push({
      taskQueued: true,
      itemId: item._id
    });

    queuedItems.push(item._id);      
  }

  if(queuedItems.length > 0) {
    await tasks.syncTransactionsForItems(queuedItems, user._id);
  }

  return { syncResults };
}

async function syncItem(access_token) {
  try {
    const response = await plaidClient.itemGet({ access_token });

    return response.data.item;
  } catch (error) {
    return error.toString();
  }
}

async function syncUserAccounts(user) {
  let retrievedAccountsFromPlaid = [];

  const userItems = await fetchUserItems(user._id);

  for (const item of userItems) {
    try {
      retrievedAccountsFromPlaid = [
        ...retrievedAccountsFromPlaid,
        ...await retrieveAccountsFromPlaidForItem(item, user)
      ]
    } catch (retrieveAccountError) {
      throw new Error(retrieveAccountError)
    }
  }

  const existingUserAccounts = await fetchUserAccounts(user._id);
  const existingGroups = await plaidGroups.findAll({ userId: user._id, name: '*' });

  const synced = { accounts: [], groups: [] };

  for (const retrievedAccount of retrievedAccountsFromPlaid) {
    if (isAccountAlreadySaved(existingUserAccounts, retrievedAccount)) {
      const updatedAccount = await updateAccount(retrievedAccount.account_id, user._id, retrievedAccount);

      synced.accounts.push(updatedAccount);
      continue;
    }

    // Usually if there was an error
    if (typeof retrievedAccount === 'string') {
      continue;
    }

    const newSavedAccount = await plaidAccounts.save({ ...retrievedAccount, req: { user } });
    
    synced.accounts.push(newSavedAccount);

    // Create a new group for the account
    synced.groups.push(await userGroupSave(user, newSavedAccount));
  }

  for (const group of existingGroups) {

    const updatedAccounts = group.accounts.map(account => {
      const updatedAccount = synced.accounts.find(itm => itm.account_id === account.account_id);
      return updatedAccount || account;
    });

    const updatedGroup = await userGroupUpdate(group._id, updatedAccounts);

    synced.groups.push(updatedGroup);

  }

  return synced;
}

async function syncTransactionsForItem(item, userId) {
  if (typeof item === 'string') {
    item = await plaidItems.findOne(item);
  }

  const { accessToken, syncData } = item;
  const syncAlreadyInProgress = ['in_progress'].includes(syncData.status);

  if (syncAlreadyInProgress) {
    return { itemsAlreadySyncing: item._id };
  };

  const currentTime = Date.now();
  const nextSyncData = {
    cursor: syncData.cursor,
    lastSyncId: userId + currentTime,
    lastSyncTime: currentTime,
    result: {
      errorMessage: "",
      itemsMergedCount: 0,
      itemsAddedCount: 0,
      itemsModifiedCount: 0,
      itemsRemovedCount: 0
    }
  };

  await updatePlaidItemSyncData(item._id, { ...nextSyncData, status: 'in_progress' });

  const user = await Users.findOne(userId);
  const access_token = decryptAccessToken(accessToken, user.encryptionKey);

  if (hasSyncError(access_token)) {
    return await handleSyncError(item._id, nextSyncData, access_token, 'decryptAccessToken');
  }

  const response = await fetchTransactionsFromPlaid({ access_token, cursor: syncData.cursor, startTime: currentTime });

  if (hasSyncError(response)) {
    return await handleSyncError(item._id, nextSyncData, response, 'fetchTransactionsFromPlaid');
  }

  if(response.sectionedOff) {
    await emailSiteOwner({
      subject: '45 Minute Timeout Reached',
      template: `<p>Tracktabs sync timed lasted longer than 45 minutes. Saving progress and sectioning off the sync.</p>`
    })
  }

  if (isEmpty(response, ['added', 'modified', 'removed'])) {
    return {
      added: [],
      removed: [],
      item: await updatePlaidItemSyncData(item._id, {
        ...nextSyncData,
        result: {
          sectionedOff: false
        },
        status: 'completed'
      })
    };
  }

  const { added, modified, removed, next_cursor } = response;

  const itemsMergedCount = await mergePendingCustomNotesToSettled(added, userId);

  if (hasSyncError(itemsMergedCount)) {
    return await handleSyncError(item._id, nextSyncData, itemsMergedCount, 'mergePendingCustomNotesToSettled');
  }

  const itemsRemovedCount = await itemsRemove(removed, userId);

  if (hasSyncError(itemsRemovedCount)) {
    return await handleSyncError(item._id, nextSyncData, itemsRemovedCount, 'itemsRemove');
  }

  const itemsModifiedCount = await itemsModify(modified, userId);

  if (hasSyncError(itemsModifiedCount)) {
    itemsModifiedCount.result = { ...itemsModifiedCount.result, itemsRemovedCount };
    return await handleSyncError(item._id, nextSyncData, itemsModifiedCount, 'itemsModifiedCount');
  }

  const itemsAddedCount = await itemsAdd(added, userId, userId + currentTime);

  if (hasSyncError(itemsAddedCount)) {
    itemsAddedCount.result = { ...itemsAddedCount.result, itemsRemovedCount, itemsModifiedCount };
    return await handleSyncError(item._id, nextSyncData, itemsAddedCount, 'itemsAddedCount');
  }

  const nowInPST = new Date(Date.now() - (12 * 60 * 60 * 1000));
  const emailData = {
    subject: `TrackTabs Sync Complete`,
    template: `<p>Your TrackTabs account for ${user.email} has been synced successfully.</p>
    <p>As of ${nowInPST}, all of your transactions are up to date.</p>
    <p>
      <b>Summary</b>
      <br /><b>Custom Info Merged With Settled Items Count:</b> ${itemsMergedCount}
      <br /><b>Items Added Count:</b> ${itemsAddedCount}
      <br /><b>Items Modified Count:</b> ${itemsModifiedCount}
      <br /><b>Items Removed Count:</b> ${itemsRemovedCount}
      <br /><b>Sync Sectioned Off:</b> ${response.sectionedOff}
    </p>`
  };

  // await notify.email(user.email, emailData);
  await emailSiteOwner(emailData);

  return {
    added,
    removed,
    item: await updatePlaidItemSyncData(item._id, {
      ...nextSyncData,
      cursor: next_cursor,
      result: {
        itemsMergedCount, itemsAddedCount, itemsModifiedCount, itemsRemovedCount,
        sectionedOff: response.sectionedOff
      },
      status: 'completed'
    })
  };
}

async function updateAccount(account_id, userId, retrievedAccount) {
  try {
    return await plaidAccounts.update({ account_id, userId }, retrievedAccount);
  } catch (error) {
    return error.toString();
  }
}

async function updatePlaidItemSyncData(itemId, syncData) {
  syncData.result = syncData.result || {};
  const updated = await plaidItems.update(itemId, { syncData });

  return { itemId, ...updated.syncData };
}

function userGroupSave(user, retrievedAccount) {
  try {
    const { _id, account_id, mask, name, balances } = retrievedAccount;

    return plaidGroups.save({
      accounts: [
        {
          _id,
          account_id,
          mask,
          name,
          current: balances?.current,
          available: balances?.available
        }
      ],
      name: mask,
      req: { user }
    });
  } catch (error) {
    return {
      error: error.toString(),
      retrievedAccount
    };
  }
}

async function userGroupUpdate(groupId, updatedAccounts) {
  const accounts = updatedAccounts.map(account => ({
    _id: account._id,
    account_id: account.account_id,
    mask: account.mask,
    name: account.name,
    current: account.balances?.current,
    available: account.balances?.available
  }));

  try {
    return await plaidGroups.update(groupId, { accounts });
  } catch (error) {
    return {
      accounts,
      error: error.toString(),
      groupId,
      updatedAccounts
    };
  }
}

function warn(userId, itemId, product) {
  console.warn(`Unauthorized attempt: User ${userId} tried to access Plaid ${product} (${itemId}) without proper authorization.`);
}

export default app;