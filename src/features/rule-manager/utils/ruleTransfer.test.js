import { describe, expect, test } from 'vitest';
import {
  buildRuleExportContent,
  parseRuleImportContent,
  mergeImportedRules
} from './ruleTransfer.js';
import {
  replaceRulesAtPath,
  levelRulesForDepth
} from '@/features/tabs/utils/drillSchema.js';

function createRule(options = {}) {
  const {
    id = 'rule-1',
    type = 'filter',
    rule = [type, 'name', 'includes', 'coffee', ''],
    applyForTabs = ['tab-1'],
    filterJoinOperator = 'and',
    isImportant = false,
    orderOfExecution = 0
  } = options;

  return {
    _id: id,
    rule,
    applyForTabs,
    filterJoinOperator,
    _isImportant: isImportant,
    orderOfExecution
  };
}

describe('ruleTransfer', () => {
  test('exports JSON arrays with rule_id for each row', () => {
    const json = buildRuleExportContent({
      rules: [
        createRule({ id: 'f-1' }),
        createRule({ id: 'c-1', type: 'categorize', rule: ['categorize', 'name', 'includes', 'uber', 'category', 'rides'] })
      ],
      format: 'json',
      includeMetadata: false,
      defaultApplyForTabs: ['tab-1']
    });

    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]).toMatchObject({ _id: 'f-1', rule_id: 'f-1' });
    expect(parsed[1]).toMatchObject({ _id: 'c-1', rule_id: 'c-1' });
  });

  test('exports JSON metadata wrapper when enabled', () => {
    const json = buildRuleExportContent({
      rules: [createRule({ id: 'f-1' })],
      format: 'json',
      includeMetadata: true,
      metadata: { tabId: 'tab-1', scope: 'all' },
      defaultApplyForTabs: ['tab-1']
    });

    const parsed = JSON.parse(json);
    expect(parsed.metadata).toEqual({ tabId: 'tab-1', scope: 'all' });
    expect(Array.isArray(parsed.rules)).toBe(true);
    expect(parsed.rules[0]).toMatchObject({ _id: 'f-1', rule_id: 'f-1' });
  });

  test('roundtrips CSV rule rows using rule_json', () => {
    const csv = buildRuleExportContent({
      rules: [
        createRule({ id: 's-1', type: 'sort', rule: ['sort', 'date', 'desc', '', ''] })
      ],
      format: 'csv',
      defaultApplyForTabs: ['tab-2']
    });

    const parsed = parseRuleImportContent(csv, 'csv');
    expect(parsed.invalidCount).toBe(0);
    expect(parsed.rules).toHaveLength(1);
    expect(parsed.rules[0]).toMatchObject({
      _id: 's-1',
      rule_id: 's-1',
      rule: ['sort', 'date', 'desc', '', ''],
      applyForTabs: ['tab-1']
    });
  });

  test('roundtrips markdown table rows with separator syntax', () => {
    const markdown = buildRuleExportContent({
      rules: [
        createRule({ id: 'g-1', type: 'groupBy', rule: ['groupBy', 'category', '', '', ''] })
      ],
      format: 'markdown',
      defaultApplyForTabs: ['tab-3']
    });

    const parsed = parseRuleImportContent(markdown, 'markdown');
    expect(parsed.invalidCount).toBe(0);
    expect(parsed.rules).toHaveLength(1);
    expect(parsed.rules[0]).toMatchObject({
      _id: 'g-1',
      rule_id: 'g-1',
      rule: ['groupBy', 'category', '', '', ''],
      applyForTabs: ['tab-1']
    });
  });

  test('merge updates existing rule by _id', () => {
    const result = mergeImportedRules({
      existingRulesByType: {
        groupBy: [],
        sort: [],
        categorize: [],
        filter: [
          createRule({ id: 'f-1', rule: ['filter', 'name', 'includes', 'coffee', ''], orderOfExecution: 0 })
        ]
      },
      importedRules: [
        {
          _id: 'f-1',
          rule_id: 'f-1',
          rule: ['filter', 'name', 'includes', 'tea', ''],
          filterJoinOperator: 'and',
          _isImportant: false,
          orderOfExecution: 0,
          applyForTabs: ['tab-1']
        }
      ]
    });

    expect(result.summary.updates).toBe(1);
    expect(result.summary.creates).toBe(0);
    expect(result.rulesByType.filter[0].rule[3]).toBe('tea');
  });

  test('merge updates existing rule by rule_id fallback', () => {
    const result = mergeImportedRules({
      existingRulesByType: {
        groupBy: [],
        sort: [],
        categorize: [
          createRule({ id: 'cat-42', type: 'categorize', rule: ['categorize', 'name', 'includes', 'uber', 'category', 'rides'] })
        ],
        filter: []
      },
      importedRules: [
        {
          _id: '',
          rule_id: 'cat-42',
          rule: ['categorize', 'name', 'includes', 'uber eats', 'category', 'food'],
          filterJoinOperator: 'and',
          _isImportant: true,
          orderOfExecution: 3,
          applyForTabs: ['tab-1']
        }
      ]
    });

    expect(result.summary.updates).toBe(1);
    expect(result.summary.creates).toBe(0);
    expect(result.rulesByType.categorize[0]._id).toBe('cat-42');
    expect(result.rulesByType.categorize[0].rule[3]).toBe('uber eats');
  });

  test('merge creates new rule when no match exists', () => {
    const result = mergeImportedRules({
      existingRulesByType: {
        groupBy: [],
        sort: [],
        categorize: [],
        filter: []
      },
      importedRules: [
        {
          _id: 'new-filter-1',
          rule_id: 'new-filter-1',
          rule: ['filter', 'amount', '>', '0', ''],
          filterJoinOperator: 'and',
          _isImportant: false,
          orderOfExecution: 0,
          applyForTabs: ['tab-1']
        }
      ]
    });

    expect(result.summary.updates).toBe(0);
    expect(result.summary.creates).toBe(1);
    expect(result.rulesByType.filter).toHaveLength(1);
    expect(result.rulesByType.filter[0]._id).toBe('new-filter-1');
  });

  test('merge skips _GLOBAL rules from imports', () => {
    const result = mergeImportedRules({
      existingRulesByType: {
        groupBy: [],
        sort: [],
        categorize: [],
        filter: []
      },
      importedRules: [
        {
          _id: 'global-1',
          rule_id: 'global-1',
          rule: ['filter', 'amount', '>', '0', ''],
          filterJoinOperator: 'and',
          _isImportant: false,
          orderOfExecution: 0,
          applyForTabs: ['_GLOBAL']
        }
      ]
    });

    expect(result.summary.skippedGlobal).toBe(1);
    expect(result.summary.applied).toBe(0);
    expect(result.rulesByType.filter).toHaveLength(0);
  });

  test('merged path-level replacement does not mutate non-target branch defaults', () => {
    const baseSchema = {
      version: 1,
      levels: [
        {
          id: 'level-1',
          groupByRules: [{ _id: 'g-root', rule: ['groupBy', 'category', '', '', ''], filterJoinOperator: 'and', _isImportant: false, orderOfExecution: 0 }],
          sortRules: [{ _id: 's-root', rule: ['sort', 'date', 'desc', '', ''], filterJoinOperator: 'and', _isImportant: false, orderOfExecution: 0 }],
          categorizeRules: [],
          filterRules: []
        },
        {
          id: 'level-2',
          groupByRules: [{ _id: 'g-depth-two', rule: ['groupBy', 'none', '', '', ''], filterJoinOperator: 'and', _isImportant: false, orderOfExecution: 0 }],
          sortRules: [{ _id: 's-depth-two', rule: ['sort', 'date', 'desc', '', ''], filterJoinOperator: 'and', _isImportant: false, orderOfExecution: 0 }],
          categorizeRules: [],
          filterRules: []
        }
      ]
    };

    const merged = mergeImportedRules({
      existingRulesByType: {
        groupBy: [{ _id: 'g-depth-two', rule: ['groupBy', 'none', '', '', ''], filterJoinOperator: 'and', _isImportant: false, orderOfExecution: 0 }],
        sort: [{ _id: 's-depth-two', rule: ['sort', 'date', 'desc', '', ''], filterJoinOperator: 'and', _isImportant: false, orderOfExecution: 0 }],
        categorize: [],
        filter: []
      },
      importedRules: [
        {
          _id: 'branch-sort-1',
          rule_id: 'branch-sort-1',
          rule: ['sort', 'amount', 'asc', '', ''],
          filterJoinOperator: 'and',
          _isImportant: false,
          orderOfExecution: 0,
          applyForTabs: ['tab-1']
        }
      ]
    });

    const updatedSchema = replaceRulesAtPath(baseSchema, ['dining'], {
      groupByRules: merged.rulesByType.groupBy,
      sortRules: merged.rulesByType.sort,
      categorizeRules: merged.rulesByType.categorize,
      filterRules: merged.rulesByType.filter
    });

    const diningRules = levelRulesForDepth(updatedSchema, 1, ['dining']).level;
    const travelRules = levelRulesForDepth(updatedSchema, 1, ['travel']).level;

    expect(diningRules.sortRules[0]._id).toBe('s-depth-two');
    expect(diningRules.sortRules[1]._id).toBe('branch-sort-1');
    expect(travelRules.sortRules).toHaveLength(1);
    expect(travelRules.sortRules[0]._id).toBe('s-depth-two');
  });
});
