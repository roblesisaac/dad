import { describe, expect, test } from 'vitest';
import { resolveDrillState } from './drillEvaluator.js';

function createRule(id, rule, options = {}) {
  return {
    _id: id,
    rule,
    filterJoinOperator: options.filterJoinOperator || 'and',
    _isImportant: Boolean(options._isImportant),
    orderOfExecution: Number.isFinite(Number(options.orderOfExecution))
      ? Number(options.orderOfExecution)
      : 0
  };
}

function createTab(levels, pathLevels = []) {
  return {
    _id: 'tab-1',
    tabName: 'Test Tab',
    isSelected: true,
    drillSchema: {
      version: 1,
      levels,
      pathLevels
    }
  };
}

function createTransaction(id, overrides = {}) {
  return {
    transaction_id: id,
    account_id: 'acc-1',
    authorized_date: '2026-01-01',
    date: '2026-01-01',
    amount: 10,
    name: `Transaction ${id}`,
    personal_finance_category: { primary: 'FOOD_AND_DRINK' },
    ...overrides
  };
}

describe('drillEvaluator', () => {
  test('supports 3+ levels and transitions from grouped buckets to leaf transactions', () => {
    const tab = createTab([
      {
        id: 'level-1',
        sortRules: [createRule('sort-0', ['sort', 'date', 'desc', '', ''])],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [createRule('group-0', ['groupBy', 'category', '', '', ''])]
      },
      {
        id: 'level-2',
        sortRules: [createRule('sort-1', ['sort', 'date', 'desc', '', ''])],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [createRule('group-1', ['groupBy', 'year_month', '', '', ''])]
      },
      {
        id: 'level-3',
        sortRules: [createRule('sort-2', ['sort', 'date', 'desc', '', ''])],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [createRule('group-2', ['groupBy', 'none', '', '', ''])]
      }
    ]);

    const transactions = [
      createTransaction('t1', {
        authorized_date: '2026-01-15',
        date: '2026-01-15',
        personal_finance_category: { primary: 'FOOD_AND_DRINK' }
      }),
      createTransaction('t2', {
        authorized_date: '2026-02-10',
        date: '2026-02-10',
        personal_finance_category: { primary: 'FOOD_AND_DRINK' }
      }),
      createTransaction('t3', {
        authorized_date: '2026-01-03',
        date: '2026-01-03',
        personal_finance_category: { primary: 'TRANSPORTATION' }
      })
    ];

    const root = resolveDrillState({ tab, transactions, allRules: [], drillPath: [] });
    expect(root.isLeaf).toBe(false);
    expect(root.groups.map(group => group.key)).toEqual(expect.arrayContaining(['food and drink', 'transportation']));

    const depthOne = resolveDrillState({
      tab,
      transactions,
      allRules: [],
      drillPath: ['food and drink']
    });
    expect(depthOne.validPath).toEqual(['food and drink']);
    expect(depthOne.isLeaf).toBe(false);
    expect(depthOne.groups.map(group => group.key)).toEqual(expect.arrayContaining(['2026 jan', '2026 feb']));

    const depthTwoLeaf = resolveDrillState({
      tab,
      transactions,
      allRules: [],
      drillPath: ['food and drink', '2026 feb']
    });
    expect(depthTwoLeaf.isLeaf).toBe(true);
    expect(depthTwoLeaf.validPath).toEqual(['food and drink', '2026 feb']);
    expect(depthTwoLeaf.transactions.map(item => item.transaction_id)).toEqual(['t2']);
  });

  test('applies branch-local rules only for the matching branch path', () => {
    const tab = createTab(
      [
        {
          id: 'level-1',
          sortRules: [createRule('sort-0', ['sort', 'date', 'desc', '', ''])],
          categorizeRules: [],
          filterRules: [],
          groupByRules: [createRule('group-0', ['groupBy', 'category', '', '', ''])]
        },
        {
          id: 'level-2',
          sortRules: [createRule('sort-1', ['sort', 'date', 'desc', '', ''])],
          categorizeRules: [],
          filterRules: [],
          groupByRules: [createRule('group-1', ['groupBy', 'category', '', '', ''])]
        }
      ],
      [{
        id: 'path-dining',
        path: ['dining'],
        sortRules: [createRule('sort-dining', ['sort', 'date', 'desc', '', ''])],
        categorizeRules: [
          createRule('dining-fast', ['categorize', 'name', 'includes', 'burger', 'fast food']),
          createRule('dining-restaurant', ['categorize', 'name', 'includes', 'dinner', 'restaurants'])
        ],
        filterRules: [],
        groupByRules: [createRule('group-dining', ['groupBy', 'category', '', '', ''])]
      }]
    );

    const transactions = [
      createTransaction('d1', {
        name: 'Burger Spot',
        personal_finance_category: { primary: 'DINING' }
      }),
      createTransaction('d2', {
        name: 'Dinner House',
        personal_finance_category: { primary: 'DINING' }
      }),
      createTransaction('t1', {
        name: 'Flight Ticket',
        personal_finance_category: { primary: 'TRAVEL' }
      })
    ];

    const dining = resolveDrillState({
      tab,
      transactions,
      allRules: [],
      drillPath: ['dining']
    });
    const travel = resolveDrillState({
      tab,
      transactions,
      allRules: [],
      drillPath: ['travel']
    });

    expect(dining.groups.map(group => group.key).sort()).toEqual(['fast food', 'restaurants']);
    expect(travel.groups.map(group => group.key)).toEqual(['travel']);
  });

  test('applies global categorize at every depth but does not carry local categorize to child depth', () => {
    const tab = createTab([
      {
        id: 'level-1',
        sortRules: [createRule('sort-0', ['sort', 'date', 'desc', '', ''])],
        categorizeRules: [
          createRule('local-cat-0', ['categorize', 'name', 'includes', 'uber', 'rides local'])
        ],
        filterRules: [],
        groupByRules: [createRule('group-0', ['groupBy', 'category', '', '', ''])]
      },
      {
        id: 'level-2',
        sortRules: [createRule('sort-1', ['sort', 'date', 'desc', '', ''])],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [createRule('group-1', ['groupBy', 'category', '', '', ''])]
      }
    ]);

    const transactions = [
      createTransaction('t1', {
        name: 'Uber Trip',
        personal_finance_category: { primary: 'TRANSPORTATION' }
      }),
      createTransaction('t2', {
        name: 'Taxi Fare',
        personal_finance_category: { primary: 'TRANSPORTATION' }
      })
    ];

    const sharedRules = [
      {
        _id: 'global-cat',
        applyForTabs: ['_GLOBAL'],
        rule: ['categorize', 'name', 'includes', 'uber', 'rides global'],
        filterJoinOperator: 'and',
        _isImportant: false,
        orderOfExecution: 0
      }
    ];

    const result = resolveDrillState({
      tab,
      transactions,
      allRules: sharedRules,
      drillPath: ['rides local']
    });

    expect(result.validPath).toEqual(['rides local']);
    expect(result.groups.map(group => group.key)).toContain('rides global');
    expect(result.groups.map(group => group.key)).not.toContain('rides local');
  });

  test('global categorize runs before local categorize even when global order is higher', () => {
    const tab = createTab([
      {
        id: 'level-1',
        sortRules: [createRule('sort-0', ['sort', 'date', 'desc', '', ''])],
        categorizeRules: [
          createRule('local-shop', ['categorize', 'category', 'includes', 'fdms okb', 'shop related'], {
            orderOfExecution: 0
          })
        ],
        filterRules: [],
        groupByRules: [createRule('group-0', ['groupBy', 'category', '', '', ''])]
      }
    ]);

    const transactions = [
      createTransaction('t-fdms', {
        name: 'FDMS merchant',
        personal_finance_category: { primary: 'MISC' }
      })
    ];

    const sharedRules = [
      {
        _id: 'global-fdms',
        applyForTabs: ['_GLOBAL'],
        rule: ['categorize', 'name', 'includes', 'fdms', 'fdms okb'],
        filterJoinOperator: 'and',
        _isImportant: false,
        orderOfExecution: 100
      }
    ];

    const result = resolveDrillState({
      tab,
      transactions,
      allRules: sharedRules,
      drillPath: []
    });

    expect(result.groups.map(group => group.key)).toContain('shop related');
    expect(result.groups.map(group => group.key)).not.toContain('fdms okb');
  });

  test('local categorize can override important global categorize rules', () => {
    const tab = createTab([
      {
        id: 'level-1',
        sortRules: [createRule('sort-0', ['sort', 'date', 'desc', '', ''])],
        categorizeRules: [
          createRule('local-money-in', ['categorize', 'amount', '>', '0', 'money in'], {
            orderOfExecution: 0
          }),
          createRule('local-money-out', ['categorize', 'amount', '<', '0', 'money out'], {
            orderOfExecution: 1
          })
        ],
        filterRules: [],
        groupByRules: [createRule('group-0', ['groupBy', 'category', '', '', ''])]
      }
    ]);

    const transactions = [
      createTransaction('t1', {
        name: 'FDMS incoming',
        amount: -30,
        personal_finance_category: { primary: 'MISC' }
      }),
      createTransaction('t2', {
        name: 'FDMS outgoing',
        amount: 10,
        personal_finance_category: { primary: 'MISC' }
      })
    ];

    const sharedRules = [
      {
        _id: 'global-important-fdms',
        applyForTabs: ['_GLOBAL'],
        rule: ['categorize', 'name', 'includes', 'fdms', 'fdms okb'],
        filterJoinOperator: 'and',
        _isImportant: true,
        orderOfExecution: 0
      }
    ];

    const result = resolveDrillState({
      tab,
      transactions,
      allRules: sharedRules,
      drillPath: []
    });

    const groupKeys = result.groups.map(group => group.key).sort();
    expect(groupKeys).toEqual(['money in', 'money out']);
  });

  test('missing depth config defaults to leaf view', () => {
    const tab = createTab([
      {
        id: 'level-1',
        sortRules: [createRule('sort-0', ['sort', 'date', 'desc', '', ''])],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [createRule('group-0', ['groupBy', 'category', '', '', ''])]
      }
    ]);

    const transactions = [
      createTransaction('t1', {
        personal_finance_category: { primary: 'FOOD_AND_DRINK' }
      }),
      createTransaction('t2', {
        personal_finance_category: { primary: 'FOOD_AND_DRINK' }
      })
    ];

    const result = resolveDrillState({
      tab,
      transactions,
      allRules: [],
      drillPath: ['food and drink']
    });

    expect(result.isLeaf).toBe(true);
    expect(result.groupByMode).toBe('none');
    expect(result.validPath).toEqual(['food and drink']);
    expect(result.transactions.map(item => item.transaction_id).sort()).toEqual(['t1', 't2']);
  });

  test('trims invalid drill path segments and returns nearest valid depth', () => {
    const tab = createTab([
      {
        id: 'level-1',
        sortRules: [createRule('sort-0', ['sort', 'date', 'desc', '', ''])],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [createRule('group-0', ['groupBy', 'category', '', '', ''])]
      },
      {
        id: 'level-2',
        sortRules: [createRule('sort-1', ['sort', 'date', 'desc', '', ''])],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [createRule('group-1', ['groupBy', 'year_month', '', '', ''])]
      }
    ]);

    const transactions = [
      createTransaction('t1', {
        authorized_date: '2026-01-15',
        date: '2026-01-15',
        personal_finance_category: { primary: 'FOOD_AND_DRINK' }
      })
    ];

    const result = resolveDrillState({
      tab,
      transactions,
      allRules: [],
      drillPath: ['food and drink', 'missing-segment']
    });

    expect(result.validPath).toEqual(['food and drink']);
    expect(result.groups.map(group => group.key)).toContain('2026 jan');
  });
});
