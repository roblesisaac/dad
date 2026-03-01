import { beforeAll, describe, expect, test } from 'vitest';

let normalizeRowsForLocal;
let normalizeReportsForLocal;
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
  normalizeReportsForLocal = helpers.normalizeReportsForLocal;
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
        type: 'report',
        rowId: 'r1',
        reportId: 'report-1',
        reportName: 'Annual',
        savedTotal: '40.1',
        sort: 1
      },
      {
        type: 'tab',
        rowId: 't1',
        tabId: 'tab-1',
        groupId: 'group-1',
        dateStart: '2026-01-01',
        dateEnd: '2026-01-31',
        savedTotal: '99.9',
        sort: 0,
        extra: 'x'
      }
    ]);

    expect(normalized).toHaveLength(3);
    expect(normalized[0]).toMatchObject({
      rowId: 't1',
      type: 'tab',
      savedTotal: 99.9,
      sort: 0
    });
    expect(normalized[1]).toMatchObject({
      rowId: 'r1',
      type: 'report',
      reportId: 'report-1',
      reportName: 'Annual',
      savedTotal: 40.1,
      sort: 1
    });
    expect(normalized[2]).toMatchObject({
      rowId: 'm1',
      type: 'manual',
      amount: 12.4,
      sort: 2
    });
  });

  test('calculates report total using manual, tab, and report rows', () => {
    const total = calculateReportTotal([
      { rowId: 'tab-row', type: 'tab', savedTotal: 20.5 },
      { rowId: 'report-row', type: 'report', savedTotal: 10 },
      { rowId: 'manual-row', type: 'manual', amount: -5 }
    ]);

    expect(total).toBe(25.5);
  });

  test('builds stable cache and row state keys', () => {
    expect(buildTransactionsCacheKey('g1', '2026-01-01', '2026-01-31')).toBe('g1|2026-01-01|2026-01-31');
    expect(buildRowStateKey('r1', 'row-1')).toBe('r1:row-1');
  });

  test('normalizes report list sort order', () => {
    const normalized = normalizeReportsForLocal([
      { _id: 'r2', name: 'B', folderName: '  Ops ', sort: 5, rows: [] },
      { _id: 'r1', name: 'A', sort: 1, rows: [] }
    ]);

    expect(normalized[0]).toMatchObject({ _id: 'r1', sort: 0 });
    expect(normalized[1]).toMatchObject({ _id: 'r2', sort: 1, folderName: 'Ops' });
  });
});
