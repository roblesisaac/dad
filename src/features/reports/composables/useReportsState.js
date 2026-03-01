import { computed, reactive } from 'vue';
import { format, startOfMonth } from 'date-fns';
import { useReportsAPI } from '@/features/reports/composables/useReportsAPI.js';
import { useTabsAPI } from '@/features/tabs/composables/useTabsAPI.js';
import { useRulesAPI } from '@/features/rule-manager/composables/useRulesAPI.js';
import { useGroupsAPI } from '@/features/select-group/composables/useGroupsAPI.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';
import { useTransactions } from '@/features/dashboard/composables/useTransactions.js';
import {
  buildDefaultRuleMethods,
  buildTabRulesForId,
  evaluateTabData
} from '@/features/tabs/utils/tabEvaluator.js';

export function toYyyyMmDd(dateValue = new Date()) {
  return format(dateValue, 'yyyy-MM-dd');
}

export function buildTransactionsCacheKey(groupId, dateStart, dateEnd) {
  return `${groupId || ''}|${dateStart || ''}|${dateEnd || ''}`;
}

export function buildRowStateKey(reportId, rowId) {
  return `${reportId || ''}:${rowId || ''}`;
}

export function normalizeRowsForLocal(rows = []) {
  if (!Array.isArray(rows)) {
    return [];
  }

  const normalized = rows.map((row, index) => {
    const rowId = typeof row?.rowId === 'string' && row.rowId.trim()
      ? row.rowId.trim()
      : `row_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    if (row?.type === 'tab') {
      return {
        rowId,
        type: 'tab',
        tabId: typeof row.tabId === 'string' ? row.tabId : '',
        groupId: typeof row.groupId === 'string' ? row.groupId : '',
        dateStart: typeof row.dateStart === 'string' ? row.dateStart : '',
        dateEnd: typeof row.dateEnd === 'string' ? row.dateEnd : '',
        savedTotal: Number.isFinite(Number(row.savedTotal)) ? Number(row.savedTotal) : 0,
        sort: Number.isFinite(row.sort) ? row.sort : index
      };
    }

    if (row?.type === 'report') {
      return {
        rowId,
        type: 'report',
        reportId: typeof row.reportId === 'string' ? row.reportId : '',
        reportName: typeof row.reportName === 'string' ? row.reportName : '',
        savedTotal: Number.isFinite(Number(row.savedTotal)) ? Number(row.savedTotal) : 0,
        sort: Number.isFinite(row.sort) ? row.sort : index
      };
    }

    return {
      rowId,
      type: 'manual',
      title: typeof row?.title === 'string' ? row.title : '',
      amount: Number.isFinite(Number(row?.amount)) ? Number(row.amount) : 0,
      sort: Number.isFinite(row?.sort) ? row.sort : index
    };
  });

  return normalized
    .sort((a, b) => a.sort - b.sort)
    .map((row, index) => ({ ...row, sort: index }));
}

export function normalizeReportsForLocal(reports = []) {
  if (!Array.isArray(reports)) {
    return [];
  }

  const normalized = reports.map((report, index) => ({
    ...report,
    folderName: typeof report?.folderName === 'string' ? report.folderName.trim() : '',
    sort: Number.isFinite(Number(report?.sort)) ? Number(report.sort) : index,
    rows: normalizeRowsForLocal(report?.rows)
  }));

  return normalized
    .sort((a, b) => a.sort - b.sort)
    .map((report, index) => ({
      ...report,
      sort: index
    }));
}

export function calculateReportTotal(rows = [], rowAmountByRowId = null) {
  return rows.reduce((total, row) => {
    if (row.type === 'manual') {
      const manualAmount = Number(row.amount);
      return total + (Number.isFinite(manualAmount) ? manualAmount : 0);
    }

    const mappedAmount = rowAmountByRowId ? Number(rowAmountByRowId[row.rowId]) : Number.NaN;
    const savedAmount = Number(row.savedTotal);
    const rowAmount = Number.isFinite(mappedAmount) ? mappedAmount : savedAmount;
    return total + (Number.isFinite(rowAmount) ? rowAmount : 0);
  }, 0);
}

export function useReportsState() {
  const reportsAPI = useReportsAPI();
  const tabsAPI = useTabsAPI();
  const rulesAPI = useRulesAPI();
  const groupsAPI = useGroupsAPI();
  const { state: dashboardState } = useDashboardState();
  const { fetchTransactions } = useTransactions();

  const ruleMethods = buildDefaultRuleMethods();

  const state = reactive({
    isLoading: false,
    error: null,
    reports: [],
    allUserTabs: [],
    allUserRules: [],
    allUserGroups: [],
    allUserAccounts: [],
    reportTotalsById: {},
    rowIssuesByKey: {},
    saveStatusByReportId: {}
  });

  const transactionsCache = reactive({});

  const sortedTabs = computed(() =>
    [...state.allUserTabs].sort((a, b) => String(a.tabName || '').localeCompare(String(b.tabName || '')))
  );

  const sortedGroups = computed(() =>
    [...state.allUserGroups].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
  );

  const hasReports = computed(() => state.reports.length > 0);

  function findReport(reportId) {
    return state.reports.find(report => report._id === reportId);
  }

  function isDraftReport(report) {
    return Boolean(report?.isDraft || String(report?._id || '').startsWith('draft_'));
  }

  function clearReportRowIssues(reportId) {
    const prefix = `${reportId}:`;

    Object.keys(state.rowIssuesByKey).forEach((key) => {
      if (key.startsWith(prefix)) {
        delete state.rowIssuesByKey[key];
      }
    });
  }

  function resetTransactionsCache() {
    Object.keys(transactionsCache).forEach((key) => {
      delete transactionsCache[key];
    });
  }

  function setReportTotal(reportId) {
    const report = findReport(reportId);
    if (!report) return;

    state.reportTotalsById[reportId] = calculateReportTotal(report.rows);
  }

  function applyRowIssues(reportId, issuesByRowId = {}) {
    clearReportRowIssues(reportId);

    Object.entries(issuesByRowId).forEach(([rowId, issue]) => {
      state.rowIssuesByKey[buildRowStateKey(reportId, rowId)] = issue || '';
    });
  }

  function replaceReports(nextReports = []) {
    state.reports = normalizeReportsForLocal(nextReports);

    state.reports.forEach((report) => {
      if (!state.saveStatusByReportId[report._id]) {
        state.saveStatusByReportId[report._id] = 'idle';
      }

      setReportTotal(report._id);
    });
  }

  function getDefaultGroupId() {
    const selectedGroupId = dashboardState.selected?.group?._id;
    if (selectedGroupId) {
      return selectedGroupId;
    }

    return state.allUserGroups[0]?._id || '';
  }

  function getDefaultTabId() {
    return sortedTabs.value[0]?._id || '';
  }

  function getDefaultReferenceReportId(currentReportId = '') {
    const candidates = state.reports
      .filter(report => report?._id && report._id !== currentReportId);

    return candidates[0]?._id || '';
  }

  function createDefaultTabRow(sort = 0) {
    return {
      rowId: `row_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'tab',
      tabId: getDefaultTabId(),
      groupId: getDefaultGroupId(),
      dateStart: toYyyyMmDd(startOfMonth(new Date())),
      dateEnd: toYyyyMmDd(new Date()),
      savedTotal: 0,
      sort
    };
  }

  function createDefaultManualRow(sort = 0) {
    return {
      rowId: `row_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'manual',
      title: '',
      amount: 0,
      sort
    };
  }

  function createDefaultReportRow(currentReportId, sort = 0) {
    const referenceReportId = getDefaultReferenceReportId(currentReportId);
    const referenceReport = findReport(referenceReportId);

    return {
      rowId: `row_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'report',
      reportId: referenceReportId,
      reportName: referenceReport?.name || '',
      savedTotal: Number(getReportTotal(referenceReportId)) || 0,
      sort
    };
  }

  async function fetchTransactionsForRowContext(groupId, dateStart, dateEnd) {
    const cacheKey = buildTransactionsCacheKey(groupId, dateStart, dateEnd);

    if (transactionsCache[cacheKey]?.data) {
      return transactionsCache[cacheKey].data;
    }

    if (transactionsCache[cacheKey]?.promise) {
      return await transactionsCache[cacheKey].promise;
    }

    const group = state.allUserGroups.find(item => item._id === groupId);
    const accounts = Array.isArray(group?.accounts) ? group.accounts : [];

    if (!accounts.length || !dateStart || !dateEnd) {
      transactionsCache[cacheKey] = { data: [], promise: null };
      return [];
    }

    const promise = (async () => {
      const queryDate = `${dateStart}_${dateEnd}`;
      const accountRequests = accounts
        .map(account => account.account_id)
        .filter(Boolean)
        .map(accountId => fetchTransactions(accountId, queryDate));

      const responses = await Promise.all(accountRequests);
      const merged = [];

      responses.forEach((result) => {
        if (Array.isArray(result)) {
          merged.push(...result);
        }
      });

      const deduped = new Map();
      merged.forEach((transaction) => {
        const key = transaction.transaction_id
          || `${transaction.account_id}-${transaction.authorized_date}-${transaction.amount}-${transaction.name}`;

        deduped.set(key, transaction);
      });

      const data = [...deduped.values()];
      transactionsCache[cacheKey] = { data, promise: null };
      return data;
    })();

    transactionsCache[cacheKey] = { data: null, promise };

    try {
      return await promise;
    } catch (error) {
      transactionsCache[cacheKey] = { data: [], promise: null, error: error.message };
      throw error;
    }
  }

  async function evaluateTabRow(row) {
    const tab = state.allUserTabs.find(item => item._id === row.tabId);
    const group = state.allUserGroups.find(item => item._id === row.groupId);

    if (!tab) {
      return { amount: 0, issue: 'Tab not found' };
    }

    if (!group) {
      return { amount: 0, issue: 'Group not found' };
    }

    if (!row.dateStart || !row.dateEnd || row.dateStart > row.dateEnd) {
      return { amount: 0, issue: 'Invalid date range' };
    }

    try {
      const transactions = await fetchTransactionsForRowContext(
        row.groupId,
        row.dateStart,
        row.dateEnd
      );

      const tabRules = buildTabRulesForId(state.allUserRules, tab._id);
      const result = evaluateTabData({
        tab: { ...tab, isSelected: true },
        transactions,
        tabRules,
        ruleMethods
      });

      const safeAmount = Number.isFinite(Number(result.tabTotal)) ? Number(result.tabTotal) : 0;
      return { amount: safeAmount, issue: '' };
    } catch (error) {
      console.error(`Failed to evaluate report row '${row.rowId}'`, error);
      return { amount: 0, issue: 'Failed to load transactions' };
    }
  }

  function evaluateReportRow(currentReportId, row) {
    const linkedReportId = row?.reportId;

    if (!linkedReportId) {
      return { amount: 0, reportName: '', issue: 'Report is required' };
    }

    if (linkedReportId === currentReportId) {
      return { amount: 0, reportName: '', issue: 'Cannot reference the same report' };
    }

    const linkedReport = findReport(linkedReportId);
    if (!linkedReport) {
      return {
        amount: 0,
        reportName: row?.reportName || '',
        issue: 'Report not found'
      };
    }

    const linkedTotal = Number(getReportTotal(linkedReportId));
    const safeAmount = Number.isFinite(linkedTotal) ? linkedTotal : 0;

    return {
      amount: safeAmount,
      reportName: linkedReport.name || row?.reportName || '',
      issue: ''
    };
  }

  async function fetchReferenceData() {
    const [tabs, rules, groupData] = await Promise.all([
      tabsAPI.fetchUserTabs(),
      rulesAPI.fetchUserRules(),
      groupsAPI.fetchGroupsAndAccounts()
    ]);

    state.allUserTabs = tabs || [];
    state.allUserRules = rules || [];
    state.allUserGroups = (groupData.groups || []).sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
    state.allUserAccounts = groupData.accounts || [];
  }

  async function computeRowsWithSavedTotals(reportId, rows = []) {
    const normalizedRows = normalizeRowsForLocal(rows);
    const issuesByRowId = {};
    const nextRows = [];

    for (const row of normalizedRows) {
      if (row.type === 'manual') {
        issuesByRowId[row.rowId] = '';
        nextRows.push(row);
        continue;
      }

      if (row.type === 'report') {
        const { amount, reportName, issue } = evaluateReportRow(reportId, row);
        issuesByRowId[row.rowId] = issue || '';
        nextRows.push({
          ...row,
          reportName,
          savedTotal: amount
        });
        continue;
      }

      const { amount, issue } = await evaluateTabRow(row);
      issuesByRowId[row.rowId] = issue || '';
      nextRows.push({
        ...row,
        savedTotal: amount
      });
    }

    return {
      rows: normalizeRowsForLocal(nextRows),
      issuesByRowId
    };
  }

  function markSavedStatus(reportId) {
    state.saveStatusByReportId[reportId] = 'saved';
    setTimeout(() => {
      if (state.saveStatusByReportId[reportId] === 'saved') {
        state.saveStatusByReportId[reportId] = 'idle';
      }
    }, 1200);
  }

  async function saveReport(reportId, options = {}) {
    const report = findReport(reportId);
    if (!report) return null;

    const {
      status = 'saving',
      refreshDependencies = false,
      forceTransactionReload = false,
      localOnlyForDraft = false
    } = options;

    state.saveStatusByReportId[reportId] = status;

    try {
      if (refreshDependencies) {
        await fetchReferenceData();
      }

      if (forceTransactionReload) {
        resetTransactionsCache();
      }

      const { rows, issuesByRowId } = await computeRowsWithSavedTotals(reportId, report.rows);
      report.rows = rows;
      applyRowIssues(reportId, issuesByRowId);
      setReportTotal(reportId);

      if (isDraftReport(report)) {
        if (localOnlyForDraft) {
          markSavedStatus(reportId);
          return report;
        }

        const created = await reportsAPI.createReport({
          name: report.name,
          folderName: report.folderName || '',
          rows,
          sort: report.sort
        });

        const normalizedCreated = {
          ...created,
          rows: normalizeRowsForLocal(created.rows)
        };

        const reportIndex = state.reports.findIndex(item => item._id === reportId);
        if (reportIndex !== -1) {
          state.reports[reportIndex] = normalizedCreated;
        }

        replaceReports(state.reports);

        clearReportRowIssues(reportId);
        delete state.reportTotalsById[reportId];
        delete state.saveStatusByReportId[reportId];

        applyRowIssues(normalizedCreated._id, issuesByRowId);
        setReportTotal(normalizedCreated._id);
        markSavedStatus(normalizedCreated._id);

        return normalizedCreated;
      }

      const updated = await reportsAPI.updateReport(reportId, {
        name: report.name,
        folderName: report.folderName || '',
        rows,
        sort: report.sort
      });

      const reportIndex = state.reports.findIndex(item => item._id === reportId);
      if (reportIndex !== -1) {
        state.reports[reportIndex] = {
          ...updated,
          rows: normalizeRowsForLocal(updated.rows)
        };
      }

      replaceReports(state.reports);
      markSavedStatus(reportId);

      return updated;
    } catch (error) {
      console.error(`Failed to save report '${reportId}'`, error);
      state.saveStatusByReportId[reportId] = 'error';
      state.error = error.message || 'Failed to save report';
      return null;
    }
  }

  async function initReports() {
    state.isLoading = true;
    state.error = null;

    try {
      const [reports] = await Promise.all([
        reportsAPI.fetchReports(),
        fetchReferenceData()
      ]);
      replaceReports(reports || []);
    } catch (error) {
      console.error('Failed to initialize reports', error);
      state.error = error.message || 'Failed to initialize reports';
    } finally {
      state.isLoading = false;
    }
  }

  async function createReport(name) {
    try {
      const nextName = String(name || '').trim() || `Report ${state.reports.length + 1}`;
      const created = await reportsAPI.createReport({
        name: nextName,
        folderName: '',
        rows: [],
        sort: state.reports.length
      });

      replaceReports([...state.reports, created]);
      state.saveStatusByReportId[created._id] = 'idle';

      return findReport(created._id) || created;
    } catch (error) {
      console.error('Failed to create report', error);
      state.error = error.message || 'Failed to create report';
      return null;
    }
  }

  function buildCopyName(sourceName = '') {
    const normalizedSourceName = String(sourceName || '').trim() || 'Report';
    const baseName = `Copy of ${normalizedSourceName}`;
    const existingNames = new Set(
      state.reports.map(report => String(report?.name || '').trim().toLowerCase())
    );

    if (!existingNames.has(baseName.toLowerCase())) {
      return baseName;
    }

    let suffix = 2;
    while (existingNames.has(`${baseName} (${suffix})`.toLowerCase())) {
      suffix += 1;
    }

    return `${baseName} (${suffix})`;
  }

  async function duplicateReport(reportId) {
    const sourceReport = findReport(reportId);
    if (!sourceReport) return null;

    try {
      const created = await reportsAPI.createReport({
        name: buildCopyName(sourceReport.name),
        folderName: sourceReport.folderName || '',
        rows: normalizeRowsForLocal(sourceReport.rows),
        sort: state.reports.length
      });

      replaceReports([...state.reports, created]);
      state.saveStatusByReportId[created._id] = 'idle';

      return findReport(created._id) || created;
    } catch (error) {
      console.error('Failed to duplicate report', error);
      state.error = error.message || 'Failed to duplicate report';
      return null;
    }
  }

  function cancelDraftReport(reportId) {
    const report = findReport(reportId);
    if (!report || !isDraftReport(report)) {
      return false;
    }

    clearReportRowIssues(reportId);
    replaceReports(state.reports.filter(item => item._id !== reportId));
    delete state.saveStatusByReportId[reportId];
    delete state.reportTotalsById[reportId];
    return true;
  }

  async function deleteReport(reportId) {
    try {
      const report = findReport(reportId);
      if (isDraftReport(report)) {
        cancelDraftReport(reportId);
        return;
      }

      await reportsAPI.deleteReport(reportId);

      clearReportRowIssues(reportId);

      replaceReports(state.reports.filter(report => report._id !== reportId));
      delete state.saveStatusByReportId[reportId];
      delete state.reportTotalsById[reportId];
    } catch (error) {
      console.error(`Failed to delete report '${reportId}'`, error);
      state.error = error.message || 'Failed to delete report';
    }
  }

  function updateReportName(reportId, name) {
    const report = findReport(reportId);
    if (!report) return;

    report.name = String(name || '').trim();
  }

  function updateReportFolderName(reportId, folderName) {
    const report = findReport(reportId);
    if (!report) return;

    report.folderName = String(folderName || '').trim();
  }

  async function moveReportToFolder(reportId, folderName) {
    updateReportFolderName(reportId, folderName);
    return await saveReportLayout(reportId);
  }

  async function removeReportFromFolder(reportId) {
    updateReportFolderName(reportId, '');
    return await saveReportLayout(reportId);
  }

  async function renameFolder(currentFolderName, nextFolderName) {
    const fromFolderName = String(currentFolderName || '').trim();
    const toFolderName = String(nextFolderName || '').trim();

    if (!fromFolderName || !toFolderName || fromFolderName === toFolderName) {
      return [];
    }

    const reportsInFolder = state.reports.filter(
      report => String(report?.folderName || '').trim() === fromFolderName
    );

    if (!reportsInFolder.length) {
      return [];
    }

    reportsInFolder.forEach((report) => {
      report.folderName = toFolderName;
    });

    try {
      const saved = [];
      for (const report of reportsInFolder) {
        const updated = await saveReportLayout(report._id);
        if (updated) {
          saved.push(updated);
        }
      }

      return saved;
    } catch (error) {
      console.error(`Failed to rename folder '${fromFolderName}'`, error);
      state.error = error.message || 'Failed to rename folder';
      return [];
    }
  }

  async function removeFolder(folderName) {
    const normalizedFolderName = String(folderName || '').trim();
    if (!normalizedFolderName) {
      return [];
    }

    const reportsInFolder = state.reports.filter(
      report => String(report?.folderName || '').trim() === normalizedFolderName
    );

    if (!reportsInFolder.length) {
      return [];
    }

    reportsInFolder.forEach((report) => {
      report.folderName = '';
    });

    try {
      const saved = [];
      for (const report of reportsInFolder) {
        const updated = await saveReportLayout(report._id);
        if (updated) {
          saved.push(updated);
        }
      }

      return saved;
    } catch (error) {
      console.error(`Failed to remove folder '${normalizedFolderName}'`, error);
      state.error = error.message || 'Failed to remove folder';
      return [];
    }
  }

  function addTabRow(reportId) {
    const report = findReport(reportId);
    if (!report) return null;

    const newRow = createDefaultTabRow(report.rows.length);
    report.rows.push(newRow);
    report.rows = normalizeRowsForLocal(report.rows);
    setReportTotal(reportId);
    state.rowIssuesByKey[buildRowStateKey(reportId, newRow.rowId)] = '';

    return newRow;
  }

  function addManualRow(reportId) {
    const report = findReport(reportId);
    if (!report) return null;

    const newRow = createDefaultManualRow(report.rows.length);
    report.rows.push(newRow);
    report.rows = normalizeRowsForLocal(report.rows);
    setReportTotal(reportId);
    state.rowIssuesByKey[buildRowStateKey(reportId, newRow.rowId)] = '';

    return newRow;
  }

  function addReportRow(reportId) {
    const report = findReport(reportId);
    if (!report) return null;

    const newRow = createDefaultReportRow(reportId, report.rows.length);
    report.rows.push(newRow);
    report.rows = normalizeRowsForLocal(report.rows);
    setReportTotal(reportId);
    state.rowIssuesByKey[buildRowStateKey(reportId, newRow.rowId)] = '';

    return newRow;
  }

  function updateRow(reportId, rowId, updates) {
    const report = findReport(reportId);
    if (!report) return;

    report.rows = report.rows.map((row) => {
      if (row.rowId !== rowId) {
        return row;
      }

      if (row.type === 'tab') {
        return {
          ...row,
          tabId: typeof updates.tabId === 'string' ? updates.tabId : row.tabId,
          groupId: typeof updates.groupId === 'string' ? updates.groupId : row.groupId,
          dateStart: typeof updates.dateStart === 'string' ? updates.dateStart : row.dateStart,
          dateEnd: typeof updates.dateEnd === 'string' ? updates.dateEnd : row.dateEnd,
          savedTotal: Number.isFinite(Number(updates.savedTotal)) ? Number(updates.savedTotal) : row.savedTotal
        };
      }

      if (row.type === 'manual') {
        const nextAmount = Number(updates.amount);
        return {
          ...row,
          title: typeof updates.title === 'string' ? updates.title : row.title,
          amount: Number.isFinite(nextAmount) ? nextAmount : row.amount
        };
      }

      if (row.type === 'report') {
        return {
          ...row,
          reportId: typeof updates.reportId === 'string' ? updates.reportId : row.reportId,
          reportName: typeof updates.reportName === 'string' ? updates.reportName : row.reportName,
          savedTotal: Number.isFinite(Number(updates.savedTotal)) ? Number(updates.savedTotal) : row.savedTotal
        };
      }

      return row;
    });

    report.rows = normalizeRowsForLocal(report.rows);
    setReportTotal(reportId);
    state.rowIssuesByKey[buildRowStateKey(reportId, rowId)] = '';
  }

  function removeRow(reportId, rowId) {
    const report = findReport(reportId);
    if (!report) return;

    report.rows = normalizeRowsForLocal(report.rows.filter(row => row.rowId !== rowId));
    delete state.rowIssuesByKey[buildRowStateKey(reportId, rowId)];
    setReportTotal(reportId);
  }

  function reorderRows(reportId, rows) {
    const report = findReport(reportId);
    if (!report) return;

    const reindexedRows = (Array.isArray(rows) ? rows : []).map((row, index) => ({
      ...row,
      sort: index
    }));

    report.rows = normalizeRowsForLocal(reindexedRows);
    setReportTotal(reportId);
  }

  function reorderReports(reports) {
    const reindexedReports = (Array.isArray(reports) ? reports : []).map((report, index) => ({
      ...report,
      sort: index
    }));

    replaceReports(reindexedReports);
  }

  async function saveReportLayout(reportId, options = {}) {
    const report = findReport(reportId);
    if (!report) return null;

    if (isDraftReport(report)) {
      return await saveReport(reportId, {
        ...options,
        localOnlyForDraft: true
      });
    }

    const { status = 'saving' } = options;
    state.saveStatusByReportId[reportId] = status;

    try {
      const updated = await reportsAPI.updateReport(reportId, {
        name: report.name,
        folderName: report.folderName || '',
        rows: report.rows,
        sort: report.sort
      });

      const reportIndex = state.reports.findIndex(item => item._id === reportId);
      if (reportIndex !== -1) {
        state.reports[reportIndex] = {
          ...updated,
          rows: normalizeRowsForLocal(updated.rows)
        };
      }

      replaceReports(state.reports);
      markSavedStatus(reportId);

      return updated;
    } catch (error) {
      console.error(`Failed to save report layout '${reportId}'`, error);
      state.saveStatusByReportId[reportId] = 'error';
      state.error = error.message || 'Failed to save report layout';
      return null;
    }
  }

  async function saveReportsOrder() {
    const reportsToPersist = normalizeReportsForLocal(state.reports)
      .filter(report => !isDraftReport(report));

    if (!reportsToPersist.length) {
      return [];
    }

    try {
      const updatedReports = await Promise.all(
        reportsToPersist.map(async report =>
          await reportsAPI.updateReport(report._id, {
            name: report.name,
            folderName: report.folderName || '',
            rows: report.rows,
            sort: report.sort
          })
        )
      );

      const updatedById = new Map(updatedReports.map(report => [report._id, report]));
      replaceReports(state.reports.map((report) => {
        if (!updatedById.has(report._id)) {
          return report;
        }

        const updated = updatedById.get(report._id);
        return {
          ...updated,
          rows: normalizeRowsForLocal(updated.rows)
        };
      }));

      return updatedReports;
    } catch (error) {
      console.error('Failed to save reports order', error);
      state.error = error.message || 'Failed to save reports order';
      return [];
    }
  }

  function getRowAmount(reportId, rowId) {
    const report = findReport(reportId);
    if (!report) return 0;

    const row = report.rows.find(item => item.rowId === rowId);
    if (!row) return 0;

    if (row.type === 'manual') {
      const manualAmount = Number(row.amount);
      return Number.isFinite(manualAmount) ? manualAmount : 0;
    }

    const savedAmount = Number(row.savedTotal);
    return Number.isFinite(savedAmount) ? savedAmount : 0;
  }

  function getRowIssue(reportId, rowId) {
    return state.rowIssuesByKey[buildRowStateKey(reportId, rowId)] || '';
  }

  function getReportTotal(reportId) {
    return state.reportTotalsById[reportId] ?? 0;
  }

  async function refreshRowTotal(reportId, rowId, options = {}) {
    const report = findReport(reportId);
    if (!report) return null;

    const row = report.rows.find(item => item.rowId === rowId);
    if (!row) return null;

    const {
      refreshDependencies = false,
      forceTransactionReload = false
    } = options;

    if (refreshDependencies) {
      await fetchReferenceData();
    }

    if (forceTransactionReload) {
      resetTransactionsCache();
    }

    if (row.type === 'manual') {
      state.rowIssuesByKey[buildRowStateKey(reportId, rowId)] = '';
      setReportTotal(reportId);
      return row;
    }

    if (row.type === 'report') {
      const { amount, reportName, issue } = evaluateReportRow(reportId, row);
      report.rows = normalizeRowsForLocal(report.rows.map((item) => {
        if (item.rowId !== rowId) {
          return item;
        }

        return {
          ...item,
          reportName,
          savedTotal: amount
        };
      }));

      state.rowIssuesByKey[buildRowStateKey(reportId, rowId)] = issue || '';
      setReportTotal(reportId);

      return report.rows.find(item => item.rowId === rowId) || null;
    }

    const { amount, issue } = await evaluateTabRow(row);
    report.rows = normalizeRowsForLocal(report.rows.map((item) => {
      if (item.rowId !== rowId) {
        return item;
      }

      return {
        ...item,
        savedTotal: amount
      };
    }));

    state.rowIssuesByKey[buildRowStateKey(reportId, rowId)] = issue || '';
    setReportTotal(reportId);

    return report.rows.find(item => item.rowId === rowId) || null;
  }

  async function refreshReportTotals(reportId) {
    return await saveReport(reportId, {
      status: 'refreshing',
      refreshDependencies: true,
      forceTransactionReload: true,
      localOnlyForDraft: true
    });
  }

  return {
    state,
    sortedTabs,
    sortedGroups,
    hasReports,
    isDraftReport,
    initReports,
    createReport,
    duplicateReport,
    cancelDraftReport,
    deleteReport,
    saveReport,
    updateReportName,
    updateReportFolderName,
    moveReportToFolder,
    removeReportFromFolder,
    renameFolder,
    removeFolder,
    addTabRow,
    addManualRow,
    addReportRow,
    updateRow,
    removeRow,
    reorderRows,
    reorderReports,
    saveReportLayout,
    saveReportsOrder,
    refreshRowTotal,
    getRowAmount,
    getRowIssue,
    getReportTotal,
    refreshReportTotals
  };
}
