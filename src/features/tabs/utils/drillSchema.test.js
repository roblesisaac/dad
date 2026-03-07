import { describe, expect, test } from 'vitest';
import {
  buildDrillSchemaFromLegacyRules,
  globalCategorizeRules,
  levelRulesForDepth,
  replaceRulesAtPath,
  normalizeTabWithDrillSchema
} from './drillSchema.js';

function createLegacyRule(id, applyForTabs, rule, options = {}) {
  return {
    _id: id,
    applyForTabs,
    rule,
    filterJoinOperator: options.filterJoinOperator || 'and',
    _isImportant: Boolean(options._isImportant),
    orderOfExecution: Number.isFinite(Number(options.orderOfExecution))
      ? Number(options.orderOfExecution)
      : 0
  };
}

describe('drillSchema', () => {
  test('migrates legacy tab rules and folds global non-categorize rules into level 0', () => {
    const tab = { _id: 'tab-1', tabName: 'Travel' };
    const allRules = [
      createLegacyRule(
        'tab-filter',
        ['tab-1'],
        ['filter', 'name', 'includes', 'flight', ''],
        { orderOfExecution: 1 }
      ),
      createLegacyRule(
        'tab-categorize',
        ['tab-1'],
        ['categorize', 'name', 'includes', 'uber', 'rides'],
        { orderOfExecution: 0 }
      ),
      createLegacyRule(
        'global-filter',
        ['_GLOBAL'],
        ['filter', 'amount', '>', '0', ''],
        { orderOfExecution: 0 }
      ),
      createLegacyRule(
        'global-sort',
        ['_GLOBAL'],
        ['sort', 'date', 'desc', '', ''],
        { orderOfExecution: 0 }
      ),
      createLegacyRule(
        'global-group',
        ['_GLOBAL'],
        ['groupBy', 'category', '', '', ''],
        { orderOfExecution: 0 }
      ),
      createLegacyRule(
        'global-categorize',
        ['_GLOBAL'],
        ['categorize', 'category', '=', 'transportation', 'transport'],
        { orderOfExecution: 0 }
      ),
      createLegacyRule(
        'other-tab-filter',
        ['tab-2'],
        ['filter', 'name', 'includes', 'ignored', ''],
        { orderOfExecution: 0 }
      )
    ];

    const schema = buildDrillSchemaFromLegacyRules(tab, allRules);
    const levelZero = schema.levels[0];

    expect(schema.version).toBe(1);
    expect(levelZero.sortRules.map(rule => rule._id)).toEqual(['global-sort']);
    expect(levelZero.groupByRules.map(rule => rule._id)).toEqual(['global-group']);
    expect(levelZero.filterRules.map(rule => rule._id)).toEqual(['global-filter', 'tab-filter']);
    expect(levelZero.categorizeRules.map(rule => rule._id)).toEqual(['tab-categorize']);
  });

  test('returns only global categorize rules from the shared rule set', () => {
    const allRules = [
      createLegacyRule('g-cat', ['_GLOBAL'], ['categorize', 'name', 'includes', 'uber', 'rides']),
      createLegacyRule('g-filter', ['_GLOBAL'], ['filter', 'amount', '>', '0', '']),
      createLegacyRule('tab-cat', ['tab-1'], ['categorize', 'name', 'includes', 'coffee', 'coffee'])
    ];

    const globalRules = globalCategorizeRules(allRules);
    expect(globalRules.map(rule => rule._id)).toEqual(['g-cat']);
  });

  test('missing drill depth defaults to leaf (groupBy none)', () => {
    const schema = {
      version: 1,
      levels: [{
        id: 'level-1',
        sortRules: [],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [{
          _id: 'group-0',
          rule: ['groupBy', 'category', '', '', ''],
          filterJoinOperator: 'and',
          _isImportant: false,
          orderOfExecution: 0
        }]
      }]
    };

    const depthTwo = levelRulesForDepth(schema, 2);
    const groupByRule = depthTwo.level.groupByRules[0];

    expect(groupByRule.rule).toEqual(['groupBy', 'none', '', '', '']);
  });

  test('path-level rules override depth defaults only for the matching branch path', () => {
    const schema = {
      version: 1,
      levels: [{
        id: 'level-1',
        sortRules: [],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [{
          _id: 'group-root',
          rule: ['groupBy', 'category', '', '', ''],
          filterJoinOperator: 'and',
          _isImportant: false,
          orderOfExecution: 0
        }]
      }, {
        id: 'level-2',
        sortRules: [],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [{
          _id: 'group-depth-2',
          rule: ['groupBy', 'none', '', '', ''],
          filterJoinOperator: 'and',
          _isImportant: false,
          orderOfExecution: 0
        }]
      }],
      pathLevels: [{
        id: 'path-dining',
        path: ['dining'],
        sortRules: [],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [{
          _id: 'group-path-dining',
          rule: ['groupBy', 'category', '', '', ''],
          filterJoinOperator: 'and',
          _isImportant: false,
          orderOfExecution: 0
        }]
      }]
    };

    const diningPath = levelRulesForDepth(schema, 1, ['dining']);
    const travelPath = levelRulesForDepth(schema, 1, ['travel']);

    expect(diningPath.source).toBe('path');
    expect(diningPath.level.groupByRules[0].rule[1]).toBe('category');
    expect(travelPath.source).toBe('depth');
    expect(travelPath.level.groupByRules[0].rule[1]).toBe('none');
  });

  test('replaceRulesAtPath writes branch-local overrides without mutating depth defaults', () => {
    const schema = {
      version: 1,
      levels: [{
        id: 'level-1',
        sortRules: [],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [{
          _id: 'group-root',
          rule: ['groupBy', 'category', '', '', ''],
          filterJoinOperator: 'and',
          _isImportant: false,
          orderOfExecution: 0
        }]
      }, {
        id: 'level-2',
        sortRules: [],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [{
          _id: 'group-depth-2',
          rule: ['groupBy', 'none', '', '', ''],
          filterJoinOperator: 'and',
          _isImportant: false,
          orderOfExecution: 0
        }]
      }]
    };

    const updated = replaceRulesAtPath(schema, ['dining'], {
      groupByRules: [{
        _id: 'group-dining',
        rule: ['groupBy', 'category', '', '', ''],
        filterJoinOperator: 'and',
        _isImportant: false,
        orderOfExecution: 0
      }]
    });

    const diningPath = levelRulesForDepth(updated, 1, ['dining']);
    const travelPath = levelRulesForDepth(updated, 1, ['travel']);
    expect(diningPath.level.groupByRules[0].rule[1]).toBe('category');
    expect(travelPath.level.groupByRules[0].rule[1]).toBe('none');
    expect(Array.isArray(updated.pathLevels)).toBe(true);
    expect(updated.pathLevels).toHaveLength(1);
  });

  test('normalizeTabWithDrillSchema preserves an existing valid schema', () => {
    const tab = {
      _id: 'tab-1',
      drillSchema: {
        version: 1,
        levels: [{
          id: 'level-1',
          sortRules: [],
          categorizeRules: [],
          filterRules: [],
          groupByRules: [{
            _id: 'group-0',
            rule: ['groupBy', 'year_month', '', '', ''],
            filterJoinOperator: 'and',
            _isImportant: false,
            orderOfExecution: 0
          }]
        }]
      }
    };

    const normalized = normalizeTabWithDrillSchema(tab, []);
    expect(normalized.drillSchema.levels[0].groupByRules[0].rule[1]).toBe('year_month');
    expect(Array.isArray(normalized.drillSchema.pathLevels)).toBe(true);
  });
});
