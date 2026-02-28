import { describe, expect, test } from 'vitest';
import { normalizeReportPayload, isReportOwnedByUser } from './reports.normalize';

describe('reports normalize', () => {
  test('normalizes mixed rows and strips unknown fields', () => {
    const payload = {
      name: '  Monthly  ',
      rows: [
        {
          type: 'manual',
          title: '  Cash Adjustment ',
          amount: '12.5',
          sort: 10,
          ignoreMe: true
        },
        {
          type: 'tab',
          tabId: 'tab-1',
          groupId: 'group-1',
          dateStart: '2026-01-01',
          dateEnd: '2026-01-31',
          sort: 1,
          unknown: 'x'
        }
      ],
      unknownRoot: true
    };

    const normalized = normalizeReportPayload(payload);

    expect(normalized.name).toBe('Monthly');
    expect(normalized.rows).toHaveLength(2);

    const tabRow = normalized.rows[0];
    const manualRow = normalized.rows[1];

    expect(tabRow).toMatchObject({
      type: 'tab',
      tabId: 'tab-1',
      groupId: 'group-1',
      dateStart: '2026-01-01',
      dateEnd: '2026-01-31',
      sort: 0
    });

    expect(tabRow).not.toHaveProperty('unknown');

    expect(manualRow).toMatchObject({
      type: 'manual',
      title: 'Cash Adjustment',
      amount: 12.5,
      sort: 1
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

  test('checks ownership helper', () => {
    expect(isReportOwnedByUser({ userId: 'a' }, 'a')).toBe(true);
    expect(isReportOwnedByUser({ userId: 'a' }, 'b')).toBe(false);
    expect(isReportOwnedByUser(null, 'b')).toBe(false);
  });
});
