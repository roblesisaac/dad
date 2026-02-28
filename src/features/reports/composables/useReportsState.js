import { computed, reactive } from 'vue';
import { format, startOfMonth } from 'date-fns';
import { useApi } from '@/shared/composables/useApi';
import { useReportsAPI } from '@/features/reports/composables/useReportsAPI.js';
import { useTabsAPI } from '@/features/tabs/composables/useTabsAPI.js';
import { useRulesAPI } from '@/features/rule-manager/composables/useRulesAPI.js';
import { useGroupsAPI } from '@/features/select-group/composables/useGroupsAPI.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';
import {
  buildDefaultRuleMethods,
  buildTabRulesForId,
  evaluateTabData
} from '@/features/tabs/utils/tabEvaluator.js';

const AUTOSAVE_DEBOUNCE_MS = 700;

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

export function calculateReportTotal(rows = [], rowAmountByRowId = {}) {
  return rows.reduce((total, row) => {
    if (row.type === 'manual') {
      const manualAmount = Number(row.amount);
      return total + (Number.isFinite(manualAmount) ? manualAmount : 0);
    }

    const rowAmount = Number(rowAmountByRowId[row.rowId]);
    return total + (Number.isFinite(rowAmount) ? rowAmount : 0);
  }, 0);
}

export function useReportsState() {
  const api = useApi();
  const reportsAPI = useReportsAPI();
  const tabsAPI = useTabsAPI();
  const rulesAPI = useRulesAPI();
  const groupsAPI = useGroupsAPI();
  const { state: dashboardState } = useDashboardState();

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
    rowAmountsByKey: {},
    rowIssuesByKey: {},
    saveStatusByReportId: {}
  });

  const transactionsCache = reactive({});
  const saveTimers = new Map();
  const saveSequenceByReportId = reactive({});

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

  function clearSaveTimer(reportId) {
    const timer = saveTimers.get(reportId);
    if (timer) {
      clearTimeout(timer);
      saveTimers.delete(reportId);
    }
  }

  function clearReportRowCaches(reportId) {
    const prefix = `${reportId}:`;

    Object.keys(state.rowAmountsByKey).forEach((key) => {
      if (key.startsWith(prefix)) {
        delete state.rowAmountsByKey[key];
      }
    });

    Object.keys(state.rowIssuesByKey).forEach((key) => {
      if (key.startsWith(prefix)) {
        delete state.rowIssuesByKey[key];
      }
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

  function createDefaultTabRow(sort = 0) {
    return {
      rowId: `row_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'tab',
      tabId: getDefaultTabId(),
      groupId: getDefaultGroupId(),
      dateStart: toYyyyMmDd(startOfMonth(new Date())),
      dateEnd: toYyyyMmDd(new Date()),
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
        .map(accountId =>
          api.get(`plaid/transactions?account_id=${encodeURIComponent(accountId)}&date=${encodeURIComponent(queryDate)}`)
        );

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

  async function evaluateTabRow(reportId, row) {
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
      console.error(`Failed to evaluate report row '${reportId}:${row.rowId}'`, error);
      return { amount: 0, issue: 'Failed to load transactions' };
    }
  }

  async function refreshReportTotals(reportId) {
    const report = findReport(reportId);
    if (!report) return;

    clearReportRowCaches(reportId);

    const rowAmountsByRowId = {};

    for (const row of report.rows) {
      const rowKey = buildRowStateKey(reportId, row.rowId);

      if (row.type === 'manual') {
        const amount = Number.isFinite(Number(row.amount)) ? Number(row.amount) : 0;
        state.rowAmountsByKey[rowKey] = amount;
        state.rowIssuesByKey[rowKey] = '';
        rowAmountsByRowId[row.rowId] = amount;
        continue;
      }

      const { amount, issue } = await evaluateTabRow(reportId, row);
      state.rowAmountsByKey[rowKey] = amount;
      state.rowIssuesByKey[rowKey] = issue || '';
      rowAmountsByRowId[row.rowId] = amount;
    }

    state.reportTotalsById[reportId] = calculateReportTotal(report.rows, rowAmountsByRowId);
  }

  async function refreshAllReportTotals() {
    for (const report of state.reports) {
      await refreshReportTotals(report._id);
    }
  }

  function queueReportSave(reportId) {
    const report = findReport(reportId);
    if (!report) return;

    clearSaveTimer(reportId);

    const sequence = (saveSequenceByReportId[reportId] || 0) + 1;
    saveSequenceByReportId[reportId] = sequence;
    state.saveStatusByReportId[reportId] = 'saving';

    const timer = setTimeout(async () => {
      const latestRequestedSequence = saveSequenceByReportId[reportId];
      if (sequence !== latestRequestedSequence) {
        return;
      }

      const reportToSave = findReport(reportId);
      if (!reportToSave) {
        return;
      }

      try {
        const updated = await reportsAPI.updateReport(reportId, {
          name: reportToSave.name,
          rows: reportToSave.rows
        });

        if (sequence !== saveSequenceByReportId[reportId]) {
          return;
        }

        const reportIndex = state.reports.findIndex(item => item._id === reportId);
        if (reportIndex !== -1) {
          state.reports[reportIndex] = {
            ...updated,
            rows: normalizeRowsForLocal(updated.rows)
          };
        }

        state.saveStatusByReportId[reportId] = 'saved';

        setTimeout(() => {
          if (state.saveStatusByReportId[reportId] === 'saved') {
            state.saveStatusByReportId[reportId] = 'idle';
          }
        }, 1000);
      } catch (error) {
        console.error(`Failed to autosave report '${reportId}'`, error);
        state.saveStatusByReportId[reportId] = 'error';
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    saveTimers.set(reportId, timer);
  }

  function updateReportLocal(reportId, updater, options = {}) {
    const report = findReport(reportId);
    if (!report) return;

    updater(report);
    report.rows = normalizeRowsForLocal(report.rows);

    if (options.recalculateTotals) {
      refreshReportTotals(reportId);
    }

    if (options.autoSave !== false) {
      queueReportSave(reportId);
    }
  }

  async function initReports() {
    state.isLoading = true;
    state.error = null;

    try {
      const [tabs, rules, groupData, reports] = await Promise.all([
        tabsAPI.fetchUserTabs(),
        rulesAPI.fetchUserRules(),
        groupsAPI.fetchGroupsAndAccounts(),
        reportsAPI.fetchReports()
      ]);

      state.allUserTabs = tabs || [];
      state.allUserRules = rules || [];
      state.allUserGroups = (groupData.groups || []).sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
      state.allUserAccounts = groupData.accounts || [];
      state.reports = (reports || []).map(report => ({
        ...report,
        rows: normalizeRowsForLocal(report.rows)
      }));

      state.reports.forEach((report) => {
        state.saveStatusByReportId[report._id] = 'idle';
      });

      await refreshAllReportTotals();
    } catch (error) {
      console.error('Failed to initialize reports', error);
      state.error = error.message || 'Failed to initialize reports';
    } finally {
      state.isLoading = false;
    }
  }

  async function createReport() {
    try {
      const reportName = `Report ${state.reports.length + 1}`;
      const created = await reportsAPI.createReport({
        name: reportName,
        rows: []
      });

      const normalized = {
        ...created,
        rows: normalizeRowsForLocal(created.rows)
      };

      state.reports.unshift(normalized);
      state.saveStatusByReportId[normalized._id] = 'idle';
      state.reportTotalsById[normalized._id] = 0;

      return normalized;
    } catch (error) {
      console.error('Failed to create report', error);
      state.error = error.message || 'Failed to create report';
      return null;
    }
  }

  async function deleteReport(reportId) {
    try {
      await reportsAPI.deleteReport(reportId);

      clearSaveTimer(reportId);
      clearReportRowCaches(reportId);

      state.reports = state.reports.filter(report => report._id !== reportId);
      delete state.saveStatusByReportId[reportId];
      delete state.reportTotalsById[reportId];
      delete saveSequenceByReportId[reportId];
    } catch (error) {
      console.error(`Failed to delete report '${reportId}'`, error);
      state.error = error.message || 'Failed to delete report';
    }
  }

  function updateReportName(reportId, name) {
    updateReportLocal(reportId, (report) => {
      report.name = name;
    });
  }

  function addTabRow(reportId) {
    updateReportLocal(reportId, (report) => {
      report.rows.push(createDefaultTabRow(report.rows.length));
    }, { recalculateTotals: true });
  }

  function addManualRow(reportId) {
    updateReportLocal(reportId, (report) => {
      report.rows.push(createDefaultManualRow(report.rows.length));
    }, { recalculateTotals: true });
  }

  function updateRow(reportId, rowId, updates) {
    updateReportLocal(reportId, (report) => {
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
            dateEnd: typeof updates.dateEnd === 'string' ? updates.dateEnd : row.dateEnd
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

        return row;
      });
    }, { recalculateTotals: true });
  }

  function removeRow(reportId, rowId) {
    updateReportLocal(reportId, (report) => {
      report.rows = report.rows.filter(row => row.rowId !== rowId);
    }, { recalculateTotals: true });
  }

  function reorderRows(reportId, rows) {
    updateReportLocal(reportId, (report) => {
      report.rows = normalizeRowsForLocal(rows);
    }, { recalculateTotals: false });
  }

  function getRowAmount(reportId, rowId) {
    return state.rowAmountsByKey[buildRowStateKey(reportId, rowId)] ?? 0;
  }

  function getRowIssue(reportId, rowId) {
    return state.rowIssuesByKey[buildRowStateKey(reportId, rowId)] || '';
  }

  function getReportTotal(reportId) {
    return state.reportTotalsById[reportId] ?? 0;
  }

  return {
    state,
    sortedTabs,
    sortedGroups,
    hasReports,
    initReports,
    createReport,
    deleteReport,
    updateReportName,
    addTabRow,
    addManualRow,
    updateRow,
    removeRow,
    reorderRows,
    getRowAmount,
    getRowIssue,
    getReportTotal,
    refreshReportTotals
  };
}
