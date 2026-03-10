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

function createTab(levels, pathLevels = [], overrides = {}) {
  return {
    _id: 'tab-1',
    tabName: 'Test Tab',
    isSelected: true,
    ...overrides,
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
    expect(root.currentLevelTotal).toBe(root.tabTotal);
    expect(root.groups.map(group => group.key)).toEqual(expect.arrayContaining(['food and drink', 'transportation']));

    const depthOne = resolveDrillState({
      tab,
      transactions,
      allRules: [],
      drillPath: ['food and drink']
    });
    expect(depthOne.validPath).toEqual(['food and drink']);
    expect(depthOne.isLeaf).toBe(false);
    expect(depthOne.currentLevelTotal).not.toBe(root.tabTotal);
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

  test('respects sort amount direction for grouped rows at deeper drill levels', () => {
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
        sortRules: [createRule('sort-2', ['sort', 'amount', 'desc', '', ''])],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [createRule('group-2', ['groupBy', 'name', '', '', ''])]
      }
    ]);

    const transactions = [
      createTransaction('t1', {
        authorized_date: '2026-01-02',
        date: '2026-01-02',
        amount: 100,
        name: 'Alpha',
        personal_finance_category: { primary: 'FOOD' }
      }),
      createTransaction('t2', {
        authorized_date: '2026-01-03',
        date: '2026-01-03',
        amount: 20,
        name: 'Bravo',
        personal_finance_category: { primary: 'FOOD' }
      }),
      createTransaction('t3', {
        authorized_date: '2026-01-04',
        date: '2026-01-04',
        amount: 5,
        name: 'Bravo',
        personal_finance_category: { primary: 'FOOD' }
      })
    ];

    const result = resolveDrillState({
      tab,
      transactions,
      allRules: [],
      drillPath: ['food', '2026 jan']
    });

    expect(result.validPath).toEqual(['food', '2026 jan']);
    expect(result.groups.map(group => group.key)).toEqual(['bravo', 'alpha']);
  });

  test('exposes sort-label metadata for grouped rows when sort by label is active', () => {
    const tab = createTab([
      {
        id: 'level-1',
        sortRules: [createRule('sort-label', ['sort', 'label', 'asc', '', ''])],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [createRule('group-category', ['groupBy', 'category', '', '', ''])]
      }
    ]);

    const transactions = [
      createTransaction('t1', {
        labels: ['zebra'],
        personal_finance_category: { primary: 'ALPHA' }
      }),
      createTransaction('t2', {
        labels: ['alpha'],
        personal_finance_category: { primary: 'ALPHA' }
      }),
      createTransaction('t3', {
        labels: ['mango'],
        personal_finance_category: { primary: 'BETA' }
      })
    ];

    const result = resolveDrillState({
      tab,
      transactions,
      allRules: [],
      drillPath: []
    });

    expect(result.sortProperty).toBe('label');
    expect(result.sortDirection).toBe('asc');
    expect(result.groups.map(group => ({ key: group.key, sortLabel: group.sortLabel }))).toEqual([
      { key: 'alpha', sortLabel: 'alpha' },
      { key: 'beta', sortLabel: 'mango' }
    ]);
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

  test('applies global rules at every depth but does not carry local categorize to child depth', () => {
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

  test('global rules run before local categorize even when global order is higher', () => {
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

  test('local categorize can override important global rules', () => {
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

  test('reports recategorizeAs overrides when tab-level categorization wins', () => {
    const tab = createTab([
      {
        id: 'level-1',
        sortRules: [createRule('sort-0', ['sort', 'date', 'desc', '', ''])],
        categorizeRules: [
          createRule('local-money-in', ['categorize', 'amount', '>', '0', 'money in'], {
            orderOfExecution: 0
          })
        ],
        filterRules: [],
        groupByRules: [createRule('group-0', ['groupBy', 'category', '', '', ''])]
      }
    ]);

    const transactions = [
      createTransaction('t1', {
        amount: -25,
        recategorizeAs: 'special income',
        personal_finance_category: { primary: 'MISC' }
      })
    ];

    const result = resolveDrillState({
      tab,
      transactions,
      allRules: [],
      drillPath: []
    });

    expect(result.groups.map(group => group.key)).toEqual(['money in']);
    expect(result.overriddenRecategorizeCount).toBe(1);
  });

  test('applies honor/override recategorize behavior per level path', () => {
    const tab = createTab(
      [
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
        id: 'path-money-out',
        path: ['money out'],
        sortRules: [createRule('sort-path-money-out', ['sort', 'date', 'desc', '', ''])],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [createRule('group-path-money-out', ['groupBy', 'category', '', '', ''])],
        honorRecategorizeAs: true,
        recategorizeBehaviorDecision: 'honor'
      }]
    );

    const transactions = [
      createTransaction('t-out', {
        amount: 32,
        recategorizeAs: 'gift to nana',
        personal_finance_category: { primary: 'TRANSFER' }
      }),
      createTransaction('t-in', {
        amount: -25,
        recategorizeAs: 'refund',
        personal_finance_category: { primary: 'MISC' }
      })
    ];

    const root = resolveDrillState({
      tab,
      transactions,
      allRules: [],
      drillPath: []
    });
    expect(root.groups.map(group => group.key).sort()).toEqual(['money in', 'money out']);
    expect(root.hasRecategorizeBehaviorDecision).toBe(false);
    expect(root.honorRecategorizeAs).toBe(false);

    const moneyOutLevel = resolveDrillState({
      tab,
      transactions,
      allRules: [],
      drillPath: ['money out']
    });
    expect(moneyOutLevel.validPath).toEqual(['money out']);
    expect(moneyOutLevel.groups.map(group => group.key)).toEqual(['gift to nana']);
    expect(moneyOutLevel.hasRecategorizeBehaviorDecision).toBe(true);
    expect(moneyOutLevel.honorRecategorizeAs).toBe(true);
  });

  test('treats legacy tab-level recategorize preference as depth-zero only', () => {
    const tab = createTab(
      [
        {
          id: 'level-1',
          sortRules: [createRule('sort-0', ['sort', 'date', 'desc', '', ''])],
          categorizeRules: [
            createRule('local-money-out', ['categorize', 'amount', '<', '0', 'money out'], {
              orderOfExecution: 0
            })
          ],
          filterRules: [],
          groupByRules: [createRule('group-0', ['groupBy', 'category', '', '', ''])]
        },
        {
          id: 'level-2',
          sortRules: [createRule('sort-1', ['sort', 'date', 'desc', '', ''])],
          categorizeRules: [
            createRule('local-family', ['categorize', 'name', 'includes', 'nana', 'family'])
          ],
          filterRules: [],
          groupByRules: [createRule('group-1', ['groupBy', 'category', '', '', ''])]
        }
      ],
      [],
      {
        honorRecategorizeAs: true
      }
    );

    const transactions = [
      createTransaction('legacy-depth-pref', {
        amount: 32,
        name: 'zelle nana',
        recategorizeAs: 'gift to nana',
        personal_finance_category: { primary: 'TRANSFER' }
      })
    ];

    const root = resolveDrillState({
      tab,
      transactions,
      allRules: [],
      drillPath: []
    });
    expect(root.groups.map(group => group.key)).toEqual(['gift to nana']);
    expect(root.honorRecategorizeAs).toBe(true);
    expect(root.hasRecategorizeBehaviorDecision).toBe(true);

    const depthOne = resolveDrillState({
      tab,
      transactions,
      allRules: [],
      drillPath: ['gift to nana']
    });
    expect(depthOne.validPath).toEqual(['gift to nana']);
    expect(depthOne.groups.map(group => group.key)).toEqual(['family']);
    expect(depthOne.honorRecategorizeAs).toBe(false);
    expect(depthOne.hasRecategorizeBehaviorDecision).toBe(false);
  });

  test('preserves drill transactions without transaction_id by matching on _id fallback', () => {
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
      },
      {
        id: 'level-2',
        sortRules: [createRule('sort-1', ['sort', 'date', 'desc', '', ''])],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [createRule('group-1', ['groupBy', 'none', '', '', ''])]
      }
    ]);

    const transactions = [
      createTransaction('legacy-a', {
        _id: 'legacy-1',
        transaction_id: undefined,
        amount: 45,
        name: 'stater bros #1'
      }),
      createTransaction('legacy-b', {
        _id: 'legacy-2',
        transaction_id: undefined,
        amount: 23,
        name: 'stater bros #2'
      })
    ];

    const result = resolveDrillState({
      tab,
      transactions,
      allRules: [],
      drillPath: ['money out']
    });

    expect(result.validPath).toEqual(['money out']);
    expect(result.isLeaf).toBe(true);
    expect(result.transactions.map(item => item._id).sort()).toEqual(['legacy-1', 'legacy-2']);
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
