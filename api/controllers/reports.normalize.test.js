import { describe, expect, test } from 'vitest';
import { normalizeReportPayload, isReportOwnedByUser } from './reports.normalize';

describe('reports normalize', () => {
  test('normalizes mixed rows and strips unknown fields', () => {
    const payload = {
      name: '  Monthly  ',
      folderName: '  Planning  ',
      totalFormula: ' r1 + r2 * 1.0875 ',
      sort: '4',
      rows: [
        {
          type: 'manual',
          title: '  Cash Adjustment ',
          amount: '12.5',
          sort: 10,
          ignoreMe: true
        },
        {
          type: 'report',
          reportId: 'report-2',
          reportName: '  Net Worth ',
          savedTotal: '55.5',
          sort: 2,
          unknownReportField: true
        },
        {
          type: 'tab',
          tabId: 'tab-1',
          groupId: 'group-1',
          dateStart: '2026-01-01',
          dateEnd: '2026-01-31',
          savedTotal: '77.5',
          sort: 1,
          unknown: 'x'
        }
      ],
      unknownRoot: true
    };

    const normalized = normalizeReportPayload(payload);

    expect(normalized.name).toBe('Monthly');
    expect(normalized.folderName).toBe('Planning');
    expect(normalized.totalFormula).toBe('r1 + r2 * 1.0875');
    expect(normalized.sort).toBe(4);
    expect(normalized.rows).toHaveLength(3);

    const tabRow = normalized.rows[0];
    const reportRow = normalized.rows[1];
    const manualRow = normalized.rows[2];

    expect(tabRow).toMatchObject({
      type: 'tab',
      tabId: 'tab-1',
      groupId: 'group-1',
      dateStart: '2026-01-01',
      dateEnd: '2026-01-31',
      savedTotal: 77.5,
      sort: 0
    });

    expect(tabRow).not.toHaveProperty('unknown');

    expect(reportRow).toMatchObject({
      type: 'report',
      reportId: 'report-2',
      reportName: 'Net Worth',
      savedTotal: 55.5,
      sort: 1
    });
    expect(reportRow).not.toHaveProperty('unknownReportField');

    expect(manualRow).toMatchObject({
      type: 'manual',
      title: 'Cash Adjustment',
      amount: 12.5,
      sort: 2
    });
    expect(manualRow).not.toHaveProperty('ignoreMe');
  });

  test('throws on invalid tab row date range', () => {
    expect(() =>
      normalizeReportPayload({
        name: 'Bad',
        rows: [
          {
            type: 'tab',
            tabId: 'tab-1',
            groupId: 'group-1',
            dateStart: '2026-02-01',
            dateEnd: '2026-01-01'
          }
        ]
      })
    ).toThrow('dateStart must be less than or equal to dateEnd');
  });

  test('throws on invalid manual amount', () => {
    expect(() =>
      normalizeReportPayload({
        name: 'Bad',
        rows: [
          {
            type: 'manual',
            title: 'oops',
            amount: 'abc'
          }
        ]
      })
    ).toThrow('manual row amount must be a valid number');
  });

  test('throws on invalid tab saved total', () => {
    expect(() =>
      normalizeReportPayload({
        name: 'Bad',
        rows: [
          {
            type: 'tab',
            tabId: 'tab-1',
            groupId: 'group-1',
            dateStart: '2026-01-01',
            dateEnd: '2026-01-02',
            savedTotal: 'abc'
          }
        ]
      })
    ).toThrow('tab row savedTotal must be a valid number');
  });

  test('throws on invalid report row saved total', () => {
    expect(() =>
      normalizeReportPayload({
        name: 'Bad',
        rows: [
          {
            type: 'report',
            reportId: 'report-2',
            savedTotal: 'abc'
          }
        ]
      })
    ).toThrow('report row savedTotal must be a valid number');
  });

  test('throws on invalid report sort', () => {
    expect(() =>
      normalizeReportPayload({
        name: 'Bad',
        sort: 'abc',
        rows: []
      })
    ).toThrow('sort must be a valid number');
  });

  test('normalizes missing or invalid total formula to empty string', () => {
    const withMissing = normalizeReportPayload({
      name: 'Monthly',
      rows: []
    });
    expect(withMissing.totalFormula).toBe('');

    const withNonString = normalizeReportPayload({
      name: 'Monthly',
      totalFormula: 123,
      rows: []
    });
    expect(withNonString.totalFormula).toBe('');
  });

  test('checks ownership helper', () => {
    expect(isReportOwnedByUser({ userId: 'a' }, 'a')).toBe(true);
    expect(isReportOwnedByUser({ userId: 'a' }, 'b')).toBe(false);
    expect(isReportOwnedByUser(null, 'b')).toBe(false);
  });
});
