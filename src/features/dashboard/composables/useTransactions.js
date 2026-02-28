import { useUtils } from '../../../shared/composables/useUtils.js';
import { useApi } from '@/shared/composables/useApi.js';

const ACCOUNT_DATE_IN_FLIGHT_REQUESTS = new Map();
const ACCOUNT_DATE_RESPONSE_CACHE = new Map();
const REQUEST_CACHE_TTL_MS = 10000;

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

  function buildMonthlyDateRanges(startDate, endDate) {
    const start = toUtcDate(startDate);
    const end = toUtcDate(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return [`${startDate}_${endDate}`];
    }

    const ranges = [];
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

    while (cursor <= end) {
      const monthStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
      const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));

      const chunkStartDate = monthStart < start ? start : monthStart;
      const chunkEndDate = monthEnd > end ? end : monthEnd;

      ranges.push(`${formatUtcDate(chunkStartDate)}_${formatUtcDate(chunkEndDate)}`);
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }

    return ranges.length ? ranges : [`${startDate}_${endDate}`];
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

    const parsedRange = parseDateRange(dateRange);

    if (!parsedRange) {
      return await fetchTransactionsForDateRange(account_id, dateRange, options);
    }

    const monthlyRanges = buildMonthlyDateRanges(parsedRange.start, parsedRange.end);

    if (monthlyRanges.length <= 1) {
      return await fetchTransactionsForDateRange(account_id, dateRange, options);
    }

    const allTransactions = [];

    for (const monthlyRange of monthlyRanges) {
      let result;
      try {
        result = await fetchTransactionsForDateRange(account_id, monthlyRange, options);
      } catch (error) {
        throw new Error(`Failed to load account ${account_id} for range ${monthlyRange}: ${error.message}`);
      }

      if (Array.isArray(result) && result.length) {
        allTransactions.push(...result);
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
    
    const dateRange = extractDateRange(dateRangeState);
    let allTransactions = [];
    const uniqueAccountIds = [...new Set(
      group.accounts
        .map(account => account?.account_id)
        .filter(Boolean)
    )];

    for (const accountId of uniqueAccountIds) {
      const transactions = await fetchTransactions(accountId, dateRange, options);
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
