export function useTransactions(api) {
  async function fetchTransactions(account_id, dateRange) {
    if(!account_id || !dateRange) {
      return;
    }

    const baseUrl = 'plaid/transactions';
    const query = `?account_id=${account_id}&date=${dateRange}`;

    return await api.get(baseUrl+query);
  }

  async function fetchUserTabs() {
    return await api.get('tabs');
  }

  async function fetchUserRules() {
    return await api.get('rules');
  }

  return {
    fetchTransactions,
    fetchUserTabs,
    fetchUserRules
  };
} 