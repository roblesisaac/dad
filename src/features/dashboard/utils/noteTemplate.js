const TEMPLATE_TOKEN_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;
const EXPRESSION_OPERATOR_PATTERN = /[+\-*/()]/;
const NUMBER_PATTERN = /^(?:\d+\.?\d*|\.\d+)$/;

function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

export function normalizeTemplateToken(token) {
  return String(token || '')
    .trim()
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
  drillGroups = [],
  formatAmount = (amount) => String(amount)
} = {}) {
  const tokenMap = {};

  addToken(tokenMap, 'selected-tab', selectedTabLabel);
  addToken(tokenMap, 'selected-account', selectedGroupLabel);
  addToken(tokenMap, 'selected-level', selectedDrillLabel);
  addToken(tokenMap, 'date', dateLabel);
  addToken(tokenMap, 'total', totalLabel);

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

function buildNumericTokenMap(tokenMap = {}) {
  const numericTokens = {};

  for (const [token, value] of Object.entries(tokenMap)) {
    const parsedNumber = parseTokenNumber(value);
    if (parsedNumber === null) {
      continue;
    }

    numericTokens[token] = parsedNumber;
  }

  return numericTokens;
}

function tokenizeExpression(expression, numericTokenMap = {}) {
  const tokens = [];
  const source = String(expression || '');
  let index = 0;

  while (index < source.length) {
    const current = source[index];

    if (/\s/.test(current)) {
      index += 1;
      continue;
    }

    if (['+', '-', '*', '/', '(', ')'].includes(current)) {
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

      tokens.push({ type: 'number', value: Number(rawNumber) });
      index = end;
      continue;
    }

    if (/[a-zA-Z_]/.test(current)) {
      let end = index + 1;
      while (end < source.length && /[a-zA-Z0-9_-]/.test(source[end])) {
        end += 1;
      }

      const rawIdentifier = source.slice(index, end);
      const normalizedIdentifier = normalizeTemplateToken(rawIdentifier);
      if (!normalizedIdentifier || !hasOwn(numericTokenMap, normalizedIdentifier)) {
        return null;
      }

      tokens.push({
        type: 'number',
        value: numericTokenMap[normalizedIdentifier]
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

    if (current.type === 'number') {
      consume();
      return current.value;
    }

    if (current.type === 'operator' && current.value === '(') {
      consume('(');
      const nestedValue = parseAddSub();
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
      return parseUnary();
    }

    if (current?.type === 'operator' && current.value === '-') {
      consume('-');
      const unaryValue = parseUnary();
      return unaryValue === null ? null : -unaryValue;
    }

    return parsePrimary();
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

      if (current.value === '*') {
        value *= rhs;
      } else {
        if (rhs === 0) {
          return null;
        }
        value /= rhs;
      }
    }

    return Number.isFinite(value) ? value : null;
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

      value = current.value === '+'
        ? value + rhs
        : value - rhs;
    }

    return Number.isFinite(value) ? value : null;
  }

  const result = parseAddSub();
  if (result === null || position !== tokens.length || !Number.isFinite(result)) {
    return null;
  }

  return result;
}

function evaluateTemplateExpression(expression, tokenMap = {}) {
  if (!EXPRESSION_OPERATOR_PATTERN.test(String(expression || ''))) {
    return null;
  }

  const numericTokenMap = buildNumericTokenMap(tokenMap);
  const tokens = tokenizeExpression(expression, numericTokenMap);
  if (!tokens) {
    return null;
  }

  return evaluateExpressionTokens(tokens);
}

export function renderTemplateWithTokens(template, tokenMap = {}, options = {}) {
  const {
    formatExpressionResult = formatExpressionNumber
  } = options;
  const safeTemplate = String(template ?? '');
  if (!safeTemplate.includes('{{')) {
    return safeTemplate;
  }

  return safeTemplate.replace(TEMPLATE_TOKEN_PATTERN, (match, rawToken) => {
    const normalizedToken = normalizeTemplateToken(rawToken);
    if (!normalizedToken || !hasOwn(tokenMap, normalizedToken)) {
      const expressionResult = evaluateTemplateExpression(rawToken, tokenMap);
      if (expressionResult === null) {
        return match;
      }

      const formattedExpression = String(formatExpressionResult(expressionResult) || '').trim();
      return formattedExpression || match;
    }

    return String(tokenMap[normalizedToken]);
  });
}
