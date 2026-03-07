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
