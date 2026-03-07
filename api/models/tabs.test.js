import { beforeEach, describe, expect, test, vi } from 'vitest';

const amptModelMock = vi.fn((_, schema) => schema);

vi.mock('../utils/amptModel', () => ({
  default: amptModelMock
}));

describe('tabs model drill schema normalization', () => {
  beforeEach(() => {
    amptModelMock.mockClear();
    vi.resetModules();
  });

  test('keeps level and path recategorize behavior settings', async () => {
    const { default: tabSchema } = await import('./tabs');
    const normalizeDrillSchema = tabSchema.drillSchema;

    const normalized = normalizeDrillSchema({
      levels: [{
        id: 'level-1',
        sortRules: [],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [{
          _id: 'groupBy-1',
          rule: ['groupBy', 'category', '', '', '']
        }],
        honorRecategorizeAs: true,
        recategorizeBehaviorDecision: 'honor'
      }],
      pathLevels: [{
        id: 'path-level-1',
        path: ['money out'],
        sortRules: [],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [{
          _id: 'groupBy-path-1',
          rule: ['groupBy', 'category', '', '', '']
        }],
        honorRecategorizeAs: false,
        recategorizeBehaviorDecision: 'override'
      }]
    }, { item: { drillSchema: true } });

    expect(normalized.levels[0].honorRecategorizeAs).toBe(true);
    expect(normalized.levels[0].recategorizeBehaviorDecision).toBe('honor');
    expect(normalized.pathLevels[0].honorRecategorizeAs).toBe(false);
    expect(normalized.pathLevels[0].recategorizeBehaviorDecision).toBe('override');
  });

  test('normalizes invalid recategorize settings to defaults', async () => {
    const { default: tabSchema } = await import('./tabs');
    const normalizeDrillSchema = tabSchema.drillSchema;

    const normalized = normalizeDrillSchema({
      levels: [{
        id: 'level-1',
        sortRules: [],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [{
          _id: 'groupBy-1',
          rule: ['groupBy', 'none', '', '', '']
        }],
        honorRecategorizeAs: false,
        recategorizeBehaviorDecision: 'something-else'
      }]
    }, { item: { drillSchema: true } });

    expect(normalized.levels[0].honorRecategorizeAs).toBe(false);
    expect(normalized.levels[0].recategorizeBehaviorDecision).toBe('');
  });

  test('falls back to group-by rule marker when explicit fields are absent', async () => {
    const { default: tabSchema } = await import('./tabs');
    const normalizeDrillSchema = tabSchema.drillSchema;

    const normalized = normalizeDrillSchema({
      levels: [{
        id: 'level-1',
        sortRules: [],
        categorizeRules: [],
        filterRules: [],
        groupByRules: [{
          _id: 'groupBy-1',
          rule: ['groupBy', 'category', '', '', '__recat_behavior:override']
        }]
      }]
    }, { item: { drillSchema: true } });

    expect(normalized.levels[0].honorRecategorizeAs).toBe(false);
    expect(normalized.levels[0].recategorizeBehaviorDecision).toBe('override');
  });
});
