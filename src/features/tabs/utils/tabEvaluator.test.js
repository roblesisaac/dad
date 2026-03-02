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

    expect(visibleTransactionIds).toEqual(['entertainment-expense', 'travel-expense']);
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
});
