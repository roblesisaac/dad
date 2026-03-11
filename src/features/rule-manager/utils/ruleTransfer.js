const SUPPORTED_RULE_TYPES = new Set(['groupBy', 'sort', 'categorize', 'filter']);

export const RULE_TRANSFER_FORMATS = Object.freeze(['json', 'csv', 'markdown']);

export const RULE_TRANSFER_COLUMNS = Object.freeze([
  '_id',
  'rule_id',
  'rule_json',
  'filter_join_operator',
  'is_important',
  'order_of_execution',
  'apply_for_tabs_json'
]);

const RULE_TYPE_LABELS = Object.freeze({
  groupBy: 'Group By',
  sort: 'Sort',
  categorize: 'Categorize',
  filter: 'Filter'
});

function normalizeRuleType(value) {
  const normalized = String(value || '').trim();
  if (normalized === 'custom') {
    return 'categorize';
  }

  return SUPPORTED_RULE_TYPES.has(normalized)
    ? normalized
    : '';
}

function normalizeRuleArray(value) {
  return Array.isArray(value)
    ? value.map(part => String(part ?? ''))
    : [];
}

function normalizeJoinOperator(value) {
  return String(value || '').toLowerCase() === 'or' ? 'or' : 'and';
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value || '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function normalizeOrder(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeApplyForTabs(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map(tabId => String(tabId || '')).filter(Boolean);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(tabId => String(tabId || '')).filter(Boolean);
      }
    } catch (_error) {
      return [];
    }
  }

  return Array.isArray(fallback)
    ? fallback.map(tabId => String(tabId || '')).filter(Boolean)
    : [];
}

function normalizeRuleObject(rule, options = {}) {
  const defaultApplyForTabs = Array.isArray(options.defaultApplyForTabs)
    ? options.defaultApplyForTabs
    : [];

  let normalizedRuleArray = normalizeRuleArray(rule?.rule);
  if (!normalizedRuleArray.length && typeof rule?.rule_json === 'string') {
    try {
      normalizedRuleArray = normalizeRuleArray(JSON.parse(rule.rule_json));
    } catch (_error) {
      normalizedRuleArray = [];
    }
  }

  const normalizedRuleType = normalizeRuleType(normalizedRuleArray[0]);
  if (!normalizedRuleType) {
    return null;
  }

  normalizedRuleArray[0] = normalizedRuleType;

  const primaryId = String(rule?._id || '').trim();
  const secondaryId = String(rule?.rule_id || '').trim();
  const resolvedId = primaryId || secondaryId;

  return {
    _id: resolvedId,
    rule_id: secondaryId || resolvedId,
    rule: normalizedRuleArray,
    filterJoinOperator: normalizeJoinOperator(
      rule?.filterJoinOperator ?? rule?.filter_join_operator
    ),
    _isImportant: normalizeBoolean(rule?._isImportant ?? rule?.is_important),
    orderOfExecution: normalizeOrder(rule?.orderOfExecution ?? rule?.order_of_execution),
    applyForTabs: normalizeApplyForTabs(
      rule?.applyForTabs ?? rule?.apply_for_tabs_json,
      defaultApplyForTabs
    )
  };
}

function escapeCsvCell(value) {
  const normalizedValue = String(value ?? '');
  if (!/[",\n\r]/.test(normalizedValue)) {
    return normalizedValue;
  }

  return `"${normalizedValue.replace(/"/g, '""')}"`;
}

function parseCsvRecords(rawText = '') {
  const input = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  if (!input.trim()) {
    return [];
  }

  const records = [];
  let currentRecord = [];
  let currentCell = '';
  let isInsideQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (char === '"') {
      const nextChar = input[index + 1];
      if (isInsideQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
        continue;
      }

      isInsideQuotes = !isInsideQuotes;
      continue;
    }

    if (char === ',' && !isInsideQuotes) {
      currentRecord.push(currentCell);
      currentCell = '';
      continue;
    }

    if (char === '\n' && !isInsideQuotes) {
      currentRecord.push(currentCell);
      records.push(currentRecord);
      currentRecord = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  currentRecord.push(currentCell);
  records.push(currentRecord);

  return records.filter((record, index) => {
    if (record.some(cell => String(cell || '').trim())) {
      return true;
    }

    return index < records.length - 1;
  });
}

function parseMarkdownRow(line = '') {
  const trimmed = String(line || '').trim();
  if (!trimmed) {
    return [];
  }

  let row = trimmed;
  if (row.startsWith('|')) {
    row = row.slice(1);
  }
  if (row.endsWith('|')) {
    row = row.slice(0, -1);
  }

  const cells = [];
  let cell = '';
  let isEscaping = false;

  for (const char of row) {
    if (isEscaping) {
      if (char === 'n') {
        cell += '\n';
      } else {
        cell += char;
      }
      isEscaping = false;
      continue;
    }

    if (char === '\\') {
      isEscaping = true;
      continue;
    }

    if (char === '|') {
      cells.push(cell.trim());
      cell = '';
      continue;
    }

    cell += char;
  }

  if (isEscaping) {
    cell += '\\';
  }

  cells.push(cell.trim());
  return cells;
}

function parseMarkdownRecords(rawText = '') {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const tableLines = lines.filter((line) => line.startsWith('|') && line.endsWith('|'));
  if (tableLines.length < 2) {
    return [];
  }

  const headers = parseMarkdownRow(tableLines[0]);
  const separatorCells = parseMarkdownRow(tableLines[1]);

  if (!headers.length || separatorCells.length !== headers.length) {
    throw new Error('Invalid markdown table format.');
  }

  const isSeparatorRow = separatorCells.every((cell) => /^:?-{3,}:?$/.test(cell));
  if (!isSeparatorRow) {
    throw new Error('Markdown table requires a separator row.');
  }

  const records = [];

  for (const line of tableLines.slice(2)) {
    const cells = parseMarkdownRow(line);
    if (!cells.length) {
      continue;
    }

    const normalizedCells = headers.map((_, index) => cells[index] ?? '');
    const record = {};
    headers.forEach((header, index) => {
      record[String(header || '').trim()] = normalizedCells[index];
    });
    records.push(record);
  }

  return records;
}

function normalizeRecordKeys(record = {}) {
  return Object.entries(record || {}).reduce((accumulator, [rawKey, value]) => {
    const key = String(rawKey || '').trim();
    if (!key) {
      return accumulator;
    }

    accumulator[key] = value;
    return accumulator;
  }, {});
}

function serializeCsvRecords(records = []) {
  if (!records.length) {
    return `${RULE_TRANSFER_COLUMNS.join(',')}\n`;
  }

  const headerLine = RULE_TRANSFER_COLUMNS.join(',');
  const rowLines = records.map((record) => {
    return RULE_TRANSFER_COLUMNS
      .map((column) => escapeCsvCell(record[column] ?? ''))
      .join(',');
  });

  return [headerLine, ...rowLines].join('\n');
}

function escapeMarkdownCell(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '\\n');
}

function serializeMarkdownRecords(records = []) {
  const headerLine = `| ${RULE_TRANSFER_COLUMNS.join(' | ')} |`;
  const separatorLine = `| ${RULE_TRANSFER_COLUMNS.map(() => '---').join(' | ')} |`;

  if (!records.length) {
    return [headerLine, separatorLine].join('\n');
  }

  const rowLines = records.map((record) => {
    const rowValues = RULE_TRANSFER_COLUMNS.map((column) => escapeMarkdownCell(record[column] ?? ''));
    return `| ${rowValues.join(' | ')} |`;
  });

  return [headerLine, separatorLine, ...rowLines].join('\n');
}

function toTransferRecord(rule = {}) {
  return {
    _id: String(rule._id || ''),
    rule_id: String(rule.rule_id || rule._id || ''),
    rule_json: JSON.stringify(Array.isArray(rule.rule) ? rule.rule : []),
    filter_join_operator: normalizeJoinOperator(rule.filterJoinOperator),
    is_important: rule._isImportant ? 'true' : 'false',
    order_of_execution: String(normalizeOrder(rule.orderOfExecution)),
    apply_for_tabs_json: JSON.stringify(Array.isArray(rule.applyForTabs) ? rule.applyForTabs : [])
  };
}

function parseDelimitedRuleRecords(records = [], options = {}) {
  const normalizedRecords = Array.isArray(records) ? records : [];
  const parsedRules = [];
  let invalidCount = 0;

  for (const rawRecord of normalizedRecords) {
    const record = normalizeRecordKeys(rawRecord);
    const normalizedRule = normalizeRuleObject(record, options);

    if (!normalizedRule) {
      invalidCount += 1;
      continue;
    }

    parsedRules.push(normalizedRule);
  }

  return {
    rules: parsedRules,
    invalidCount,
    totalCount: normalizedRecords.length,
    metadata: null
  };
}

export function ruleTransferFileExtension(format = 'json') {
  if (format === 'markdown') {
    return 'md';
  }

  if (format === 'csv') {
    return 'csv';
  }

  return 'json';
}

export function buildRuleExportContent(options = {}) {
  const {
    rules = [],
    format = 'json',
    includeMetadata = false,
    metadata = null,
    defaultApplyForTabs = []
  } = options;

  const normalizedRules = (Array.isArray(rules) ? rules : [])
    .map(rule => normalizeRuleObject(rule, { defaultApplyForTabs }))
    .filter(Boolean)
    .map((rule) => ({
      ...rule,
      rule_id: String(rule.rule_id || rule._id || '')
    }));

  if (format === 'csv') {
    const records = normalizedRules.map(toTransferRecord);
    return serializeCsvRecords(records);
  }

  if (format === 'markdown') {
    const records = normalizedRules.map(toTransferRecord);
    return serializeMarkdownRecords(records);
  }

  if (includeMetadata) {
    return JSON.stringify({
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      rules: normalizedRules
    }, null, 2);
  }

  return JSON.stringify(normalizedRules, null, 2);
}

export function parseRuleImportContent(rawText = '', format = 'json', options = {}) {
  const defaultApplyForTabs = Array.isArray(options.defaultApplyForTabs)
    ? options.defaultApplyForTabs
    : [];

  if (format === 'csv') {
    const records = parseCsvRecords(rawText);
    if (!records.length) {
      return {
        rules: [],
        invalidCount: 0,
        totalCount: 0,
        metadata: null
      };
    }

    const [headerRow, ...valueRows] = records;
    const headers = headerRow.map(header => String(header || '').trim());
    const mappedRecords = valueRows.map((row) => {
      return headers.reduce((record, header, index) => {
        record[header] = row[index] ?? '';
        return record;
      }, {});
    });

    return parseDelimitedRuleRecords(mappedRecords, { defaultApplyForTabs });
  }

  if (format === 'markdown') {
    const records = parseMarkdownRecords(rawText);
    return parseDelimitedRuleRecords(records, { defaultApplyForTabs });
  }

  let parsed;
  try {
    parsed = JSON.parse(String(rawText || ''));
  } catch (_error) {
    throw new Error('Invalid JSON file.');
  }

  const payloadRules = Array.isArray(parsed)
    ? parsed
    : (Array.isArray(parsed?.rules) ? parsed.rules : null);

  if (!Array.isArray(payloadRules)) {
    throw new Error('JSON must be an array of rules or an object with a rules array.');
  }

  const metadata = (!Array.isArray(parsed) && parsed && typeof parsed === 'object' && parsed.metadata)
    ? parsed.metadata
    : null;

  const rules = [];
  let invalidCount = 0;

  payloadRules.forEach((rule) => {
    const normalized = normalizeRuleObject(rule, { defaultApplyForTabs });
    if (!normalized) {
      invalidCount += 1;
      return;
    }

    rules.push(normalized);
  });

  return {
    rules,
    invalidCount,
    totalCount: payloadRules.length,
    metadata
  };
}

function cloneRule(rule) {
  return {
    ...rule,
    rule: Array.isArray(rule?.rule) ? [...rule.rule] : []
  };
}

function ensureRulesByType(rulesByType = {}) {
  return {
    groupBy: Array.isArray(rulesByType.groupBy) ? rulesByType.groupBy.map(cloneRule) : [],
    sort: Array.isArray(rulesByType.sort) ? rulesByType.sort.map(cloneRule) : [],
    categorize: Array.isArray(rulesByType.categorize) ? rulesByType.categorize.map(cloneRule) : [],
    filter: Array.isArray(rulesByType.filter) ? rulesByType.filter.map(cloneRule) : []
  };
}

function resolveCreateRuleId(typeId, candidateIds = [], usedIds = new Set()) {
  for (const candidateId of candidateIds) {
    const normalizedCandidate = String(candidateId || '').trim();
    if (!normalizedCandidate || usedIds.has(normalizedCandidate)) {
      continue;
    }

    usedIds.add(normalizedCandidate);
    return normalizedCandidate;
  }

  let suffix = 1;
  let generatedId = `${typeId}-import-${suffix}`;
  while (usedIds.has(generatedId)) {
    suffix += 1;
    generatedId = `${typeId}-import-${suffix}`;
  }

  usedIds.add(generatedId);
  return generatedId;
}

function normalizeMergeSummaryByType() {
  return {
    groupBy: { updates: 0, creates: 0 },
    sort: { updates: 0, creates: 0 },
    categorize: { updates: 0, creates: 0 },
    filter: { updates: 0, creates: 0 }
  };
}

export function mergeImportedRules(options = {}) {
  const {
    existingRulesByType = {},
    importedRules = []
  } = options;

  const nextRulesByType = ensureRulesByType(existingRulesByType);
  const summaryByType = normalizeMergeSummaryByType();
  const usedIds = new Set();

  Object.values(nextRulesByType).flat().forEach((rule) => {
    const ruleId = String(rule?._id || '').trim();
    if (ruleId) {
      usedIds.add(ruleId);
    }
  });

  let updates = 0;
  let creates = 0;
  let skippedGlobal = 0;
  let skippedInvalid = 0;

  for (const importedRule of Array.isArray(importedRules) ? importedRules : []) {
    const normalizedRule = normalizeRuleObject(importedRule);
    if (!normalizedRule) {
      skippedInvalid += 1;
      continue;
    }

    if (normalizedRule.applyForTabs.includes('_GLOBAL')) {
      skippedGlobal += 1;
      continue;
    }

    const normalizedType = normalizeRuleType(normalizedRule.rule?.[0]);
    if (!normalizedType) {
      skippedInvalid += 1;
      continue;
    }

    const targetRules = nextRulesByType[normalizedType] || [];
    const importedId = String(normalizedRule._id || '').trim();
    const importedRuleId = String(normalizedRule.rule_id || '').trim();

    let targetIndex = -1;

    if (importedId) {
      targetIndex = targetRules.findIndex(rule => String(rule?._id || '').trim() === importedId);
    }

    if (targetIndex === -1 && importedRuleId) {
      targetIndex = targetRules.findIndex(rule => String(rule?._id || '').trim() === importedRuleId);
    }

    if (targetIndex >= 0) {
      const existingRule = targetRules[targetIndex];
      targetRules[targetIndex] = {
        ...existingRule,
        _id: String(existingRule?._id || importedId || importedRuleId || ''),
        rule: [...normalizedRule.rule],
        filterJoinOperator: normalizeJoinOperator(normalizedRule.filterJoinOperator),
        _isImportant: Boolean(normalizedRule._isImportant),
        orderOfExecution: normalizeOrder(existingRule?.orderOfExecution)
      };
      updates += 1;
      summaryByType[normalizedType].updates += 1;
      continue;
    }

    const createId = resolveCreateRuleId(
      normalizedType,
      [importedId, importedRuleId],
      usedIds
    );

    targetRules.push({
      _id: createId,
      rule: [...normalizedRule.rule],
      filterJoinOperator: normalizeJoinOperator(normalizedRule.filterJoinOperator),
      _isImportant: Boolean(normalizedRule._isImportant),
      orderOfExecution: normalizeOrder(normalizedRule.orderOfExecution)
    });
    creates += 1;
    summaryByType[normalizedType].creates += 1;
  }

  Object.keys(nextRulesByType).forEach((typeId) => {
    nextRulesByType[typeId] = nextRulesByType[typeId]
      .map((ruleConfig, index) => ({
        ...ruleConfig,
        orderOfExecution: index
      }));
  });

  if (nextRulesByType.groupBy.length > 1) {
    nextRulesByType.groupBy = [
      {
        ...nextRulesByType.groupBy[0],
        orderOfExecution: 0
      }
    ];
  }

  return {
    rulesByType: nextRulesByType,
    summary: {
      updates,
      creates,
      skippedGlobal,
      skippedInvalid,
      applied: updates + creates,
      byType: summaryByType,
      labels: RULE_TYPE_LABELS
    }
  };
}
