import { useUtils } from '../../../shared/composables/useUtils.js';
import { useApi } from '@/shared/composables/useApi.js';

const ACCOUNT_DATE_IN_FLIGHT_REQUESTS = new Map();
const ACCOUNT_DATE_RESPONSE_CACHE = new Map();
const REQUEST_CACHE_TTL_MS = 10000;
const DATE_RANGE_BATCH_MONTHS = 4;

export function useTransactions() {
  const api = useApi();
  const { extractDateRange } = useUtils();
  const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  function buildRequestCacheKey(account_id, dateRange) {
    return `${account_id || ''}|${dateRange || ''}`;
  }

  function getCachedResponse(cacheKey) {
    const cached = ACCOUNT_DATE_RESPONSE_CACHE.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      ACCOUNT_DATE_RESPONSE_CACHE.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  function isIsoDate(dateString) {
    return typeof dateString === 'string' && ISO_DATE_PATTERN.test(dateString);
  }

  function parseDateRange(dateRange) {
    if (!dateRange || typeof dateRange !== 'string') {
      return null;
    }

    const [startRaw, endRaw] = dateRange.split('_');
    const start = startRaw?.trim();
    const end = endRaw?.trim();

    if (!isIsoDate(start) || !isIsoDate(end)) {
      return null;
    }

    return { start, end };
  }

  function toUtcDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function formatUtcDate(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function buildMultiMonthDateRanges(startDate, endDate, monthsPerBatch = DATE_RANGE_BATCH_MONTHS) {
    const start = toUtcDate(startDate);
    const end = toUtcDate(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return [`${startDate}_${endDate}`];
    }

    const ranges = [];
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

    while (cursor <= end) {
      const batchStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
      const batchEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + monthsPerBatch, 0));

      const chunkStartDate = batchStart < start ? start : batchStart;
      const chunkEndDate = batchEnd > end ? end : batchEnd;

      ranges.push(`${formatUtcDate(chunkStartDate)}_${formatUtcDate(chunkEndDate)}`);
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + monthsPerBatch, 1));
    }

    return ranges.length ? ranges : [`${startDate}_${endDate}`];
  }

  function getBatchedDateRanges(dateRange) {
    const parsedRange = parseDateRange(dateRange);

    if (!parsedRange) {
      return [dateRange];
    }

    return buildMultiMonthDateRanges(parsedRange.start, parsedRange.end);
  }

  function dedupeTransactions(transactions = []) {
    const deduped = new Map();

    transactions.forEach((transaction) => {
      if (!transaction) {
        return;
      }

      const key = transaction.transaction_id
        || `${transaction.account_id || ''}-${transaction.authorized_date || transaction.date || ''}-${transaction.amount || ''}-${transaction.name || ''}`;

      deduped.set(key, transaction);
    });

    return [...deduped.values()];
  }

  async function fetchTransactionsForDateRange(account_id, dateRange, options = {}) {
    const { forceRefresh = false } = options;
    const baseUrl = 'plaid/transactions';
    const query = `?account_id=${encodeURIComponent(account_id)}&date=${encodeURIComponent(dateRange)}`;
    const requestUrl = baseUrl + query;
    const cacheKey = buildRequestCacheKey(account_id, dateRange);

    if (!forceRefresh) {
      const cachedResponse = getCachedResponse(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }

      const inFlightRequest = ACCOUNT_DATE_IN_FLIGHT_REQUESTS.get(cacheKey);
      if (inFlightRequest) {
        return await inFlightRequest;
      }
    }

    const requestPromise = (async () => {
      const response = await api.get(requestUrl);
      const safeResponse = Array.isArray(response) ? response : [];
      ACCOUNT_DATE_RESPONSE_CACHE.set(cacheKey, {
        data: safeResponse,
        expiresAt: Date.now() + REQUEST_CACHE_TTL_MS
      });
      return safeResponse;
    })();

    ACCOUNT_DATE_IN_FLIGHT_REQUESTS.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      if (ACCOUNT_DATE_IN_FLIGHT_REQUESTS.get(cacheKey) === requestPromise) {
        ACCOUNT_DATE_IN_FLIGHT_REQUESTS.delete(cacheKey);
      }
    }
  }

  /**
   * Fetch transactions for a specific account and date range
   */
  async function fetchTransactions(account_id, dateRange, options = {}) {
    if(!account_id || !dateRange) {
      return [];
    }

    const { onBatchComplete } = options;
    const batchedDateRanges = getBatchedDateRanges(dateRange);
    const [singleRange] = batchedDateRanges;

    if (batchedDateRanges.length <= 1) {
      const result = await fetchTransactionsForDateRange(account_id, singleRange, options);
      if (typeof onBatchComplete === 'function') {
        onBatchComplete({
          accountId: account_id,
          batchIndex: 1,
          totalBatches: 1,
          range: singleRange
        });
      }

      return result;
    }

    const allTransactions = [];

    for (let batchIndex = 0; batchIndex < batchedDateRanges.length; batchIndex++) {
      const batchRange = batchedDateRanges[batchIndex];
      let result;
      try {
        result = await fetchTransactionsForDateRange(account_id, batchRange, options);
      } catch (error) {
        throw new Error(`Failed to load account ${account_id} for range ${batchRange}: ${error.message}`);
      }

      if (Array.isArray(result) && result.length) {
        allTransactions.push(...result);
      }

      if (typeof onBatchComplete === 'function') {
        onBatchComplete({
          accountId: account_id,
          batchIndex: batchIndex + 1,
          totalBatches: batchedDateRanges.length,
          range: batchRange
        });
      }
    }

    return dedupeTransactions(allTransactions);
  }

  /**
   * Fetch all transactions for all accounts in a group
   */
  async function fetchTransactionsForGroup(group, dateRangeState, options = {}) {
    if (!group || !group.accounts || !group.accounts.length) {
      return [];
    }

    const { onProgress, onBatchComplete } = options;
    const dateRange = extractDateRange(dateRangeState);
    const batchedDateRanges = getBatchedDateRanges(dateRange);
    const batchesPerAccount = batchedDateRanges.length || 1;

    let allTransactions = [];
    let completedFetches = 0;

    const uniqueAccountIds = [...new Set(
      group.accounts
        .map(account => account?.account_id)
        .filter(Boolean)
    )];

    const totalAccounts = uniqueAccountIds.length;
    const totalFetches = totalAccounts * batchesPerAccount;

    if (typeof onProgress === 'function') {
      onProgress({
        accountId: null,
        accountIndex: 0,
        totalAccounts,
        batchIndex: 0,
        totalBatches: batchesPerAccount,
        range: null,
        completedFetches: 0,
        totalFetches,
        percentage: totalFetches > 0 ? 0 : 100
      });
    }

    for (let accountIndex = 0; accountIndex < uniqueAccountIds.length; accountIndex++) {
      const accountId = uniqueAccountIds[accountIndex];

      const transactions = await fetchTransactions(accountId, dateRange, {
        ...options,
        onBatchComplete: (batchProgress) => {
          completedFetches += 1;
          const percentage = totalFetches > 0
            ? Math.round((completedFetches / totalFetches) * 100)
            : 100;

          const progress = {
            ...batchProgress,
            accountId,
            accountIndex: accountIndex + 1,
            totalAccounts,
            completedFetches,
            totalFetches,
            percentage
          };

          if (typeof onBatchComplete === 'function') {
            onBatchComplete(progress);
          }

          if (typeof onProgress === 'function') {
            onProgress(progress);
          }
        }
      });

      if (transactions && transactions.length) {
        allTransactions = [...allTransactions, ...transactions];
      }
    }

    return allTransactions;
  }

  return {
    fetchTransactions,
    fetchTransactionsForGroup
  };
}
