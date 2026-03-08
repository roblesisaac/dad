const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function makeError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function nonEmptyString(value, fieldName) {
  if (typeof value !== 'string') {
    throw makeError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw makeError(`${fieldName} is required`);
  }

  return trimmed;
}

function optionalString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim();
}

function optionalStringList(value, { lowercase = false } = {}) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => optionalString(item))
    .filter(Boolean)
    .map((item) => (lowercase ? item.toLowerCase() : item));
}

function normalizeTotalDisplayType(value) {
  return optionalString(value).toLowerCase() === 'percentage'
    ? 'percentage'
    : 'dollar';
}

function normalizeManualAmountDisplayType(value) {
  const normalized = optionalString(value).toLowerCase();

  if (normalized === 'percentage') {
    return 'percentage';
  }

  if (normalized === 'none') {
    return 'none';
  }

  return 'dollar';
}

function normalizeManualAmountFormula(value) {
  const trimmed = optionalString(value);
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('=')) {
    return optionalString(trimmed.slice(1));
  }

  return trimmed;
}

function parseManualAmountFormulaFromAmount(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('=')) {
    return '';
  }

  return normalizeManualAmountFormula(trimmed);
}

function parseAmount(value) {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) {
    throw makeError('manual row amount must be a valid number');
  }

  return amount;
}

function parseOptionalNumber(value, fieldName, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw makeError(`${fieldName} must be a valid number`);
  }

  return parsed;
}

function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
}

function normalizeDate(value, fieldName) {
  const date = nonEmptyString(value, fieldName);
  if (!isValidDateString(date)) {
    throw makeError(`${fieldName} must be a valid date in YYYY-MM-DD format`);
  }

  return date;
}

function normalizeRowId(rowId) {
  if (typeof rowId === 'string' && rowId.trim()) {
    return rowId.trim();
  }

  return `row_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSort(sort, fallback) {
  if (Number.isFinite(sort)) {
    return Number(sort);
  }

  const parsed = Number(sort);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalSort(sort) {
  if (sort === undefined || sort === null || sort === '') {
    return undefined;
  }

  const parsed = Number(sort);
  if (!Number.isFinite(parsed)) {
    throw makeError('sort must be a valid number');
  }

  return parsed;
}

function normalizeTabRow(row, fallbackSort) {
  const drillPath = optionalStringList(row?.drillPath, { lowercase: true });
  const drillPathLabels = optionalStringList(row?.drillPathLabels);

  const normalized = {
    rowId: normalizeRowId(row?.rowId),
    type: 'tab',
    tabId: nonEmptyString(row?.tabId, 'tab row tabId'),
    groupId: nonEmptyString(row?.groupId, 'tab row groupId'),
    dateStart: normalizeDate(row?.dateStart, 'tab row dateStart'),
    dateEnd: normalizeDate(row?.dateEnd, 'tab row dateEnd'),
    drillPath,
    drillPathLabels: drillPath.length ? drillPathLabels.slice(0, drillPath.length) : [],
    savedTotal: parseOptionalNumber(row?.savedTotal, 'tab row savedTotal', 0),
    sort: normalizeSort(row?.sort, fallbackSort)
  };

  if (normalized.dateStart > normalized.dateEnd) {
    throw makeError('tab row dateStart must be less than or equal to dateEnd');
  }

  return normalized;
}

function normalizeManualRow(row, fallbackSort) {
  const normalizedAmountFormula = normalizeManualAmountFormula(
    row?.amountFormula ?? parseManualAmountFormulaFromAmount(row?.amount)
  );

  return {
    rowId: normalizeRowId(row?.rowId),
    type: 'manual',
    title: nonEmptyString(row?.title, 'manual row title'),
    amount: parseAmount(normalizedAmountFormula ? 0 : row?.amount),
    amountFormula: normalizedAmountFormula,
    amountDisplayType: normalizeManualAmountDisplayType(row?.amountDisplayType),
    sort: normalizeSort(row?.sort, fallbackSort)
  };
}

function normalizeReportRow(row, fallbackSort) {
  return {
    rowId: normalizeRowId(row?.rowId),
    type: 'report',
    reportId: nonEmptyString(row?.reportId, 'report row reportId'),
    reportName: optionalString(row?.reportName),
    savedTotal: parseOptionalNumber(row?.savedTotal, 'report row savedTotal', 0),
    sort: normalizeSort(row?.sort, fallbackSort)
  };
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) {
    throw makeError('rows must be an array');
  }

  const normalizedRows = rows.map((row, index) => {
    const type = optionalString(row?.type);

    if (type === 'tab') {
      return normalizeTabRow(row, index);
    }

    if (type === 'manual') {
      return normalizeManualRow(row, index);
    }

    if (type === 'report') {
      return normalizeReportRow(row, index);
    }

    throw makeError(`row type '${type || 'unknown'}' is invalid`);
  });

  return normalizedRows
    .sort((a, b) => a.sort - b.sort)
    .map((row, index) => ({ ...row, sort: index }));
}

export function normalizeReportPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw makeError('report payload is required');
  }

  const name = nonEmptyString(payload.name, 'name');
  const folderName = optionalString(payload.folderName);
  const totalFormula = optionalString(payload.totalFormula);
  const totalDisplayType = normalizeTotalDisplayType(payload.totalDisplayType);
  const rows = normalizeRows(payload.rows);
  const sort = parseOptionalSort(payload.sort);

  const normalized = {
    name,
    folderName,
    totalFormula,
    totalDisplayType,
    rows
  };

  if (sort !== undefined) {
    normalized.sort = sort;
  }

  return normalized;
}

export function isReportOwnedByUser(report, userId) {
  return Boolean(report && report.userId === userId);
}
