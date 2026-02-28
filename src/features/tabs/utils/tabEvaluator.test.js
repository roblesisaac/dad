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
});
