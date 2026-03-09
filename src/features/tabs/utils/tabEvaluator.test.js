import { describe, expect, test } from 'vitest';
import { evaluateTabData, buildTabRulesForId } from './tabEvaluator.js';

describe('tabEvaluator', () => {
  test('computes total for a tab without explicit rules', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 't1',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          personal_finance_category: { primary: 'FOOD_AND_DRINK' }
        },
        {
          transaction_id: 't2',
          amount: 5,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          personal_finance_category: { primary: 'FOOD_AND_DRINK' }
        }
      ],
      tabRules: []
    });

    // Existing tab processing flips transaction sign before totaling.
    expect(result.tabTotal).toBe(-15);
    expect(Array.isArray(result.categorizedItems)).toBe(true);
  });

  test('returns zero values for missing tab/transactions', () => {
    const noTab = evaluateTabData({ tab: null, transactions: [] });
    const noTransactions = evaluateTabData({ tab: { _id: 'tab-1' }, transactions: [] });

    expect(noTab.tabTotal).toBe(0);
    expect(noTransactions.tabTotal).toBe(0);
    expect(noTab.hiddenItems).toEqual([]);
    expect(noTransactions.hiddenItems).toEqual([]);
  });

  test('buildTabRulesForId keeps global and tab-specific rules', () => {
    const allRules = [
      { _id: 'g1', applyForTabs: ['_GLOBAL'], rule: ['filter'] },
      { _id: 't1', applyForTabs: ['tab-1'], rule: ['filter'] },
      { _id: 't2', applyForTabs: ['tab-2'], rule: ['filter'] }
    ];

    const rules = buildTabRulesForId(allRules, 'tab-1');

    expect(rules.some(rule => rule._id === 'g1')).toBe(true);
    expect(rules.some(rule => rule._id === 't1')).toBe(true);
    expect(rules.some(rule => rule._id === 't2')).toBe(false);
  });

  test('evaluates filter rules as AND groups separated by OR dividers', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'travel-expense',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'entertainment-expense',
          amount: 8,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          personal_finance_category: { primary: 'ENTERTAINMENT' }
        },
        {
          transaction_id: 'groceries-expense',
          amount: 5,
          authorized_date: '2026-01-03',
          date: '2026-01-03',
          personal_finance_category: { primary: 'GROCERIES' }
        }
      ],
      tabRules: [
        { _id: 'f1', orderOfExecution: 0, rule: ['filter', 'amount', '<', '0', ''] },
        { _id: 'f2', orderOfExecution: 1, filterJoinOperator: 'and', rule: ['filter', 'category', '=', 'travel', ''] },
        { _id: 'f3', orderOfExecution: 2, filterJoinOperator: 'or', rule: ['filter', 'category', '=', 'entertainment', ''] }
      ]
    });

    const visibleTransactionIds = result.categorizedItems
      .flatMap(([, items]) => items.map(item => item.transaction_id))
      .sort();
    const hiddenTransactionIds = result.hiddenItems
      .map(item => item.transaction_id)
      .sort();

    expect(visibleTransactionIds).toEqual(['entertainment-expense', 'travel-expense']);
    expect(hiddenTransactionIds).toEqual(['groceries-expense']);
  });

  test('defaults missing filter join operator to AND', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'travel-expense',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'travel-income',
          amount: -10,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          personal_finance_category: { primary: 'TRAVEL' }
        }
      ],
      tabRules: [
        { _id: 'f1', orderOfExecution: 0, rule: ['filter', 'amount', '<', '0', ''] },
        { _id: 'f2', orderOfExecution: 1, rule: ['filter', 'category', '=', 'travel', ''] }
      ]
    });

    const visibleTransactionIds = result.categorizedItems
      .flatMap(([, items]) => items.map(item => item.transaction_id))
      .sort();

    expect(visibleTransactionIds).toEqual(['travel-expense']);
  });

  test('supports mixed AND/OR conditions inside a single filter rule', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'travel-expense',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'entertainment-income',
          amount: -20,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          personal_finance_category: { primary: 'ENTERTAINMENT' }
        },
        {
          transaction_id: 'groceries-expense',
          amount: 5,
          authorized_date: '2026-01-03',
          date: '2026-01-03',
          personal_finance_category: { primary: 'GROCERIES' }
        }
      ],
      tabRules: [
        {
          _id: 'f1',
          orderOfExecution: 0,
          rule: [
            'filter', 'amount', '<', '0', '',
            'and', 'category', '=', 'travel',
            'or', 'category', '=', 'entertainment'
          ]
        }
      ]
    });

    const visibleTransactionIds = result.categorizedItems
      .flatMap(([, items]) => items.map(item => item.transaction_id))
      .sort();

    expect(visibleTransactionIds).toEqual(['entertainment-income', 'travel-expense']);
  });

  test('supports date-specific filter operators', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'early',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'middle',
          amount: 8,
          authorized_date: '2026-01-02',
          personal_finance_category: { primary: 'ENTERTAINMENT' }
        },
        {
          transaction_id: 'late',
          amount: 5,
          authorized_date: '2026-01-03',
          date: '2026-01-03',
          personal_finance_category: { primary: 'GROCERIES' }
        }
      ],
      tabRules: [
        {
          _id: 'f-date-operators',
          orderOfExecution: 0,
          rule: [
            'filter', 'date', 'is after', '2026-01-01', '',
            'and', 'date', 'is before', '2026-01-03'
          ]
        }
      ]
    });

    const visibleTransactionIds = result.categorizedItems
      .flatMap(([, items]) => items.map(item => item.transaction_id))
      .sort();

    expect(visibleTransactionIds).toEqual(['middle']);
  });

  test('keeps legacy date operators working for existing rules', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'early',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'middle',
          amount: 8,
          authorized_date: '2026-01-02',
          personal_finance_category: { primary: 'ENTERTAINMENT' }
        },
        {
          transaction_id: 'late',
          amount: 5,
          authorized_date: '2026-01-03',
          date: '2026-01-03',
          personal_finance_category: { primary: 'GROCERIES' }
        }
      ],
      tabRules: [
        {
          _id: 'f-date-legacy',
          orderOfExecution: 0,
          rule: ['filter', 'date', '<', '2026-01-03', '']
        }
      ]
    });

    const visibleTransactionIds = result.categorizedItems
      .flatMap(([, items]) => items.map(item => item.transaction_id))
      .sort();

    expect(visibleTransactionIds).toEqual(['early', 'middle']);
  });

  test('supports date-specific operators inside categorize rules', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'early',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'middle',
          amount: 8,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          personal_finance_category: { primary: 'ENTERTAINMENT' }
        },
        {
          transaction_id: 'late',
          amount: 5,
          authorized_date: '2026-01-03',
          date: '2026-01-03',
          personal_finance_category: { primary: 'GROCERIES' }
        }
      ],
      tabRules: [
        {
          _id: 'c-date-operators',
          orderOfExecution: 0,
          rule: [
            'categorize', 'date', 'is after', '2026-01-01', 'recent',
            'and', 'date', 'is before', '2026-01-03'
          ]
        }
      ]
    });

    const recentGroup = result.categorizedItems.find(([categoryName]) => categoryName === 'recent');
    const recentIds = recentGroup ? recentGroup[1].map(item => item.transaction_id).sort() : [];

    expect(recentIds).toEqual(['middle']);
  });

  test('supports OR conditions inside a single categorize rule', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'travel-expense',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'entertainment-expense',
          amount: 8,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          personal_finance_category: { primary: 'ENTERTAINMENT' }
        },
        {
          transaction_id: 'groceries-expense',
          amount: 5,
          authorized_date: '2026-01-03',
          date: '2026-01-03',
          personal_finance_category: { primary: 'GROCERIES' }
        }
      ],
      tabRules: [
        {
          _id: 'c1',
          orderOfExecution: 0,
          rule: [
            'categorize', 'category', '=', 'travel', 'leisure',
            'or', 'category', '=', 'entertainment'
          ]
        }
      ]
    });

    const leisureGroup = result.categorizedItems.find(([categoryName]) => categoryName === 'leisure');
    const leisureIds = leisureGroup ? leisureGroup[1].map(item => item.transaction_id).sort() : [];

    expect(leisureIds).toEqual(['entertainment-expense', 'travel-expense']);
  });

  test('supports set-target categorize rules that update transaction names', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'uber-trip',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          name: 'Uber Trip 1234',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'lyft-trip',
          amount: 8,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          name: 'Lyft Trip 4321',
          personal_finance_category: { primary: 'TRAVEL' }
        }
      ],
      tabRules: [
        {
          _id: 'global-rename',
          orderOfExecution: 0,
          _isGlobalCategorizeRule: true,
          rule: ['categorize', 'name', 'includes', 'uber', 'name', 'Ride Share']
        },
        {
          _id: 'g-category',
          orderOfExecution: 0,
          rule: ['groupBy', 'category', '', '', '']
        }
      ]
    });

    const allItems = result.categorizedItems.flatMap(([, items]) => items);
    const uberTransaction = allItems.find(item => item.transaction_id === 'uber-trip');
    const lyftTransaction = allItems.find(item => item.transaction_id === 'lyft-trip');

    expect(uberTransaction?.name).toBe('Ride Share');
    expect(lyftTransaction?.name).toBe('Lyft Trip 4321');
    expect(uberTransaction?.personal_finance_category?.primary).toBe('travel');
  });

  test('supports set-target categorize rules that set transaction tags', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'uber-trip',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          name: 'Uber Trip 1234',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'coffee',
          amount: 8,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          name: 'Coffee Shop',
          personal_finance_category: { primary: 'FOOD' }
        }
      ],
      tabRules: [
        {
          _id: 'global-tag-uber',
          orderOfExecution: 0,
          _isGlobalCategorizeRule: true,
          rule: ['categorize', 'name', 'includes', 'uber', 'tag', 'rideshare']
        },
        {
          _id: 'g-category',
          orderOfExecution: 0,
          rule: ['groupBy', 'category', '', '', '']
        }
      ]
    });

    const allItems = result.categorizedItems.flatMap(([, items]) => items);
    const uberTransaction = allItems.find(item => item.transaction_id === 'uber-trip');
    const coffeeTransaction = allItems.find(item => item.transaction_id === 'coffee');

    expect(uberTransaction?.tags).toEqual(['rideshare']);
    expect(coffeeTransaction?.tags).toBeUndefined();
    expect(uberTransaction?.personal_finance_category?.primary).toBe('travel');
  });

  test('prefers global rule when the same rule id exists in both global and local scopes', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'uber-trip',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          name: 'Uber Trip 1234',
          personal_finance_category: { primary: 'TRAVEL' }
        }
      ],
      tabRules: [
        {
          _id: 'shared-rule',
          orderOfExecution: 0,
          _isGlobalCategorizeRule: true,
          rule: ['categorize', 'name', 'includes', 'uber', 'name', 'Ride Share Global']
        },
        {
          _id: 'shared-rule',
          orderOfExecution: 0,
          rule: ['categorize', 'name', 'includes', 'uber', 'name', 'Ride Share Local']
        },
        {
          _id: 'g-category',
          orderOfExecution: 0,
          rule: ['groupBy', 'category', '', '', '']
        }
      ]
    });

    const allItems = result.categorizedItems.flatMap(([, items]) => items);
    const uberTransaction = allItems.find(item => item.transaction_id === 'uber-trip');

    expect(uberTransaction?.name).toBe('Ride Share Global');
  });

  test('filters can target global rule output when local tab categories override it', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'uber-trip',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          name: 'Uber Trip',
          personal_finance_category: { primary: 'MISC' }
        },
        {
          transaction_id: 'coffee-shop',
          amount: 8,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          name: 'Coffee Shop',
          personal_finance_category: { primary: 'MISC' }
        }
      ],
      tabRules: [
        {
          _id: 'global-uber',
          orderOfExecution: 0,
          _isGlobalCategorizeRule: true,
          rule: ['categorize', 'name', 'includes', 'uber', 'travel']
        },
        {
          _id: 'local-spending',
          orderOfExecution: 1,
          rule: ['categorize', 'amount', '<', '0', 'local spending']
        },
        {
          _id: 'filter-global-category',
          orderOfExecution: 0,
          rule: ['filter', 'globalCategory', '=', 'travel', '']
        },
        {
          _id: 'group-category',
          orderOfExecution: 0,
          rule: ['groupBy', 'category', '', '', '']
        }
      ]
    });

    const visibleItems = result.categorizedItems.flatMap(([, items]) => items);
    const visibleTransactionIds = visibleItems.map(item => item.transaction_id).sort();
    const hiddenTransactionIds = result.hiddenItems.map(item => item.transaction_id).sort();

    expect(visibleTransactionIds).toEqual(['uber-trip']);
    expect(hiddenTransactionIds).toEqual(['coffee-shop']);
    expect(visibleItems[0]?.personal_finance_category?.primary).toBe('local spending');
  });

  test('tab-level categorizers run after recategorizeAs by default', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'salary-1',
          amount: -100,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          name: 'Salary Deposit',
          recategorizeAs: 'custom salary',
          personal_finance_category: { primary: 'MISC' }
        }
      ],
      tabRules: [
        {
          _id: 'global-salary',
          orderOfExecution: 0,
          _isGlobalCategorizeRule: true,
          rule: ['categorize', 'name', 'includes', 'salary', 'payroll']
        },
        {
          _id: 'local-money-in',
          orderOfExecution: 1,
          rule: ['categorize', 'amount', '>', '0', 'money in']
        },
        {
          _id: 'g-category',
          orderOfExecution: 0,
          rule: ['groupBy', 'category', '', '', '']
        }
      ]
    });

    const groupNames = result.categorizedItems.map(([groupName]) => groupName);
    expect(groupNames).toEqual(['money in']);
    expect(result.overriddenRecategorizeCount).toBe(1);
  });

  test('honorRecategorizeAs setting keeps custom categories over local tab categorizers', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true, honorRecategorizeAs: true },
      transactions: [
        {
          transaction_id: 'salary-1',
          amount: -100,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          name: 'Salary Deposit',
          recategorizeAs: 'custom salary',
          personal_finance_category: { primary: 'MISC' }
        }
      ],
      tabRules: [
        {
          _id: 'global-salary',
          orderOfExecution: 0,
          _isGlobalCategorizeRule: true,
          rule: ['categorize', 'name', 'includes', 'salary', 'payroll']
        },
        {
          _id: 'local-money-in',
          orderOfExecution: 1,
          rule: ['categorize', 'amount', '>', '0', 'money in']
        },
        {
          _id: 'g-category',
          orderOfExecution: 0,
          rule: ['groupBy', 'category', '', '', '']
        }
      ]
    });

    const groupNames = result.categorizedItems.map(([groupName]) => groupName);
    expect(groupNames).toEqual(['custom salary']);
    expect(result.overriddenRecategorizeCount).toBe(0);
  });

  test('sort rules support explicit asc/desc directions', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'alpha-id',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          name: 'alpha',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'charlie-id',
          amount: 8,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          name: 'charlie',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'bravo-id',
          amount: 5,
          authorized_date: '2026-01-03',
          date: '2026-01-03',
          name: 'bravo',
          personal_finance_category: { primary: 'TRAVEL' }
        }
      ],
      tabRules: [
        {
          _id: 's-name-desc',
          orderOfExecution: 0,
          rule: ['sort', 'name', 'desc', '', '']
        }
      ]
    });

    const sortedTransactionIds = result.categorizedItems
      .flatMap(([, items]) => items.map(item => item.transaction_id));

    expect(sortedTransactionIds).toEqual(['charlie-id', 'bravo-id', 'alpha-id']);
  });

  test('sort rules keep legacy -property descending format working', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'oldest',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'middle',
          amount: 8,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'newest',
          amount: 5,
          authorized_date: '2026-01-03',
          date: '2026-01-03',
          personal_finance_category: { primary: 'TRAVEL' }
        }
      ],
      tabRules: [
        {
          _id: 's-date-legacy',
          orderOfExecution: 0,
          rule: ['sort', '-date', '', '', '']
        }
      ]
    });

    const sortedTransactionIds = result.categorizedItems
      .flatMap(([, items]) => items.map(item => item.transaction_id));

    expect(sortedTransactionIds).toEqual(['newest', 'middle', 'oldest']);
  });

  test('groupBy category respects sort category ascending for group row order', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'zeta-1',
          amount: 200,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          name: 'Zeta One',
          personal_finance_category: { primary: 'ZETA' }
        },
        {
          transaction_id: 'alpha-1',
          amount: 10,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          name: 'Alpha One',
          personal_finance_category: { primary: 'ALPHA' }
        }
      ],
      tabRules: [
        {
          _id: 'g-category',
          orderOfExecution: 0,
          rule: ['groupBy', 'category', '', '', '']
        },
        {
          _id: 's-category-asc',
          orderOfExecution: 0,
          rule: ['sort', 'category', 'asc', '', '']
        }
      ]
    });

    expect(result.categorizedItems.map(([groupName]) => groupName)).toEqual(['alpha', 'zeta']);
  });

  test('groupBy category respects sort category descending for group row order', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'zeta-1',
          amount: 200,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          name: 'Zeta One',
          personal_finance_category: { primary: 'ZETA' }
        },
        {
          transaction_id: 'alpha-1',
          amount: 10,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          name: 'Alpha One',
          personal_finance_category: { primary: 'ALPHA' }
        }
      ],
      tabRules: [
        {
          _id: 'g-category',
          orderOfExecution: 0,
          rule: ['groupBy', 'category', '', '', '']
        },
        {
          _id: 's-category-desc',
          orderOfExecution: 0,
          rule: ['sort', 'category', 'desc', '', '']
        }
      ]
    });

    expect(result.categorizedItems.map(([groupName]) => groupName)).toEqual(['zeta', 'alpha']);
  });

  test('groupBy name groups transactions by transaction name', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'coffee-1',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          name: 'Coffee Shop',
          personal_finance_category: { primary: 'FOOD_AND_DRINK' }
        },
        {
          transaction_id: 'coffee-2',
          amount: 5,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          name: 'Coffee Shop',
          personal_finance_category: { primary: 'TRANSFER' }
        },
        {
          transaction_id: 'rent-1',
          amount: 200,
          authorized_date: '2026-01-03',
          date: '2026-01-03',
          name: 'Rent',
          personal_finance_category: { primary: 'RENT_AND_UTILITIES' }
        }
      ],
      tabRules: [
        {
          _id: 'g-name',
          orderOfExecution: 0,
          rule: ['groupBy', 'name', '', '', '']
        }
      ]
    });

    const coffeeGroup = result.categorizedItems.find(([groupName]) => groupName === 'Coffee Shop');
    const rentGroup = result.categorizedItems.find(([groupName]) => groupName === 'Rent');

    expect(result.groupByMode).toBe('name');
    expect(coffeeGroup?.[1].map(item => item.transaction_id).sort()).toEqual(['coffee-1', 'coffee-2']);
    expect(rentGroup?.[1].map(item => item.transaction_id)).toEqual(['rent-1']);
  });

  test('groupBy name respects sort name direction for group row order', () => {
    const ascendingResult = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'bravo-id',
          amount: 200,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          name: 'Bravo',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'alpha-id',
          amount: 10,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          name: 'Alpha',
          personal_finance_category: { primary: 'FOOD' }
        }
      ],
      tabRules: [
        {
          _id: 'g-name',
          orderOfExecution: 0,
          rule: ['groupBy', 'name', '', '', '']
        },
        {
          _id: 's-name-asc',
          orderOfExecution: 0,
          rule: ['sort', 'name', 'asc', '', '']
        }
      ]
    });

    const descendingResult = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'bravo-id',
          amount: 200,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          name: 'Bravo',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'alpha-id',
          amount: 10,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          name: 'Alpha',
          personal_finance_category: { primary: 'FOOD' }
        }
      ],
      tabRules: [
        {
          _id: 'g-name',
          orderOfExecution: 0,
          rule: ['groupBy', 'name', '', '', '']
        },
        {
          _id: 's-name-desc',
          orderOfExecution: 0,
          rule: ['sort', 'name', 'desc', '', '']
        }
      ]
    });

    expect(ascendingResult.categorizedItems.map(([groupName]) => groupName)).toEqual(['Alpha', 'Bravo']);
    expect(descendingResult.categorizedItems.map(([groupName]) => groupName)).toEqual(['Bravo', 'Alpha']);
  });

  test('groupBy date respects sort date direction for group row order', () => {
    const ascendingResult = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'tx-feb',
          amount: 200,
          authorized_date: '2026-02-01',
          date: '2026-02-01',
          name: 'Feb One',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'tx-jan-ten',
          amount: 20,
          authorized_date: '2026-01-10',
          date: '2026-01-10',
          name: 'Jan Ten',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'tx-jan-two',
          amount: 10,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          name: 'Jan Two',
          personal_finance_category: { primary: 'TRAVEL' }
        }
      ],
      tabRules: [
        {
          _id: 'g-date',
          orderOfExecution: 0,
          rule: ['groupBy', 'date', '', '', '']
        },
        {
          _id: 's-date-asc',
          orderOfExecution: 0,
          rule: ['sort', 'date', 'asc', '', '']
        }
      ]
    });

    const descendingResult = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'tx-feb',
          amount: 200,
          authorized_date: '2026-02-01',
          date: '2026-02-01',
          name: 'Feb One',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'tx-jan-ten',
          amount: 20,
          authorized_date: '2026-01-10',
          date: '2026-01-10',
          name: 'Jan Ten',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'tx-jan-two',
          amount: 10,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          name: 'Jan Two',
          personal_finance_category: { primary: 'TRAVEL' }
        }
      ],
      tabRules: [
        {
          _id: 'g-date',
          orderOfExecution: 0,
          rule: ['groupBy', 'date', '', '', '']
        },
        {
          _id: 's-date-desc',
          orderOfExecution: 0,
          rule: ['sort', 'date', 'desc', '', '']
        }
      ]
    });

    expect(ascendingResult.categorizedItems.map(([groupName]) => groupName)).toEqual(['jan, 02', 'jan, 10', 'feb, 01']);
    expect(descendingResult.categorizedItems.map(([groupName]) => groupName)).toEqual(['feb, 01', 'jan, 10', 'jan, 02']);
  });

  test('groupBy category respects sort amount direction using category totals', () => {
    const ascendingResult = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'travel-1',
          amount: 100,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'travel-2',
          amount: 10,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'food-1',
          amount: 20,
          authorized_date: '2026-01-03',
          date: '2026-01-03',
          personal_finance_category: { primary: 'FOOD' }
        }
      ],
      tabRules: [
        {
          _id: 'g-category',
          orderOfExecution: 0,
          rule: ['groupBy', 'category', '', '', '']
        },
        {
          _id: 's-amount-asc',
          orderOfExecution: 0,
          rule: ['sort', 'amount', 'asc', '', '']
        }
      ]
    });

    const descendingResult = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'travel-1',
          amount: 100,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'travel-2',
          amount: 10,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'food-1',
          amount: 20,
          authorized_date: '2026-01-03',
          date: '2026-01-03',
          personal_finance_category: { primary: 'FOOD' }
        }
      ],
      tabRules: [
        {
          _id: 'g-category',
          orderOfExecution: 0,
          rule: ['groupBy', 'category', '', '', '']
        },
        {
          _id: 's-amount-desc',
          orderOfExecution: 0,
          rule: ['sort', 'amount', 'desc', '', '']
        }
      ]
    });

    expect(ascendingResult.categorizedItems.map(([groupName]) => groupName)).toEqual(['travel', 'food']);
    expect(descendingResult.categorizedItems.map(([groupName]) => groupName)).toEqual(['food', 'travel']);
  });

  test('legacy contains rules continue to behave like includes', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 't-travel',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 't-groceries',
          amount: 8,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          personal_finance_category: { primary: 'GROCERIES' }
        }
      ],
      tabRules: [
        {
          _id: 'f-legacy-contains',
          orderOfExecution: 0,
          rule: ['filter', 'category', 'contains', 'trav', '']
        }
      ]
    });

    const visibleTransactionIds = result.categorizedItems
      .flatMap(([, items]) => items.map(item => item.transaction_id))
      .sort();

    expect(visibleTransactionIds).toEqual(['t-travel']);
  });

  test('includes supports comma and newline separated terms with surrounding whitespace', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 't-cash',
          amount: 10,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          personal_finance_category: { primary: 'CASH_DEPOSIT' }
        },
        {
          transaction_id: 't-government',
          amount: 8,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          personal_finance_category: { primary: 'GOVERNMENT' }
        },
        {
          transaction_id: 't-other',
          amount: 5,
          authorized_date: '2026-01-03',
          date: '2026-01-03',
          personal_finance_category: { primary: 'TRANSFER_IN' }
        }
      ],
      tabRules: [
        {
          _id: 'f-multi-term-includes',
          orderOfExecution: 0,
          rule: ['filter', 'category', 'includes', 'fdms okb,  cash deposit,\n  government  ', '']
        }
      ]
    });

    const visibleTransactionIds = result.categorizedItems
      .flatMap(([, items]) => items.map(item => item.transaction_id))
      .sort();

    expect(visibleTransactionIds).toEqual(['t-cash', 't-government']);
  });

  test('amount-based categorize rules handle formatted numeric strings', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 't-in',
          amount: '-1,200.50',
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          personal_finance_category: { primary: 'MISC' }
        },
        {
          transaction_id: 't-out',
          amount: '44.00',
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          personal_finance_category: { primary: 'MISC' }
        }
      ],
      tabRules: [
        {
          _id: 'c-money-in',
          orderOfExecution: 0,
          rule: ['categorize', 'amount', '>', '0', 'money in']
        },
        {
          _id: 'c-money-out',
          orderOfExecution: 1,
          rule: ['categorize', 'amount', '<', '0', 'money out']
        },
        {
          _id: 'g-category',
          orderOfExecution: 0,
          rule: ['groupBy', 'category', '', '', '']
        }
      ]
    });

    const groupNames = result.categorizedItems.map(([groupName]) => groupName).sort();
    expect(groupNames).toEqual(['money in', 'money out']);
  });

  test('amount-based categorize rules handle accounting and unicode minus formats', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 't-in-parentheses',
          amount: '(1,200.50)',
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          personal_finance_category: { primary: 'MISC' }
        },
        {
          transaction_id: 't-out-standard',
          amount: '44.00',
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          personal_finance_category: { primary: 'MISC' }
        },
        {
          transaction_id: 't-in-unicode-minus',
          amount: '−12.75',
          authorized_date: '2026-01-03',
          date: '2026-01-03',
          personal_finance_category: { primary: 'MISC' }
        }
      ],
      tabRules: [
        {
          _id: 'c-money-in',
          orderOfExecution: 0,
          rule: ['categorize', 'amount', '>', '0', 'money in']
        },
        {
          _id: 'c-money-out',
          orderOfExecution: 1,
          rule: ['categorize', 'amount', '<', '0', 'money out']
        },
        {
          _id: 'g-category',
          orderOfExecution: 0,
          rule: ['groupBy', 'category', '', '', '']
        }
      ]
    });

    const groupNames = result.categorizedItems.map(([groupName]) => groupName).sort();
    expect(groupNames).toEqual(['money in', 'money out']);
  });

  test('groupBy none returns a single all-transactions bucket and exposes groupByMode', () => {
    const result = evaluateTabData({
      tab: { _id: 'tab-1', isSelected: true },
      transactions: [
        {
          transaction_id: 'tx-1',
          amount: 12,
          authorized_date: '2026-01-01',
          date: '2026-01-01',
          name: 'Alpha',
          personal_finance_category: { primary: 'TRAVEL' }
        },
        {
          transaction_id: 'tx-2',
          amount: 8,
          authorized_date: '2026-01-02',
          date: '2026-01-02',
          name: 'Bravo',
          personal_finance_category: { primary: 'GROCERIES' }
        }
      ],
      tabRules: [
        {
          _id: 'g-no-group',
          orderOfExecution: 0,
          rule: ['groupBy', 'none', '', '', '']
        }
      ]
    });

    expect(result.groupByMode).toBe('none');
    expect(result.categorizedItems).toHaveLength(1);
    expect(result.categorizedItems[0][0]).toBe('all transactions');
    expect(result.categorizedItems[0][1].map(item => item.transaction_id).sort()).toEqual(['tx-1', 'tx-2']);
  });
});
