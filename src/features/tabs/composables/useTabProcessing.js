import { nextTick } from 'vue';
import { useUtils } from '@/shared/composables/useUtils.js';
import { useRules } from '@/features/rule-manager/composables/useRules.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';
import { useTabsAPI } from '@/features/tabs/composables/useTabsAPI.js';

export function useTabProcessing() {
  const { state } = useDashboardState();
  const { ruleMethods, combinedRulesForTab } = useRules();
  const { getDayOfWeekPST } = useUtils();
  const tabsAPI = useTabsAPI();
  const months = ['jan', 'feb', 'march', 'april', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'];
  

  function processTabData(tab) {
    const data = state.selected.allGroupTransactions;
    if (!data || !tab) return null;
    
    const tabRules = combinedRulesForTab(tab._id);
    
    // Build rule methods based on tab rules
    const { filter, sort, categorize, groupBy, propToGroupBy } = buildRuleMethods(tabRules);
    
    // Apply sorting
    const dataCopy = sort(data);
    const categorizedItems = [];
    let tabTotal = 0;
    
    // Process each transaction
    for(const item of dataCopy) {
      // Transform amount (negative becomes positive, positive becomes negative)
      item.amount *= -1;
      
      // Apply categorization rules
      categorize(item);
      
      // Determine how to group this item
      const typeToGroupBy = groupBy(item);
      
      // Skip items that don't pass filters
      if(!filter(item)) continue;
      
      // Calculate running total
      const amt = parseFloat(item.amount);
      tabTotal += amt;
      
      // Skip detailed categorization if the tab isn't selected
      if(!tab.isSelected) continue;
      
      // Find or create category group
      const storedCategory = categorizedItems.find(([storedGroupByName]) => 
        storedGroupByName === typeToGroupBy
    );
    
    if(storedCategory) {
      // Add to existing category
      let [_, storedTransactions, storedTotal] = storedCategory;
      storedTransactions.push(item);
      storedCategory[2] = storedTotal + amt;
    } else {
      // Create new category
      categorizedItems.push([typeToGroupBy, [item], amt]);
    }
  }
  
  // Sort the grouped items
  if(!['year', 'month', 'day', 'year_month'].includes(propToGroupBy)) {
    // Sort by amount
    if(tabTotal > 0) {
      categorizedItems.sort((a, b) => b[2] - a[2]);
    } else {
      categorizedItems.sort((a, b) => a[2] - b[2]);
    }
  } else {
    // Sort by date
    categorizedItems.sort(groupByDate);
  }
  
  return { tabTotal, categorizedItems };
  }

  /**
  * Sort function for date-based groupings
  */
  function groupByDate(a, b) {
    const months = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    
    const [yearA, monthA] = a[0].split(' ');
    const [yearB, monthB] = b[0].split(' ');
    
    if (yearA !== yearB) {
      return yearB - yearA;
    } else {
      return months[monthB] - months[monthA];
    }
  }

  /**
  * Extract and organize rules by type
  */
  function extractRules(tabRules) {
    const sorters = [], categorizers = [], filters = [], propToGroupBy = [];
    
    for(const ruleConfig of tabRules) {
      const [ruleType, itemPropName, ruleMethodName, criterion, categorizeAs] = ruleConfig.rule;
      
      const ruleMethod = (item) => {
        const itemValue = getItemValue(item, itemPropName);
        return ruleMethods[ruleMethodName]?.(itemValue, criterion);
      };
      
      const { orderOfExecution, _isImportant } = ruleConfig;
      
      if(ruleType === 'groupBy') {
        propToGroupBy.push(itemPropName);
      }
      
      if(ruleType === 'sort') {
        sorters.push({ itemPropName, orderOfExecution });
      }
      
      if(ruleType === 'categorize') {
        categorizers.push({
          _id: ruleConfig._id,
          method: ruleMethod,
          categorizeAs,
          itemPropName, ruleMethodName, criterion,
          orderOfExecution,
          _isImportant
        });
      }
      
      if(ruleType === 'filter') {
        filters.push({
          method: ruleMethod,
          orderOfExecution,
          _isImportant
        });
      }
    }
    
    return [
      sorters.sort((a,b) => a.orderOfExecution - b.orderOfExecution),
      categorizers.sort((a,b) => a.orderOfExecution - b.orderOfExecution),
      filters.sort((a,b) => a.orderOfExecution - b.orderOfExecution),
      propToGroupBy
    ];
  }

  /**
  * Safely get a property value from an item
  */
  function getItemValue(item, propName) {
    return propName === 'category'
    ? item.personal_finance_category.primary
    : item[propName];
  }

  /**
  * Format the personal finance category for consistency
  */
  function formatPersonalFinanceCategory(item) {
    const { primary } = item.personal_finance_category;
    if(!primary) return 'misc';
    
    const lower = primary.toLowerCase();
    item.personal_finance_category.primary = lower.split('_').join(' ');
  }

  /**
  * Build rule methods for processing tab data
  */
  function buildRuleMethods(tabRules) {
    const [sorters, categorizers, filters, propToGroupBy] = extractRules(tabRules);
    
    return {
      sort: buildSortMethod(sorters),
      categorize: buildCategorizeMethod(categorizers),
      filter: buildFilterMethod(filters),
      groupBy: buildGroupByMethod(propToGroupBy),
      propToGroupBy: propToGroupBy[0] || 'category'
    };
  }

  /**
  * Build a method to sort transaction data
  */
  function buildSortMethod(sorters) {
    return (arrayToSort) => {
      const arrayCopy = arrayToSort.map(item => (JSON.parse(JSON.stringify(item))));
      
      if(!sorters.length) sorters.push({ itemPropName: '-date' });
      
      for(const { itemPropName } of sorters) {
        const isInReverse = itemPropName.startsWith('-');
        const propName = isInReverse ? itemPropName.slice(1) : itemPropName;
        
        arrayCopy.sort((a, b) => {
          const valueA = propName === 'date' ? new Date(a[propName]) : a[propName];
          const valueB = propName === 'date' ? new Date(b[propName]) : b[propName];
          
          return isInReverse ? valueB - valueA : valueA - valueB;
        });
      }
      
      return arrayCopy;
    };
  }

  /**
  * Build a method to categorize transactions
  */
  function buildCategorizeMethod(categorizers) {
    return (item) => {
      // Handle manual recategorization first
      if (item.recategorizeAs) {
        item.personal_finance_category.primary = String(item.recategorizeAs).trim().toLowerCase();
        return item.personal_finance_category.primary;
      }
      
      // Format the initial category
      formatPersonalFinanceCategory(item);
      
      // If no categorizers, return the default category
      if (!categorizers.length) {
        return item.personal_finance_category.primary;
      }
      
      // Track the most important category if found
      let importantCategory = null;
      
      // Apply all categorizers in order
      for (const categorizeConfig of categorizers) {
        if (!categorizeConfig.method) continue;
        
        const conditionMet = categorizeConfig.method(item);
        
        if (conditionMet) {
          const categoryName = categorizeConfig.categorizeAs.toLowerCase();
          
          // Track important categories
          if (categorizeConfig._isImportant) {
            importantCategory = categoryName;
          }
          
          // Track which rules were applied
          item.rulesApplied = item.rulesApplied || new Set();
          if (!item.rulesApplied.has(categorizeConfig._id)) {
            item.rulesApplied.add(categorizeConfig._id);
          }
          
          // Update the category (important categories take precedence)
          item.personal_finance_category.primary = importantCategory || categoryName;
        }
      }
      
      return item.personal_finance_category.primary;
    };
  }

  /**
  * Build a method to filter transactions
  */
  function buildFilterMethod(filters) {
    return (item) => {
      if(!filters.length) return true;
      
      let _isImportant = false;
      
      const itemPassesEveryFilter = filters.every(filterConfig => {
        const filterConditionMet = filterConfig.method(item);
        if(!filterConditionMet) return false;
        _isImportant = filterConfig._isImportant;
        return true;
      });
      
      return itemPassesEveryFilter || _isImportant;
    };
  }

  /**
  * Build a method to group transactions
  */
  function buildGroupByMethod(propToGroupBy) {
    return (item) => {
      return {
        category: () => item.personal_finance_category.primary,
        year: () => {
          const [year] = item.authorized_date.split('-');
          return year;
        },
        month: () => {
          const [_, month] = item.authorized_date.split('-');
          return months[Number(month-1)];
        },
        year_month: () => {
          const [year, month] = item.authorized_date.split('-');
          return `${year} ${months[Number(month-1)]}`;
        },
        day: () => {
          const [_, month, day] = item.authorized_date.split('-');
          return `${months[Number(month-1)]}, ${day}`;
        },
        weekday: () => getDayOfWeekPST(item.authorized_date)
      }[propToGroupBy[0] || 'category']();
    };
  }

  /**
  * Find selected tabs in a group
  */
  function selectedTabsInGroup(tabsForGroup) {
    return tabsForGroup?.filter(tab => tab.isSelected) || [];
  }

  /**
  * Select the first tab in a group
  */
  async function selectFirstTab(tabsForGroup) {
    const firstTab = tabsForGroup[0];
    if (!firstTab) return;
    
    firstTab.isSelected = true;
    await tabsAPI.updateTabSelection(firstTab._id, true);
    return firstTab;
  }

  /**
  * Deselect all tabs except the first one
  */
  async function deselectOtherTabs(selectedTabs) {
    if (!selectedTabs?.length) return;
    
    for(const tab of selectedTabs.splice(1)) {
      tab.isSelected = false;
      await tabsAPI.updateTabSelection(tab._id, false);
    }
  }

  /**
   * Waits until the application is fully initialized before proceeding
   * @param {number} maxWaitTimeMs - Maximum time to wait in milliseconds
   * @param {number} checkIntervalMs - Interval between checks in milliseconds
   * @returns {Promise<boolean>} - Resolves to true when initialized, or false if timeout exceeded
   */
  async function waitUntilAppIsInitialized(maxWaitTimeMs = 10000, checkIntervalMs = 100) {
    if (state.isInitialized) {
      return true;
    }
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkInterval = setInterval(() => {
        // Check if app is initialized
        if (state.isInitialized) {
          clearInterval(checkInterval);
          resolve(true);
          return;
        }
        
        // Check if we've exceeded the maximum wait time
        if (Date.now() - startTime > maxWaitTimeMs) {
          clearInterval(checkInterval);
          console.warn('Timed out waiting for app to initialize');
          resolve(false);
        }
      }, checkIntervalMs);
    });
  }

  /**
  * Process data for all tabs in the selected group
  */
  async function processAllTabsForSelectedGroup() {
    state.isLoading = true;
    const tabsForGroup = state.selected.tabsForGroup;
    if(!tabsForGroup?.length) return;
    
    const selectedTabs = selectedTabsInGroup(tabsForGroup);
    
    if(selectedTabs.length < 1) {
      await selectFirstTab(tabsForGroup);
    }
    
    if(selectedTabs.length > 1) {
      await deselectOtherTabs(selectedTabs);
    }
    
    for(const tab of tabsForGroup) {
      tab.categorizedItems = [];
      const processed = processTabData(tab);
      if (processed) {
        tab.total = processed.tabTotal;
        tab.categorizedItems = processed.categorizedItems;
      }
    }
    
    await nextTick();
    state.isLoading = false;
  }

  /**
   * Efficiently adds new transactions to the current view and processes only affected tabs
   * @param {Array} addedTransactions - New transactions to add
   * @returns {Number} Count of transactions added to view
   */
  async function concatAndProcessTransactions(addedTransactions) {
    try {
      // Wait for app to be initialized before processing transactions
      const isInitialized = await waitUntilAppIsInitialized();
      if (!isInitialized) {
        console.warn('App initialization timeout reached, proceeding with caution');
      }
      
      // Only proceed if we have state, a selected group, and transactions
      if (!state || !state.selected || !state.selected.group || !addedTransactions || !addedTransactions.length) {
        return 0;
      }
      
      const selectedGroup = state.selected.group;
      
      // Get date range from state
      let startDate, endDate;
      
      // Convert date range strings to actual dates
      if (state.date.start === 'firstOfMonth') {
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (state.date.start === 'firstOfYear') {
        const now = new Date();
        startDate = new Date(now.getFullYear(), 0, 1);
      } else {
        startDate = new Date(state.date.start);
      }
      
      if (state.date.end === 'today') {
        endDate = new Date();
      } else {
        endDate = new Date(state.date.end);
      }
      
      // Filter transactions by date range
      const dateFilteredTransactions = addedTransactions.filter(transaction => {
        const txDate = new Date(transaction.date || transaction.authorized_date);
        return txDate >= startDate && txDate <= endDate;
      });
      
      if (dateFilteredTransactions.length === 0) {
        return 0;
      }
      
      // Filter transactions for the selected group
      // Groups have accounts associated with them
      const groupAccounts = selectedGroup.accounts || [];
      const groupAccountIds = Array.isArray(groupAccounts) ? 
        (groupAccounts[0] && typeof groupAccounts[0] === 'object' ? 
          groupAccounts.map(account => account.account_id) : 
          groupAccounts) : 
        [];
      
      const matchingTransactions = dateFilteredTransactions.filter(transaction => {
        // Check if transaction's account is in the selected group
        return groupAccountIds.includes(transaction.account_id);
      });
      
      if (matchingTransactions.length === 0) {
        return 0;
      }
      
      // Initialize allGroupTransactions if it doesn't exist
      if (!state.selected.allGroupTransactions) {
        state.selected.allGroupTransactions = [];
      }
      
      // Add new transactions to the array (avoid duplicates by checking transaction_id)
      const existingIds = new Set(state.selected.allGroupTransactions.map(t => t.transaction_id));
      const newTransactions = matchingTransactions.filter(t => !existingIds.has(t.transaction_id));
      
      if (newTransactions.length === 0) {
        return 0;
      }
      
      // Add new transactions to state
      state.selected.allGroupTransactions = [...state.selected.allGroupTransactions, ...newTransactions];
      
      // Process only tabs in the current group rather than all tabs
      const tabsForGroup = state.selected.tabsForGroup;
      if (!tabsForGroup?.length) {
        return newTransactions.length;
      }
      
      // Only process tabs that are currently visible/selected
      for (const tab of tabsForGroup) {
        if (tab.isSelected) {
          const processed = processTabData(tab);
          if (processed) {
            tab.total = processed.tabTotal;
            tab.categorizedItems = processed.categorizedItems;
          }
        }
      }
      
      await nextTick();
      return newTransactions.length;
    } catch (error) {
      console.error('Error concatenating and processing transactions:', error);
      return 0;
    }
  }

  return {
    processTabData,
    processAllTabsForSelectedGroup,
    concatAndProcessTransactions
  };
}