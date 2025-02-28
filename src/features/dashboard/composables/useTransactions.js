import { useUtils } from './useUtils.js';
import { useApi } from '@/shared/composables/useApi.js';

export function useTransactions() {
  const api = useApi();
  const { extractDateRange } = useUtils();

  /**
   * Fetch transactions for a specific account and date range
   */
  async function fetchTransactions(account_id, dateRange) {
    if(!account_id || !dateRange) {
      return [];
    }

    const baseUrl = 'plaid/transactions';
    const query = `?account_id=${account_id}&date=${dateRange}`;

    return await api.get(baseUrl+query);
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