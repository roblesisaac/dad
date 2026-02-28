import { beforeAll, describe, expect, test } from 'vitest';

let normalizeRowsForLocal;
let calculateReportTotal;
let buildTransactionsCacheKey;
let buildRowStateKey;

beforeAll(async () => {
  global.window = {
    location: {
      origin: 'http://localhost'
    }
  };

  const helpers = await import('./useReportsState.js');
  normalizeRowsForLocal = helpers.normalizeRowsForLocal;
  calculateReportTotal = helpers.calculateReportTotal;
  buildTransactionsCacheKey = helpers.buildTransactionsCacheKey;
  buildRowStateKey = helpers.buildRowStateKey;
});

describe('useReportsState helpers', () => {
  test('normalizes rows and reindexes sort order', () => {
    const normalized = normalizeRowsForLocal([
      {
        type: 'manual',
        rowId: 'm1',
        title: 'Manual',
        amount: '12.4',
        sort: 2,
        ignore: true
      },
      {
        type: 'tab',
        rowId: 't1',
        tabId: 'tab-1',
        groupId: 'group-1',
        dateStart: '2026-01-01',
        dateEnd: '2026-01-31',
        sort: 0,
        extra: 'x'
      }
    ]);

    expect(normalized).toHaveLength(2);
    expect(normalized[0]).toMatchObject({
      rowId: 't1',
      type: 'tab',
      sort: 0
    });
    expect(normalized[1]).toMatchObject({
      rowId: 'm1',
      type: 'manual',
      amount: 12.4,
      sort: 1
    });
  });

  test('calculates report total using manual and tab rows', () => {
    const total = calculateReportTotal([
      { rowId: 'tab-row', type: 'tab' },
      { rowId: 'manual-row', type: 'manual', amount: -5 }
    ], {
      'tab-row': 20.5
    });

    expect(total).toBe(15.5);
  });

  test('builds stable cache and row state keys', () => {
    expect(buildTransactionsCacheKey('g1', '2026-01-01', '2026-01-31')).toBe('g1|2026-01-01|2026-01-31');
    expect(buildRowStateKey('r1', 'row-1')).toBe('r1:row-1');
  });
});
