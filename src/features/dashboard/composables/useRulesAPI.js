import { useApi } from '@/shared/composables/useApi';

/**
 * Rules API operations
 * This composable handles all API interactions related to rules
 */
export function useRulesAPI() {
  const api = useApi();

  /**
   * Fetch all rules for the current user
   */
  async function fetchUserRules() {
    return await api.get('rules');
  }

  /**
   * Create a new rule
   */
  async function createRule(ruleData) {
    return await api.post('rules', ruleData);
  }

  /**
   * Update a rule
   */
  async function updateRule(ruleId, updateData) {
    return await api.put(`rules/${ruleId}`, updateData);
  }

  /**
   * Update only the order of execution for a rule
   */
  async function updateRuleOrder(ruleId, orderOfExecution) {
    return await api.put(`rules/${ruleId}`, { orderOfExecution });
  }

  /**
   * Delete a rule
   */
  async function deleteRule(ruleId) {
    return await api.delete(`rules/${ruleId}`);
  }

  return {
    fetchUserRules,
    createRule,
    updateRule,
    updateRuleOrder,
    deleteRule
  };
} 