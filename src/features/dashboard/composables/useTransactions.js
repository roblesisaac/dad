import { useUtils } from '../../../shared/composables/useUtils.js';
import { useApi } from '@/shared/composables/useApi.js';

export function useTransactions() {
  const api = useApi();
  const { extractDateRange } = useUtils();
  const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

  async function fetchTransactionsForDateRange(account_id, dateRange) {
    const baseUrl = 'plaid/transactions';
    const query = `?account_id=${encodeURIComponent(account_id)}&date=${encodeURIComponent(dateRange)}`;
    return await api.get(baseUrl + query);
  }

  /**
   * Fetch transactions for a specific account and date range
   */
  async function fetchTransactions(account_id, dateRange) {
    if(!account_id || !dateRange) {
      return [];
    }

    const parsedRange = parseDateRange(dateRange);

    if (!parsedRange) {
      return await fetchTransactionsForDateRange(account_id, dateRange);
    }

    const monthlyRanges = buildMonthlyDateRanges(parsedRange.start, parsedRange.end);

    if (monthlyRanges.length <= 1) {
      return await fetchTransactionsForDateRange(account_id, dateRange);
    }

    const allTransactions = [];

    for (const monthlyRange of monthlyRanges) {
      let result;
      try {
        result = await fetchTransactionsForDateRange(account_id, monthlyRange);
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
  async function fetchTransactionsForGroup(group, dateRangeState) {
    if (!group || !group.accounts || !group.accounts.length) {
      return [];
    }
    
    const dateRange = extractDateRange(dateRangeState);
    let allTransactions = [];

    for (const account of group.accounts) {
      const transactions = await fetchTransactions(account.account_id, dateRange);
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
