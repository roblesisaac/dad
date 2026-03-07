import { describe, expect, test } from 'vitest';
import { resolveAmountZeroHiddenFilter } from './amountZeroFilter.js';

function filterRule({ method = '>', criterion = '0', order = 0, join = 'and', rule = null } = {}) {
  return {
    orderOfExecution: order,
    filterJoinOperator: join,
    rule: rule || ['filter', 'amount', method, criterion, '']
  };
}

describe('resolveAmountZeroHiddenFilter', () => {
  test('returns null when tab has no amount-vs-zero filter', () => {
    const result = resolveAmountZeroHiddenFilter([
      {
        orderOfExecution: 0,
        filterJoinOperator: 'and',
        rule: ['filter', 'category', '=', 'travel', '']
      }
    ]);

    expect(result).toBeNull();
  });

  test('resolves positive-only mode for amount > 0', () => {
    const result = resolveAmountZeroHiddenFilter([filterRule({ method: '>' })]);

    expect(result?.mode).toBe('positive-only');
    expect(result?.predicate(2)).toBe(true);
    expect(result?.predicate(0)).toBe(false);
    expect(result?.predicate(-2)).toBe(false);
  });

  test('resolves negative-only mode for amount < 0', () => {
    const result = resolveAmountZeroHiddenFilter([filterRule({ method: '<' })]);

    expect(result?.mode).toBe('negative-only');
    expect(result?.predicate(-2)).toBe(true);
    expect(result?.predicate(0)).toBe(false);
    expect(result?.predicate(2)).toBe(false);
  });

  test('resolves non-negative mode for amount >= 0', () => {
    const result = resolveAmountZeroHiddenFilter([filterRule({ method: '>=' })]);

    expect(result?.mode).toBe('non-negative');
    expect(result?.predicate(2)).toBe(true);
    expect(result?.predicate(0)).toBe(true);
    expect(result?.predicate(-2)).toBe(false);
  });

  test('resolves non-positive mode for amount <= 0', () => {
    const result = resolveAmountZeroHiddenFilter([filterRule({ method: '<=' })]);

    expect(result?.mode).toBe('non-positive');
    expect(result?.predicate(-2)).toBe(true);
    expect(result?.predicate(0)).toBe(true);
    expect(result?.predicate(2)).toBe(false);
  });

  test('keeps unambiguous mode when combined with non-amount filters using AND', () => {
    const result = resolveAmountZeroHiddenFilter([
      filterRule({ method: '>', order: 0 }),
      {
        orderOfExecution: 1,
        filterJoinOperator: 'and',
        rule: ['filter', 'category', '=', 'travel', '']
      }
    ]);

    expect(result?.mode).toBe('positive-only');
  });

  test('returns null when OR creates ambiguous sign direction', () => {
    const result = resolveAmountZeroHiddenFilter([
      filterRule({ method: '>', order: 0 }),
      {
        orderOfExecution: 1,
        filterJoinOperator: 'or',
        rule: ['filter', 'category', '=', 'travel', '']
      }
    ]);

    expect(result).toBeNull();
  });

  test('returns null when filters explicitly include both signs', () => {
    const result = resolveAmountZeroHiddenFilter([
      filterRule({ method: '>', order: 0 }),
      filterRule({ method: '<', order: 1, join: 'or' })
    ]);

    expect(result).toBeNull();
  });

  test('returns null when in-rule OR introduces unconstrained branch', () => {
    const result = resolveAmountZeroHiddenFilter([
      filterRule({
        rule: [
          'filter', 'amount', '>', '0', '',
          'or', 'category', '=', 'travel'
        ]
      })
    ]);

    expect(result).toBeNull();
  });
});
