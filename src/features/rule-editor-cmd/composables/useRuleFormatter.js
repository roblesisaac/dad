import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';

export function useRuleFormatter() {
  const { state } = useDashboardState();
  
  /**
   * Format a rule object to a command line representation
   * @param {Object} rule - The rule object to format
   * @returns {Object} - The formatted rule for display
   */
  const formatRuleToCommandLine = (rule) => {
    // Extract rule components
    const [ruleType, property, method, criterion, category] = rule.rule;
    
    // Format tabs
    let tabsString;
    if (rule.applyForTabs.includes('_GLOBAL')) {
      tabsString = '_GLOBAL';
    } else {
      // Get tab names from tab IDs
      const tabNames = rule.applyForTabs.map(tabId => {
        const tab = state.allUserTabs.find(t => t._id === tabId);
        return tab ? tab.tabName : tabId;
      });
      tabsString = tabNames.join(', ');
    }
    
    return {
      type: ruleType,
      property,
      method,
      criterion,
      category: category || '', // Only categorize rules have a category
      tabs: tabsString
    };
  };
  
  /**
   * Format an array of rule objects to command line representations
   * @param {Array} rules - The rule objects to format
   * @returns {Array} - The formatted rules
   */
  const formatRulesToCommandLines = (rules) => {
    return rules.map(rule => formatRuleToCommandLine(rule));
  };
  
  return {
    formatRuleToCommandLine,
    formatRulesToCommandLines
  };
} 