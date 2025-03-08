import { ref } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useRulesAPI } from '@/features/dashboard/composables/useRulesAPI';
import { useTabProcessing } from '@/features/tabs/composables/useTabProcessing';

export function useRuleManager() {
  const { state } = useDashboardState();
  const { processAllTabsForSelectedGroup } = useTabProcessing();
  const rulesAPI = useRulesAPI();
  const isLoading = ref(false);
  const error = ref(null);
  
  /**
   * Create a new rule
   * @param {Object} rule - Rule object to create
   */
  async function createRule(rule) {
    isLoading.value = true;
    error.value = null;
    
    try {
      state.blueBar.message = 'Creating rule...';
      state.blueBar.loading = true;
      
      const createdRule = await rulesAPI.createRule(rule);
      
      if (createdRule) {
        state.allUserRules.push(createdRule);
        
        // Process all tabs for the selected group with the new rule
        await processAllTabsForSelectedGroup();
        
        return createdRule;
      } else {
        throw new Error('Failed to create rule');
      }
    } catch (err) {
      error.value = err.message || 'Failed to create rule';
      console.error('Error creating rule:', err);
      return null;
    } finally {
      isLoading.value = false;
      state.blueBar.loading = false;
      state.blueBar.message = '';
    }
  }
  
  /**
   * Update an existing rule
   * @param {Object} rule - Updated rule object
   */
  async function updateRule(rule) {
    isLoading.value = true;
    error.value = null;
    
    try {
      state.blueBar.message = 'Updating rule...';
      state.blueBar.loading = true;
      
      const updatedRule = await rulesAPI.updateRule(rule._id, rule);
      
      if (updatedRule) {
        // Update the rule in the state
        const index = state.allUserRules.findIndex(r => r._id === updatedRule._id);
        if (index !== -1) {
          state.allUserRules[index] = updatedRule;
        }
        
        // Process all tabs for the selected group with the updated rule
        await processAllTabsForSelectedGroup();
        
        return updatedRule;
      } else {
        throw new Error('Failed to update rule');
      }
    } catch (err) {
      error.value = err.message || 'Failed to update rule';
      console.error('Error updating rule:', err);
      return null;
    } finally {
      isLoading.value = false;
      state.blueBar.loading = false;
      state.blueBar.message = '';
    }
  }
  
  /**
   * Delete a rule by ID
   * @param {String} ruleId - ID of the rule to delete
   */
  async function deleteRuleById(ruleId) {
    isLoading.value = true;
    error.value = null;
    
    try {
      state.blueBar.message = 'Deleting rule...';
      state.blueBar.loading = true;
      
      const success = await rulesAPI.deleteRule(ruleId);
      
      if (success) {
        // Remove the rule from the state
        state.allUserRules = state.allUserRules.filter(rule => rule._id !== ruleId);
        
        // Process all tabs for the selected group after rule deletion
        await processAllTabsForSelectedGroup();
        
        return true;
      } else {
        throw new Error('Failed to delete rule');
      }
    } catch (err) {
      error.value = err.message || 'Failed to delete rule';
      console.error('Error deleting rule:', err);
      return false;
    } finally {
      isLoading.value = false;
      state.blueBar.loading = false;
      state.blueBar.message = '';
    }
  }
  
  /**
   * Intuitively enable or disable a rule based on tab context
   * @param {Object} rule - Rule object to toggle
   * @param {Boolean} enable - Whether to enable or disable the rule
   */
  async function toggleRuleContext(rule, enable) {
    const updatedRule = { ...rule };
    const currentTabId = state.selected.tab?._id;
    
    if (!currentTabId) {
      // If no tab is selected, we can't do much
      return rule;
    }
    
    // Clone the applyForTabs array to avoid modifying the original
    updatedRule.applyForTabs = [...rule.applyForTabs];
    
    if (enable) {
      // Enabling a rule makes it apply to the current tab context
      if (!updatedRule.applyForTabs.includes(currentTabId)) {
        updatedRule.applyForTabs.push(currentTabId);
      }
    } else {
      // Disabling a rule
      if (updatedRule.applyForTabs.includes('_GLOBAL')) {
        // If it's a global rule, we need to be more explicit
        // Remove _GLOBAL and add all other tabs except the current one
        updatedRule.applyForTabs = updatedRule.applyForTabs.filter(id => id !== '_GLOBAL');
        
        // Add all other tabs
        const otherTabIds = state.allUserTabs
          .map(tab => tab._id)
          .filter(tabId => tabId !== currentTabId);
          
        updatedRule.applyForTabs = [...updatedRule.applyForTabs, ...otherTabIds];
        
        // Remove duplicates
        updatedRule.applyForTabs = [...new Set(updatedRule.applyForTabs)];
      } else {
        // If it's a tab-specific rule, remove the current tab
        updatedRule.applyForTabs = updatedRule.applyForTabs.filter(tabId => 
          tabId !== currentTabId
        );
      }
    }
    
    const result = await updateRule(updatedRule);
    return result;
  }
  
  /**
   * Update the order of execution for a rule
   * @param {String} ruleId - ID of the rule
   * @param {Number} orderOfExecution - New order value
   */
  async function updateRuleOrder(ruleId, orderOfExecution) {
    try {
      await rulesAPI.updateRuleOrder(ruleId, orderOfExecution);
      
      // Update in state
      const rule = state.allUserRules.find(r => r._id === ruleId);
      if (rule) {
        rule.orderOfExecution = orderOfExecution;
      }
      
      // Process all tabs for the selected group with the reordered rule
      await processAllTabsForSelectedGroup();
      
      return true;
    } catch (err) {
      console.error('Error updating rule order:', err);
      return false;
    }
  }
  
  /**
   * Add a tab ID to the applyForTabs array
   * @param {String} ruleId - ID of the rule
   * @param {String} tabId - ID of the tab to add
   */
  async function addTabToRule(ruleId, tabId) {
    const rule = state.allUserRules.find(r => r._id === ruleId);
    if (!rule) return null;
    
    // Check if the tab ID is already in the array
    if (rule.applyForTabs.includes(tabId)) {
      return rule;
    }
    
    const applyForTabs = [...rule.applyForTabs, tabId];
    const updatedRule = { ...rule, applyForTabs };
    return updateRule(updatedRule);
    // Note: processAllTabsForSelectedGroup is called inside updateRule
  }
  
  /**
   * Remove a tab ID from the applyForTabs array
   * @param {String} ruleId - ID of the rule
   * @param {String} tabId - ID of the tab to remove
   */
  async function removeTabFromRule(ruleId, tabId) {
    const rule = state.allUserRules.find(r => r._id === ruleId);
    if (!rule) return null;
    
    // Filter out the tab ID
    const applyForTabs = rule.applyForTabs.filter(id => id !== tabId);
    const updatedRule = { ...rule, applyForTabs };
    return updateRule(updatedRule);
    // Note: processAllTabsForSelectedGroup is called inside updateRule
  }
  
  /**
   * Toggle a rule between global and tab-specific
   * @param {String} ruleId - ID of the rule
   * @param {Boolean} isGlobal - Whether the rule should be global
   */
  async function toggleRuleGlobal(ruleId, isGlobal) {
    const rule = state.allUserRules.find(r => r._id === ruleId);
    if (!rule) return null;
    
    let applyForTabs = [...rule.applyForTabs];
    
    if (isGlobal) {
      // Add _GLOBAL if it doesn't exist
      if (!applyForTabs.includes('_GLOBAL')) {
        applyForTabs.push('_GLOBAL');
      }
    } else {
      // Remove _GLOBAL if it exists
      applyForTabs = applyForTabs.filter(id => id !== '_GLOBAL');
    }
    
    const updatedRule = { ...rule, applyForTabs };
    return updateRule(updatedRule);
    // Note: processAllTabsForSelectedGroup is called inside updateRule
  }
  
  return {
    isLoading,
    error,
    createRule,
    updateRule,
    deleteRuleById,
    toggleRuleContext,
    updateRuleOrder,
    addTabToRule,
    removeTabFromRule,
    toggleRuleGlobal
  };
} 