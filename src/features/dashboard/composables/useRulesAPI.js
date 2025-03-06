/**
 * Rules API operations
 * This composable handles all API interactions related to rules
 */
export function useRulesAPI(api) {
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
  async function updateRuleOrder(ruleId, ruleData) {
    // Only send the minimal data needed for order update
    const orderUpdateData = {
      _id: ruleData._id,
      orderOfExecution: ruleData.orderOfExecution
    };
    return await api.put(`rules/${ruleId}/order`, orderUpdateData);
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