const TEMPLATE_TOKEN_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;
const NUMBER_PATTERN = /^(?:\d+\.?\d*|\.\d+)$/;

function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

export function normalizeTemplateToken(token) {
  return String(token || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function addToken(tokenMap, rawToken, value) {
  const token = normalizeTemplateToken(rawToken);
  if (!token || value === null || value === undefined) {
    return;
  }

  tokenMap[token] = String(value);
}

export function buildDynamicNoteTokens({
  selectedTabLabel = '',
  selectedGroupLabel = '',
  selectedDrillLabel = '',
  dateLabel = '',
  totalLabel = '',
  monthCount = 0,
  rowCount = 0,
  transactionCount = 0,
  averageLabel = '',
  drillGroups = [],
  formatAmount = (amount) => String(amount)
} = {}) {
  const tokenMap = {};

  addToken(tokenMap, 'selected-tab', selectedTabLabel);
  addToken(tokenMap, 'selected-account', selectedGroupLabel);
  addToken(tokenMap, 'selected-level', selectedDrillLabel);
  addToken(tokenMap, 'date', dateLabel);
  addToken(tokenMap, 'total', totalLabel);
  addToken(tokenMap, 'month-count', monthCount);
  addToken(tokenMap, 'row-count', rowCount);
  addToken(tokenMap, 'transaction-count', transactionCount);
  addToken(tokenMap, 'average', averageLabel);

  for (const group of Array.isArray(drillGroups) ? drillGroups : []) {
    const labelToken = normalizeTemplateToken(group?.label);
    const rawTotal = Number(group?.total);
    if (!labelToken || !Number.isFinite(rawTotal)) {
      continue;
    }

    addToken(tokenMap, labelToken, formatAmount(rawTotal));
  }

  return tokenMap;
}

function parseTokenNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalizedValue = String(value ?? '')
    .trim()
    .replace(/,/g, '')
    .replace(/\$/g, '');
  if (!normalizedValue) {
    return null;
  }

  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatExpressionNumber(value) {
  if (!Number.isFinite(value)) {
    return '';
  }

  const roundedToCents = Math.round(value * 100) / 100;
  return roundedToCents.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function tokenizeExpression(expression, tokenMap = {}) {
  const tokens = [];
  const source = String(expression || '');
  let index = 0;

  while (index < source.length) {
    const current = source[index];

    if (/\s/.test(current)) {
      index += 1;
      continue;
    }

    const twoCharOperator = source.slice(index, index + 2);
    if (['<=', '>=', '==', '!=', '&&', '||'].includes(twoCharOperator)) {
      tokens.push({ type: 'operator', value: twoCharOperator });
      index += 2;
      continue;
    }

    if (['+', '-', '*', '/', '(', ')', '?', ':', '<', '>', '!'].includes(current)) {
      tokens.push({ type: 'operator', value: current });
      index += 1;
      continue;
    }

    if (/\d|\./.test(current)) {
      let end = index + 1;
      while (end < source.length && /[\d.]/.test(source[end])) {
        end += 1;
      }

      const rawNumber = source.slice(index, end);
      if (!NUMBER_PATTERN.test(rawNumber)) {
        return null;
      }

      tokens.push({ type: 'value', value: Number(rawNumber) });
      index = end;
      continue;
    }

    if (current === '\'' || current === '"') {
      const quote = current;
      let end = index + 1;
      let parsed = '';

      while (end < source.length) {
        const char = source[end];
        if (char === '\\') {
          if (end + 1 >= source.length) {
            return null;
          }
          const escaped = source[end + 1];
          if (escaped === 'n') {
            parsed += '\n';
          } else if (escaped === 't') {
            parsed += '\t';
          } else {
            parsed += escaped;
          }
          end += 2;
          continue;
        }

        if (char === quote) {
          tokens.push({ type: 'value', value: parsed });
          index = end + 1;
          break;
        }

        parsed += char;
        end += 1;
      }

      if (index <= end) {
        return null;
      }

      continue;
    }

    if (/[a-zA-Z_]/.test(current)) {
      let end = index + 1;
      while (end < source.length && /[a-zA-Z0-9_-]/.test(source[end])) {
        end += 1;
      }

      const rawIdentifier = source.slice(index, end);
      const normalizedIdentifier = normalizeTemplateToken(rawIdentifier);
      if (!normalizedIdentifier) {
        return null;
      }

      if (normalizedIdentifier === 'true') {
        tokens.push({ type: 'value', value: true });
        index = end;
        continue;
      }

      if (normalizedIdentifier === 'false') {
        tokens.push({ type: 'value', value: false });
        index = end;
        continue;
      }

      if (normalizedIdentifier === 'null') {
        tokens.push({ type: 'value', value: null });
        index = end;
        continue;
      }

      if (!hasOwn(tokenMap, normalizedIdentifier)) {
        return null;
      }

      const tokenValue = tokenMap[normalizedIdentifier];
      tokens.push({
        type: 'value',
        value: tokenValue
      });
      index = end;
      continue;
    }

    return null;
  }

  return tokens;
}

function evaluateExpressionTokens(tokens = []) {
  if (!Array.isArray(tokens) || !tokens.length) {
    return null;
  }

  let position = 0;

  function peek() {
    return tokens[position] || null;
  }

  function consume(expectedValue = '') {
    const current = peek();
    if (!current) {
      return null;
    }

    if (expectedValue && current.value !== expectedValue) {
      return null;
    }

    position += 1;
    return current;
  }

  function parsePrimary() {
    const current = peek();
    if (!current) {
      return null;
    }

    if (current.type === 'value') {
      consume();
      return current.value;
    }

    if (current.type === 'operator' && current.value === '(') {
      consume('(');
      const nestedValue = parseTernary();
      if (nestedValue === null || !consume(')')) {
        return null;
      }
      return nestedValue;
    }

    return null;
  }

  function parseUnary() {
    const current = peek();
    if (current?.type === 'operator' && current.value === '+') {
      consume('+');
      const unaryValue = parseUnary();
      return parseTokenNumber(unaryValue);
    }

    if (current?.type === 'operator' && current.value === '-') {
      consume('-');
      const unaryValue = parseUnary();
      const parsedNumber = parseTokenNumber(unaryValue);
      return parsedNumber === null ? null : -parsedNumber;
    }

    if (current?.type === 'operator' && current.value === '!') {
      consume('!');
      const unaryValue = parseUnary();
      if (unaryValue === null) {
        return null;
      }
      return !coerceBoolean(unaryValue);
    }

    return parsePrimary();
  }

  function coerceBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }

    const parsedNumber = parseTokenNumber(value);
    if (parsedNumber !== null) {
      return parsedNumber !== 0;
    }

    if (value === null || value === undefined) {
      return false;
    }

    const normalized = String(value).trim().toLowerCase();
    if (!normalized || normalized === 'false' || normalized === 'null' || normalized === 'undefined' || normalized === 'no') {
      return false;
    }

    return true;
  }

  function stringifyExpressionValue(value) {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  }

  function evaluateAddOperator(lhs, rhs) {
    const leftNumber = parseTokenNumber(lhs);
    const rightNumber = parseTokenNumber(rhs);
    if (leftNumber !== null && rightNumber !== null) {
      return leftNumber + rightNumber;
    }

    return `${stringifyExpressionValue(lhs)}${stringifyExpressionValue(rhs)}`;
  }

  function evaluateNumericBinaryOperator(lhs, rhs, operator) {
    const left = parseTokenNumber(lhs);
    const right = parseTokenNumber(rhs);
    if (left === null || right === null) {
      return null;
    }

    if (operator === '-') {
      return left - right;
    }

    if (operator === '*') {
      return left * right;
    }

    if (right === 0) {
      return null;
    }

    return left / right;
  }

  function evaluateComparison(lhs, rhs, operator) {
    const leftNumber = parseTokenNumber(lhs);
    const rightNumber = parseTokenNumber(rhs);
    if (leftNumber !== null && rightNumber !== null) {
      if (operator === '<') return leftNumber < rightNumber;
      if (operator === '<=') return leftNumber <= rightNumber;
      if (operator === '>') return leftNumber > rightNumber;
      return leftNumber >= rightNumber;
    }

    const leftString = String(lhs ?? '');
    const rightString = String(rhs ?? '');
    if (operator === '<') return leftString < rightString;
    if (operator === '<=') return leftString <= rightString;
    if (operator === '>') return leftString > rightString;
    return leftString >= rightString;
  }

  function evaluateEquality(lhs, rhs, operator) {
    const leftNumber = parseTokenNumber(lhs);
    const rightNumber = parseTokenNumber(rhs);
    let isEqual;
    if (leftNumber !== null && rightNumber !== null) {
      isEqual = leftNumber === rightNumber;
    } else if (typeof lhs === 'boolean' || typeof rhs === 'boolean') {
      isEqual = coerceBoolean(lhs) === coerceBoolean(rhs);
    } else {
      isEqual = String(lhs ?? '') === String(rhs ?? '');
    }

    return operator === '!=' ? !isEqual : isEqual;
  }

  function parseMulDiv() {
    let value = parseUnary();
    if (value === null) {
      return null;
    }

    while (true) {
      const current = peek();
      if (!current || current.type !== 'operator' || (current.value !== '*' && current.value !== '/')) {
        break;
      }

      consume();
      const rhs = parseUnary();
      if (rhs === null) {
        return null;
      }

      const nextValue = evaluateNumericBinaryOperator(value, rhs, current.value);
      if (nextValue === null || !Number.isFinite(nextValue)) {
        return null;
      }
      value = nextValue;
    }

    return value;
  }

  function parseAddSub() {
    let value = parseMulDiv();
    if (value === null) {
      return null;
    }

    while (true) {
      const current = peek();
      if (!current || current.type !== 'operator' || (current.value !== '+' && current.value !== '-')) {
        break;
      }

      consume();
      const rhs = parseMulDiv();
      if (rhs === null) {
        return null;
      }

      if (current.value === '+') {
        value = evaluateAddOperator(value, rhs);
        continue;
      }

      const nextValue = evaluateNumericBinaryOperator(value, rhs, current.value);
      if (nextValue === null || !Number.isFinite(nextValue)) {
        return null;
      }
      value = nextValue;
    }

    return value;
  }

  function parseComparison() {
    let value = parseAddSub();
    if (value === null) {
      return null;
    }

    while (true) {
      const current = peek();
      if (!current || current.type !== 'operator' || !['<', '<=', '>', '>='].includes(current.value)) {
        break;
      }

      consume();
      const rhs = parseAddSub();
      if (rhs === null) {
        return null;
      }

      value = evaluateComparison(value, rhs, current.value);
    }

    return value;
  }

  function parseEquality() {
    let value = parseComparison();
    if (value === null) {
      return null;
    }

    while (true) {
      const current = peek();
      if (!current || current.type !== 'operator' || (current.value !== '==' && current.value !== '!=')) {
        break;
      }

      consume();
      const rhs = parseComparison();
      if (rhs === null) {
        return null;
      }

      value = evaluateEquality(value, rhs, current.value);
    }

    return value;
  }

  function parseLogicalAnd() {
    let value = parseEquality();
    if (value === null) {
      return null;
    }

    while (true) {
      const current = peek();
      if (!current || current.type !== 'operator' || current.value !== '&&') {
        break;
      }

      consume();
      const rhs = parseEquality();
      if (rhs === null) {
        return null;
      }

      value = coerceBoolean(value) && coerceBoolean(rhs);
    }

    return value;
  }

  function parseLogicalOr() {
    let value = parseLogicalAnd();
    if (value === null) {
      return null;
    }

    while (true) {
      const current = peek();
      if (!current || current.type !== 'operator' || current.value !== '||') {
        break;
      }

      consume();
      const rhs = parseLogicalAnd();
      if (rhs === null) {
        return null;
      }

      value = coerceBoolean(value) || coerceBoolean(rhs);
    }

    return value;
  }

  function parseTernary() {
    const condition = parseLogicalOr();
    if (condition === null) {
      return null;
    }

    const current = peek();
    if (!current || current.type !== 'operator' || current.value !== '?') {
      return condition;
    }

    consume('?');
    const truthyBranch = parseTernary();
    if (truthyBranch === null || !consume(':')) {
      return null;
    }
    const falsyBranch = parseTernary();
    if (falsyBranch === null) {
      return null;
    }

    return coerceBoolean(condition) ? truthyBranch : falsyBranch;
  }

  const result = parseTernary();
  if (result === null || position !== tokens.length) {
    return null;
  }

  return result;
}

function evaluateTemplateExpression(expression, tokenMap = {}) {
  const tokens = tokenizeExpression(expression, tokenMap);
  if (!tokens) {
    return null;
  }

  return evaluateExpressionTokens(tokens);
}

function formatExpressionValue(value, formatExpressionResult) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(formatExpressionResult(value) || '').trim();
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

export function renderTemplateWithTokens(template, tokenMap = {}, options = {}) {
  const {
    formatExpressionResult = formatExpressionNumber,
    wrapInterpolated = false
  } = options;
  const safeTemplate = String(template ?? '');
  if (!safeTemplate.includes('{{')) {
    return safeTemplate;
  }

  return safeTemplate.replace(TEMPLATE_TOKEN_PATTERN, (match, rawToken) => {
    const normalizedToken = normalizeTemplateToken(rawToken);
    let value = match;

    if (!normalizedToken || !hasOwn(tokenMap, normalizedToken)) {
      const expressionResult = evaluateTemplateExpression(rawToken, tokenMap);
      if (expressionResult !== null) {
        value = formatExpressionValue(expressionResult, formatExpressionResult);
      }
    } else {
      value = String(tokenMap[normalizedToken]);
    }

    if (wrapInterpolated && value !== match) {
      return `<span class="rule-part">${value}</span>`;
    }

    return value;
  });
}
