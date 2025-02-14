import plaidTransactions from '../models/plaidTransactions.js';
import plaidItems from '../models/plaidItems.js';
import notify from '../utils/notify.js';
import { decryptAccessToken } from './plaidLinkService.js';
import { plaidClientInstance } from './plaidClient.js';
import { isEmptyObject } from '../../src/utils';
import { data } from '@ampt/data';
import tasks from '../tasks/plaid.js';

// Main export functions
export async function syncTransactionsForItem(item, userId, encryptionKey) {
  try {
    if (typeof item === 'string') {
      item = await plaidItems.findOne(item);
    }

    const { accessToken, syncData } = item;
    
    if (['in_progress'].includes(syncData.status)) {
      return { itemsAlreadySyncing: item._id };
    }

    const nextSyncData = initializeNextSyncData(userId, syncData);
    await updatePlaidItemSyncData(item._id, { ...nextSyncData, status: 'in_progress' });

    const access_token = decryptAccessToken(accessToken, encryptionKey);

    const response = await fetchTransactionsFromPlaid({ 
      access_token, 
      cursor: syncData.cursor, 
      startTime: nextSyncData.lastSyncTime 
    });

    return await processTransactionSync(response, item, userId, nextSyncData);
  } catch (error) {
    console.error('Error in syncTransactionsForItem:', error);
    throw new Error(`Failed to sync transactions: ${error.message}`);
  }
}

export async function syncAllUserTransactions(user) {
  const userId = user.metadata.legacyId;
  const encryptionKey = user.metadata.encryptionKey;
  const items = await plaidItems.findAll({ itemId: '*', userId });
  const syncResults = [];
  const queuedItems = [];

  for (const item of items) {
    const result = await processSyncForItem(item, userId, encryptionKey, syncResults, queuedItems);
    if (result) syncResults.push(result);
  }

  if (queuedItems.length > 0) {
    await tasks.syncTransactionsForItems(queuedItems, user);
  }

  return { syncResults };
}

export function buildUserQueryForTransactions(userId, query) {
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
      continue;
    }

    if (prop === 'date') {
      query.accountdate = formatDateForQuery(userInfo, query.date);
      delete query.date;
      continue;
    }

    query[prop] = `${userInfo}${query[prop].replace('*', '')}*`;
  }

  delete query.account_id;
  return { userId, ...query };
}

// Helper functions
async function fetchTransactionsFromPlaid({ access_token, cursor, startTime }) {
  let added = [];
  let modified = [];
  let removed = [];
  const minutes = 60 * 1000;

  try {
    let hasMore = true;
    let next_cursor;

    while (hasMore) {
      if (Date.now() - startTime > 40 * minutes) {
        return { added, modified, removed, next_cursor, sectionedOff: true };
      }

      const request = { access_token, cursor: next_cursor || cursor };
      const { data } = await plaidClientInstance.transactionsSync(request);

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

async function processTransactionSync(response, item, userId, nextSyncData) {
  if (hasSyncError(response)) {
    return await handleSyncError(item._id, nextSyncData, response, 'fetchTransactionsFromPlaid');
  }

  const { added, modified, removed, next_cursor, sectionedOff } = response;

  const itemsMergedCount = await mergePendingCustomNotesToSettled(added, userId);
  const itemsRemovedCount = await itemsRemove(removed, userId);
  const itemsModifiedCount = await itemsModify(modified, userId);
  const itemsAddedCount = await itemsAdd(added, userId, nextSyncData.lastSyncId);

  // await notifyUserOfSync(user, {
  //   itemsMergedCount,
  //   itemsAddedCount,
  //   itemsModifiedCount,
  //   itemsRemovedCount,
  //   sectionedOff
  // });

  return {
    added,
    removed,
    item: await updatePlaidItemSyncData(item._id, {
      ...nextSyncData,
      cursor: next_cursor,
      result: {
        itemsMergedCount,
        itemsAddedCount,
        itemsModifiedCount,
        itemsRemovedCount,
        sectionedOff
      },
      status: 'completed'
    })
  };
}

async function mergePendingCustomNotesToSettled(added = [], userId) {
  if (added.length > 500) return 0;
  
  let itemsMergedCount = 0;

  try {
    for (const item of added) {
      const { pending_transaction_id } = item;
      const pendingTransaction = await plaidTransactions.findOne({ userId, transaction_id: pending_transaction_id });

      if (!pendingTransaction) continue;

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
    };
  }
}

async function itemsAdd(itemsToAdd = [], userId, syncId) {
  if (!itemsToAdd.length) return 0;

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
    };
  }
}

async function itemsModify(itemsToModify, userId) {
  if (!itemsToModify?.length) return 0;

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
    };
  }
}

async function itemsRemove(itemsToRemove, userId) {
  if (!itemsToRemove?.length) return 0;

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
    };
  }
}

// Utility functions
const delay = () => new Promise(resolve => setTimeout(resolve, 1000));

function hasSyncError(data) {
  return data.success === false;
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

function initializeNextSyncData(userId, syncData) {
  const currentTime = Date.now();
  return {
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
}

async function notifyUserOfSync(user, syncStats) {
  const nowInPST = new Date(Date.now() - (12 * 60 * 60 * 1000));
  const emailData = {
    subject: `TrackTabs Sync Complete`,
    template: `<p>Your TrackTabs account for ${user.email} has been synced successfully.</p>
    <p>As of ${nowInPST}, all of your transactions are up to date.</p>
    <p>
      <b>Summary</b>
      <br /><b>Custom Info Merged With Settled Items Count:</b> ${syncStats.itemsMergedCount}
      <br /><b>Items Added Count:</b> ${syncStats.itemsAddedCount}
      <br /><b>Items Modified Count:</b> ${syncStats.itemsModifiedCount}
      <br /><b>Items Removed Count:</b> ${syncStats.itemsRemovedCount}
      <br /><b>Sync Sectioned Off:</b> ${syncStats.sectionedOff}
    </p>`
  };

  await notify.email('dev@tracktabs.com', emailData);
}

async function fetchTransactionById(_id, userId) {
  const transaction = await plaidTransactions.findOne(_id);

  if (transaction.userId === userId) {
    return transaction;
  }

  console.warn(`Unauthorized attempt: User ${userId} tried to access Plaid Transaction (${_id}) without proper authorization.`);
  return null;
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

async function removeFromDb(duplicates) {
  duplicates = Array.isArray(duplicates) ? duplicates : [duplicates];
  const idsToRemove = duplicates.splice(0, 25);
  const removed = await data.remove(idsToRemove);

  return {
    removed,
    duplicates
  };
}

async function processSyncForItem(item, userId, encryptionKey, syncResults, queuedItems) {
  const { cursor, lastSyncTime, result, status } = item.syncData;
  const hours = (h) => h * 60 * 60 * 1000;
  const days = (n) => n * 24 * 60 * 60 * 1000;
  const fiveDaysAgo = Date.now() - days(5);

  if(lastSyncTime > Date.now() - hours(4)) {
    return {
      taskAlreadyQueued: true,
      syncedLessThanFourHoursAgo: true,
      itemId: item._id
    };
  }

  if(cursor !== '' && lastSyncTime > fiveDaysAgo && !result.sectionedOff) {
    return await syncTransactionsForItem(item._id, userId, encryptionKey);
  }

  const syncAlreadyInProgress = ['queued', 'in_progress'].includes(status);

  if (syncAlreadyInProgress) {
    return {
      taskAlreadyQueued: true,
      itemId: item._id
    };
  }

  await updatePlaidItemSyncData(item._id, { ...item.syncData, status: 'queued' });
  queuedItems.push(item._id);

  return {
    taskQueued: true,
    itemId: item._id
  };
}

async function updatePlaidItemSyncData(itemId, syncData) {
  syncData.result = syncData.result || {};
  const updated = await plaidItems.update(itemId, { syncData });
  return { itemId, ...updated.syncData };
}

async function handleSyncError(itemId, nextSyncData, { result }, handlerName) {
  try {
    result.errorMessage = `${handlerName}: ${result.errorMessage}`;
    console.error(result);

    await notify.email('dev@tracktabs.com', {
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
    };
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
      isOddRow = !isOddRow;
    }
  }

  errorDetails += '</table>';
  return errorDetails;
}

export async function fetchTransactions(query) {
  return await plaidTransactions.findAll(query);
}

export async function getAllTransactionCount(userId) {
  const allTransactions = await plaidTransactions.findAll({
    userId,
    date: '*'
  });
  return allTransactions.length;
}

export async function findDuplicates(userId) {
  const transactions = await plaidTransactions.findAll({ date: '*', userId });
  return getDuplicateIds(transactions);
}

export default {
  syncTransactionsForItem,
  syncAllUserTransactions,
  buildUserQueryForTransactions,
  fetchTransactionById,
  getDuplicateIds,
  removeFromDb,
  fetchTransactions,
  getAllTransactionCount,
  findDuplicates
}; 