import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';

export function useRuleParser() {
  const { state } = useDashboardState();
  
  /**
   * Parse command parts to a rule object
   * @param {Object} commandParts - The parts of the command
   * @param {Object} originalRule - Original rule for editing (optional)
   * @returns {Object} - The rule object
   */
  const parseCommandToRule = (commandParts, originalRule = null) => {
    // Extract command parts
    const { type, category, property, method, criterion, tabs } = commandParts;
    
    // Create rule array based on rule type
    let ruleArray;
    if (type === 'categorize') {
      ruleArray = [type, property, method, criterion, category];
    } else {
      ruleArray = [type, property, method, criterion];
    }
    
    // Parse tabs
    const tabIds = [];
    if (tabs === '_GLOBAL') {
      tabIds.push('_GLOBAL');
    } else {
      // Split tab names by comma
      const tabNames = tabs.split(',').map(t => t.trim());
      
      // Convert tab names to tab IDs
      tabNames.forEach(tabName => {
        if (tabName === '_GLOBAL') {
          tabIds.push('_GLOBAL');
        } else {
          const tab = state.allUserTabs.find(t => t.tabName === tabName);
          if (tab) {
            tabIds.push(tab._id);
          }
        }
      });
      
      // Fallback to the current tab if no tabs were found
      if (tabIds.length === 0 && state.selected.tab) {
        tabIds.push(state.selected.tab._id);
      }
    }
    
    // If editing an existing rule, preserve the ID and other metadata
    if (originalRule) {
      return {
        ...originalRule,
        rule: ruleArray,
        applyForTabs: tabIds
      };
    }
    
    // Create new rule object
    return {
      rule: ruleArray,
      applyForTabs: tabIds,
      _isImportant: false,
      orderOfExecution: getNextOrderOfExecution(type)
    };
  };
  
  /**
   * Convert a rule object to command parts format
   * @param {Object} rule - The rule object to convert
   * @returns {Object} - The command parts object
   */
  const parseRuleToCommand = (rule) => {
    const [type, property, method, criterion, category] = rule.rule;
    
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
      type,
      property,
      method,
      criterion,
      category: category || '',
      tabs: tabsString
    };
  };
  
  /**
   * Get the next order of execution for a given rule type
   * @param {string} ruleType - The rule type
   * @returns {number} - The next order of execution
   */
  const getNextOrderOfExecution = (ruleType) => {
    const rulesOfType = state.allUserRules.filter(rule => rule.rule[0] === ruleType);
    
    if (rulesOfType.length === 0) {
      return 0;
    }
    
    // Find the highest order of execution
    return Math.max(...rulesOfType.map(rule => rule.orderOfExecution || 0)) + 1;
  };
  
  return {
    parseCommandToRule,
    parseRuleToCommand
  };
} 