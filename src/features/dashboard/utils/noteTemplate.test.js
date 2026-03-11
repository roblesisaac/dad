import { describe, expect, test } from 'vitest';
import {
  buildDynamicNoteTokens,
  normalizeTemplateToken,
  renderTemplateWithTokens
} from './noteTemplate.js';

describe('noteTemplate', () => {
  test('normalizes token names from free text labels', () => {
    expect(normalizeTemplateToken(' Shop Subscriptions ')).toBe('shop-subscriptions');
    expect(normalizeTemplateToken('money_that went out')).toBe('money-that-went-out');
    expect(normalizeTemplateToken('selectedAccount')).toBe('selected-account');
  });

  test('builds dynamic tokens including row totals', () => {
    const tokens = buildDynamicNoteTokens({
      selectedTabLabel: 'My Shop Money',
      selectedGroupLabel: 'Westminster Account',
      selectedDrillLabel: 'Money Out',
      dateLabel: 'Mar 1 - Mar 9 2026',
      totalLabel: '-$200',
      monthCount: 1,
      rowCount: 5,
      transactionCount: 18,
      averageLabel: '-$40',
      drillGroups: [
        { label: 'Shop Subscriptions', total: -120.45 },
        { label: 'Splurges', total: -79.55 }
      ],
      formatAmount: (amount) => `$${Math.abs(amount).toFixed(2)}`
    });

    expect(tokens['selected-tab']).toBe('My Shop Money');
    expect(tokens['selected-account']).toBe('Westminster Account');
    expect(tokens['shop-subscriptions']).toBe('$120.45');
    expect(tokens.splurges).toBe('$79.55');
    expect(tokens['month-count']).toBe('1');
    expect(tokens['row-count']).toBe('5');
    expect(tokens['transaction-count']).toBe('18');
    expect(tokens.average).toBe('-$40');
  });

  test('renders known tokens and preserves unknown tokens', () => {
    const rendered = renderTemplateWithTokens(
      'You splurged {{ splurges }} in {{ date }} and {{ unknown-token }}',
      {
        splurges: '$79.55',
        date: 'Mar 1 - Mar 9 2026'
      }
    );

    expect(rendered).toBe('You splurged $79.55 in Mar 1 - Mar 9 2026 and {{ unknown-token }}');
  });

  test('evaluates arithmetic expressions with token values', () => {
    const rendered = renderTemplateWithTokens(
      'Net is {{ money-in + money-out }}',
      {
        'money-in': '$300',
        'money-out': '-$125'
      }
    );

    expect(rendered).toBe('Net is $175');
  });

  test('supports pemdas precedence and parentheses', () => {
    const renderedWithPemdas = renderTemplateWithTokens(
      'Value: {{ 10 + 2 * 3 }}',
      {}
    );
    const renderedWithParens = renderTemplateWithTokens(
      'Value: {{ (10 + 2) * 3 }}',
      {}
    );

    expect(renderedWithPemdas).toBe('Value: $16');
    expect(renderedWithParens).toBe('Value: $36');
  });

  test('supports ternary expressions with comparison operators', () => {
    const renderedNegative = renderTemplateWithTokens(
      "Direction: {{ total < 1 ? 'sent' : 'received' }}",
      {
        total: '-$25'
      }
    );
    const renderedPositive = renderTemplateWithTokens(
      "Direction: {{ total < 1 ? 'sent' : 'received' }}",
      {
        total: '$25'
      }
    );

    expect(renderedNegative).toBe('Direction: sent');
    expect(renderedPositive).toBe('Direction: received');
  });

  test('supports ternary expressions that resolve to numeric token values', () => {
    const rendered = renderTemplateWithTokens(
      'Displayed: {{ transaction-count > 0 ? total : average }}',
      {
        'transaction-count': '2',
        total: '$250',
        average: '$125'
      }
    );

    expect(rendered).toBe('Displayed: $250');
  });

  test('supports ternary branches with string concatenation and camelCase token names', () => {
    const template = "{{ total < 0 ? selectedAccount + ' sent ' + (total * -1) + ' to your 9098 account' : 'You paid ' + total + ' out of pocket from your 9098 account to ' + selectedAccount }}";
    const renderedNegative = renderTemplateWithTokens(
      template,
      {
        total: '-$45',
        'selected-account': 'Checking'
      }
    );
    const renderedPositive = renderTemplateWithTokens(
      template,
      {
        total: '$45',
        'selected-account': 'Checking'
      }
    );

    expect(renderedNegative).toBe('Checking sent 45 to your 9098 account');
    expect(renderedPositive).toBe('You paid $45 out of pocket from your 9098 account to Checking');
  });

  test('keeps expression untouched when it cannot be evaluated safely', () => {
    const rendered = renderTemplateWithTokens(
      'Value: {{ money-in + unknown-token }}',
      {
        'money-in': '$100'
      }
    );

    expect(rendered).toBe('Value: {{ money-in + unknown-token }}');
  });

  test('resolves underscore token names for numeric helper vars', () => {
    const rendered = renderTemplateWithTokens(
      'Rows: {{ row_count }}, Months: {{ month_count }}, Tx: {{ transaction_count }}',
      {
        'row-count': '7',
        'month-count': '2',
        'transaction-count': '12'
      }
    );

    expect(rendered).toBe('Rows: 7, Months: 2, Tx: 12');
  });
});
