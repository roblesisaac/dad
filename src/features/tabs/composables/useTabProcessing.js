import { nextTick } from 'vue';
import { parseISO, isValid, startOfMonth, startOfYear } from 'date-fns';
import { useUtils } from '@/shared/composables/useUtils.js';
import { useTabRules } from '@/features/tabs/composables/useTabRules.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';
import { evaluateTabData } from '@/features/tabs/utils/tabEvaluator.js';

/**
 * Convert a date value to a Date object.
 * Extracted here to avoid circular dependency with useDate composable.
 */
function convertToDate(dateValue) {
  if (!dateValue) return new Date();
  if (dateValue === 'firstOfMonth') return startOfMonth(new Date());
  if (dateValue === 'firstOfYear') return startOfYear(new Date());
  if (dateValue === 'today') return new Date();
  if (typeof dateValue === 'string') {
    const parsed = parseISO(dateValue);
    return isValid(parsed) ? parsed : new Date();
  }
  if (dateValue instanceof Date) return dateValue;
  return new Date();
}

export function useTabProcessing() {
  const { state } = useDashboardState();
  const { ruleMethods, combinedRulesForTab } = useTabRules();
  const { getDayOfWeekPST } = useUtils();
  const months = ['jan', 'feb', 'march', 'april', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'];


  function processTabData(tab) {
    const data = state.selected.allGroupTransactions;
    if (!data || !tab) return null;

    const tabRules = combinedRulesForTab(tab._id);

    return evaluateTabData({
      tab,
      transactions: data,
      tabRules,
      ruleMethods,
      getDayOfWeekPST,
      months
    });
  }

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

  function normalizeSortPropertyName(itemPropName) {
    return String(itemPropName || '').trim().replace(/^-/, '');
  }

  function buildSortPropertyName(itemPropName, sortDirection) {
    const rawSortPropertyName = String(itemPropName || '').trim();
    const normalizedSortPropertyName = normalizeSortPropertyName(rawSortPropertyName);
    const normalizedSortDirection = String(sortDirection || '').toLowerCase();

    if (!normalizedSortPropertyName) {
      return '';
    }

    const sortDescending = normalizedSortDirection === 'desc'
      || (normalizedSortDirection !== 'asc' && rawSortPropertyName.startsWith('-'));

    return sortDescending
      ? `-${normalizedSortPropertyName}`
      : normalizedSortPropertyName;
  }

  function extractRules(tabRules) {
    const sorters = [], categorizers = [], filters = [], propToGroupBy = [];

    for (const ruleConfig of tabRules) {
      const rule = Array.isArray(ruleConfig.rule) ? ruleConfig.rule : [];
      const [
        ruleType,
        itemPropName,
        ruleMethodName,
        criterion,
        categorizeAs
      ] = rule;

      const ruleConditions = extractRuleConditions(rule);

      const ruleMethod = buildRuleMethod(ruleConditions);

      const { orderOfExecution, _isImportant } = ruleConfig;

      if (ruleType === 'groupBy') {
        propToGroupBy.push(itemPropName);
      }

      if (ruleType === 'sort') {
        sorters.push({
          itemPropName: buildSortPropertyName(itemPropName, ruleMethodName),
          orderOfExecution
        });
      }

      if (ruleType === 'categorize') {
        categorizers.push({
          _id: ruleConfig._id,
          method: ruleMethod,
          categorizeAs,
          itemPropName, ruleMethodName, criterion,
          ruleConditions,
          orderOfExecution,
          _isImportant
        });
      }

      if (ruleType === 'filter') {
        filters.push({
          method: ruleMethod,
          filterJoinOperator: normalizeFilterJoinOperator(ruleConfig.filterJoinOperator),
          orderOfExecution
        });
      }
    }

    return [
      sorters.sort((a, b) => a.orderOfExecution - b.orderOfExecution),
      categorizers.sort((a, b) => a.orderOfExecution - b.orderOfExecution),
      filters.sort((a, b) => a.orderOfExecution - b.orderOfExecution),
      propToGroupBy
    ];
  }

  function extractRuleConditions(rule) {
    const conditions = [{
      itemPropName: rule[1],
      ruleMethodName: rule[2],
      criterion: rule[3]
    }];

    for (let i = 5; i < rule.length; i += 4) {
      const combinator = String(rule[i] || '').toLowerCase();
      const itemPropName = rule[i + 1];
      const ruleMethodName = rule[i + 2];
      const criterion = rule[i + 3];

      if (combinator !== 'and') {
        continue;
      }

      conditions.push({
        itemPropName,
        ruleMethodName,
        criterion
      });
    }

    return conditions;
  }

  function buildRuleMethod(ruleConditions) {
    const conditionMethods = ruleConditions
      .map(({ itemPropName, ruleMethodName, criterion }) =>
        buildConditionMethod(itemPropName, ruleMethodName, criterion)
      )
      .filter(Boolean);

    if (!conditionMethods.length) {
      return () => false;
    }

    return (item) => conditionMethods.every(conditionMethod => conditionMethod(item));
  }

  function buildConditionMethod(itemPropName, ruleMethodName, criterion) {
    if (!itemPropName || !ruleMethodName) {
      return null;
    }

    return (item) => {
      const itemValue = getItemValue(item, itemPropName);
      const method = ruleMethods[ruleMethodName];

      if (!method) {
        return false;
      }

      return method(itemValue, criterion);
    };
  }

  function normalizeFilterJoinOperator(filterJoinOperator) {
    return String(filterJoinOperator || '').toLowerCase() === 'or'
      ? 'or'
      : 'and';
  }

  function getItemValue(item, propName) {
    if (propName === 'date') {
      return item.authorized_date || item.date;
    }

    return propName === 'category'
      ? item.personal_finance_category?.primary
      : item[propName];
  }

  function formatPersonalFinanceCategory(item) {
    const { primary } = item.personal_finance_category;
    if (!primary) return 'misc';

    const lower = primary.toLowerCase();
    item.personal_finance_category.primary = lower.split('_').join(' ');
  }

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

  function buildSortMethod(sorters) {
    return (arrayToSort) => {
      const arrayCopy = arrayToSort.map(item => (JSON.parse(JSON.stringify(item))));

      if (!sorters.length) sorters.push({ itemPropName: '-date' });

      for (const { itemPropName } of sorters) {
        const isInReverse = itemPropName.startsWith('-');
        const propName = isInReverse ? itemPropName.slice(1) : itemPropName;

        arrayCopy.sort((a, b) => {
          const valueA = getItemValue(a, propName);
          const valueB = getItemValue(b, propName);
          const numberA = Number(valueA);
          const numberB = Number(valueB);

          let sortResult = 0;
          if (Number.isFinite(numberA) && Number.isFinite(numberB)) {
            sortResult = numberA - numberB;
          } else {
            const dateA = new Date(valueA);
            const dateB = new Date(valueB);
            const dateATimestamp = dateA.getTime();
            const dateBTimestamp = dateB.getTime();

            if (!Number.isNaN(dateATimestamp) && !Number.isNaN(dateBTimestamp)) {
              sortResult = dateATimestamp - dateBTimestamp;
            } else {
              sortResult = String(valueA ?? '').toLowerCase()
                .localeCompare(String(valueB ?? '').toLowerCase());
            }
          }

          return isInReverse ? -sortResult : sortResult;
        });
      }

      return arrayCopy;
    };
  }

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

  function buildFilterMethod(filters) {
    const filterGroups = groupFiltersByOr(filters);

    return (item) => {
      if (!filters.length) return true;

      return filterGroups.some(filterGroup =>
        filterGroup.every(filterConfig => filterConfig.method(item))
      );
    };
  }

  function groupFiltersByOr(filters) {
    if (!filters.length) {
      return [];
    }

    const groupedFilters = [];
    let currentGroup = [];

    filters.forEach((filterConfig, index) => {
      const joinOperator = index === 0
        ? 'and'
        : normalizeFilterJoinOperator(filterConfig.filterJoinOperator);

      if (joinOperator === 'or' && currentGroup.length) {
        groupedFilters.push(currentGroup);
        currentGroup = [filterConfig];
        return;
      }

      currentGroup.push(filterConfig);
    });

    if (currentGroup.length) {
      groupedFilters.push(currentGroup);
    }

    return groupedFilters;
  }

  function buildGroupByMethod(propToGroupByArray) {

    const groupByMethods = {
      category: (item) => item.personal_finance_category.primary,
      year: (item) => {
        const [year] = item.authorized_date.split('-');
        return year;
      },
      month: (item) => {
        const [_, month] = item.authorized_date.split('-');
        return months[Number(month - 1)];
      },
      year_month: (item) => {
        const [year, month] = item.authorized_date.split('-');
        return `${year} ${months[Number(month - 1)]}`;
      },
      day: (item) => {
        const [_, month, day] = item.authorized_date.split('-');
        return `${months[Number(month - 1)]}, ${day}`;
      },
      date: (item) => {
        const [_, month, day] = item.authorized_date.split('-');
        return `${months[Number(month - 1)]}, ${day}`;
      },
      weekday: (item) => getDayOfWeekPST(item.authorized_date)
    };

    const propToGroupBy = propToGroupByArray[0];
    const groupByMethod = groupByMethods[propToGroupBy];

    if (!groupByMethod) {
      return (item) => groupByMethods.category(item);
    }

    return (item) => groupByMethod(item);
  }

  function selectedTabsInGroup(tabsForGroup) {
    return tabsForGroup?.filter(tab => tab.isSelected) || [];
  }

  function deselectOtherTabs(selectedTabs) {
    if (!selectedTabs?.length) return;

    for (const tab of selectedTabs.slice(1)) {
      tab.isSelected = false;
      tab.categorizedItems = [];
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

  async function processAllTabsForSelectedGroup(options = {}) {
    const { showLoading = true } = options;
    if (showLoading) {
      state.isLoading = true;
    }

    try {
      const tabsForGroup = state.selected.tabsForGroup;
      if (!tabsForGroup?.length) {
        return;
      }

      const selectedTabs = selectedTabsInGroup(tabsForGroup);
      if (selectedTabs.length > 1) {
        deselectOtherTabs(selectedTabs);
      }

      const processedTabData = tabsForGroup.map((tab) => ({
        tab,
        processed: processTabData(tab)
      }));

      for (const { tab, processed } of processedTabData) {
        if (!processed) {
          continue;
        }

        tab.total = processed.tabTotal;
        tab.categorizedItems = processed.categorizedItems;
      }

      await nextTick();
    } finally {
      if (showLoading) {
        state.isLoading = false;
      }
    }
  }

  function getTransactionKey(transaction) {
    if (!transaction) return null;

    return transaction.transaction_id
      || `${transaction.account_id || ''}-${transaction.authorized_date || transaction.date || ''}-${transaction.amount || ''}-${transaction.name || ''}`;
  }

  function getGroupAccountIds(group) {
    const accounts = Array.isArray(group?.accounts) ? group.accounts : [];
    return new Set(accounts
      .map((account) => (typeof account === 'object' ? account?.account_id : account))
      .filter(Boolean));
  }

  function matchesSelectedGroupAndDateRange(transaction, groupAccountIds, startDate, endDate) {
    if (!transaction?.account_id || !groupAccountIds.has(transaction.account_id)) {
      return false;
    }

    const txDate = new Date(transaction.date || transaction.authorized_date);
    if (Number.isNaN(txDate.getTime())) {
      return false;
    }

    return txDate >= startDate && txDate <= endDate;
  }

  function normalizeDeltaTransactions(deltaTransactions) {
    if (!Array.isArray(deltaTransactions)) {
      return [];
    }

    return deltaTransactions.filter(Boolean);
  }

  async function applyTransactionSyncDelta(delta = {}, options = {}) {
    const { showLoading = false } = options;

    try {
      const isInitialized = await waitUntilAppIsInitialized();
      if (!isInitialized) {
        console.warn('App initialization timeout reached, proceeding with caution');
      }

      const selectedGroup = state?.selected?.group;
      if (!selectedGroup) {
        return { added: 0, modified: 0, removed: 0, totalChanged: 0 };
      }

      const addedTransactions = normalizeDeltaTransactions(delta.addedTransactions);
      const modifiedTransactions = normalizeDeltaTransactions(delta.modifiedTransactions);
      const removedTransactions = normalizeDeltaTransactions(delta.removedTransactions);

      if (!addedTransactions.length && !modifiedTransactions.length && !removedTransactions.length) {
        return { added: 0, modified: 0, removed: 0, totalChanged: 0 };
      }

      const groupAccountIds = getGroupAccountIds(selectedGroup);
      if (!groupAccountIds.size) {
        return { added: 0, modified: 0, removed: 0, totalChanged: 0 };
      }

      const startDate = convertToDate(state.date.start);
      const endDate = convertToDate(state.date.end);

      const existingTransactions = Array.isArray(state.selected.allGroupTransactions)
        ? state.selected.allGroupTransactions
        : [];
      const transactionsById = new Map();

      existingTransactions.forEach((transaction) => {
        const key = getTransactionKey(transaction);
        if (!key) return;
        transactionsById.set(key, transaction);
      });

      let addedCount = 0;
      let modifiedCount = 0;
      let removedCount = 0;

      for (const removedTransaction of removedTransactions) {
        const transactionId = typeof removedTransaction === 'string'
          ? removedTransaction
          : removedTransaction?.transaction_id;

        if (!transactionId) {
          continue;
        }

        if (transactionsById.delete(transactionId)) {
          removedCount += 1;
        }
      }

      for (const modifiedTransaction of modifiedTransactions) {
        const transactionId = modifiedTransaction?.transaction_id;
        if (!transactionId) {
          continue;
        }

        if (!matchesSelectedGroupAndDateRange(modifiedTransaction, groupAccountIds, startDate, endDate)) {
          if (transactionsById.delete(transactionId)) {
            modifiedCount += 1;
          }
          continue;
        }

        const previousValue = transactionsById.get(transactionId);
        if (previousValue !== modifiedTransaction) {
          modifiedCount += 1;
        }

        transactionsById.set(transactionId, modifiedTransaction);
      }

      for (const addedTransaction of addedTransactions) {
        const transactionId = addedTransaction?.transaction_id;
        if (!transactionId) {
          continue;
        }

        if (!matchesSelectedGroupAndDateRange(addedTransaction, groupAccountIds, startDate, endDate)) {
          continue;
        }

        if (transactionsById.has(transactionId)) {
          continue;
        }

        transactionsById.set(transactionId, addedTransaction);
        addedCount += 1;
      }

      const totalChanged = addedCount + modifiedCount + removedCount;
      if (!totalChanged) {
        return { added: addedCount, modified: modifiedCount, removed: removedCount, totalChanged };
      }

      state.selected.allGroupTransactions = [...transactionsById.values()];
      await processAllTabsForSelectedGroup({ showLoading });

      return { added: addedCount, modified: modifiedCount, removed: removedCount, totalChanged };
    } catch (error) {
      console.error('Error applying transaction sync delta:', error);
      return { added: 0, modified: 0, removed: 0, totalChanged: 0 };
    }
  }

  /**
   * Compatibility wrapper for existing added-transactions-only sync updates.
   * @param {Array} addedTransactions - New transactions to add
   * @returns {Number} Count of transactions added to view
   */
  async function concatAndProcessTransactions(addedTransactions) {
    const result = await applyTransactionSyncDelta(
      { addedTransactions },
      { showLoading: false }
    );

    return result.added;
  }

  return {
    processTabData,
    processAllTabsForSelectedGroup,
    applyTransactionSyncDelta,
    concatAndProcessTransactions
  };
}
