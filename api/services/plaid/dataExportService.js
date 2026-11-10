import plaidItems from '../../models/plaidItems.js';
import plaidTransactions from '../../models/plaidTransactions.js';
import plaidAccounts from '../../models/plaidAccounts.js';
import plaidGroups from '../../models/plaidGroups.js';
import syncSessions from '../../models/syncSession.js';
import transactionCustomizations from '../../models/transactionCustomizations.js';
import tabs from '../../models/tabs.js';
import rules from '../../models/rules.js';
import reports from '../../models/reports.js';
import scrub from '../../utils/scrub.js';

const DEFAULT_BATCH_SIZE = 500;
const MAX_BATCH_SIZE = 1000;
const COMPLETE_CURSOR = '__complete__';

// These are account-scoped financial records. Authentication secrets, Plaid
// access tokens and unrelated storefront data must not be in a user backup.
const COLLECTIONS = [
  { key: 'items', model: plaidItems, prefix: 'plaiditems', cursor: 'itemsStart' },
  { key: 'transactions', model: plaidTransactions, prefix: 'plaidtransactions', cursor: 'transactionsStart' },
  { key: 'accounts', model: plaidAccounts, prefix: 'plaidaccounts', cursor: 'accountsStart' },
  { key: 'accountGroups', model: plaidGroups, prefix: 'plaidgroups', cursor: 'accountGroupsStart' },
  { key: 'syncSessions', model: syncSessions, prefix: 'syncsession', cursor: 'syncSessionsStart' },
  { key: 'transactionCustomizations', model: transactionCustomizations, prefix: 'tcustomizations', cursor: 'customizationsStart' },
  { key: 'tabs', model: tabs, prefix: 'tabs', cursor: 'tabsStart' },
  { key: 'rules', model: rules, prefix: 'rules', cursor: 'rulesStart' },
  { key: 'reports', model: reports, prefix: 'reports', cursor: 'reportsStart' }
];

class PlaidDataExportService {
  normalizeBatchSize(batchSize) {
    const parsed = Number.parseInt(batchSize, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_BATCH_SIZE;
    return Math.min(parsed, MAX_BATCH_SIZE);
  }

  async fetchBatch(model, filter, start, batchSize) {
    if (start === COMPLETE_CURSOR) {
      return { items: [], nextStart: COMPLETE_CURSOR };
    }
    const options = { limit: batchSize };
    if (start) options.start = start;
    const response = await model.find(filter, options);
    return {
      items: Array.isArray(response?.items) ? response.items.filter(Boolean) : [],
      nextStart: response?.lastKey || COMPLETE_CURSOR
    };
  }

  normalizeIncludes(includes = {}) {
    // Keep the original five flags' default values for older clients.
    // The additional record types are opt-in via the full-backup button.
    const defaults = {
      items: true, transactions: true, accounts: true,
      accountGroups: true, syncSessions: true,
      transactionCustomizations: false, tabs: false, rules: false, reports: false
    };
    return Object.fromEntries(
      Object.entries(defaults).map(([key, defaultValue]) => [
        key, includes?.[key] === undefined ? defaultValue : Boolean(includes[key])
      ])
    );
  }

  async getUserPlaidDataBatch(userId, options = {}) {
    if (!userId) throw new Error('INVALID_USER: User ID is required');

    try {
      const batchSize = this.normalizeBatchSize(options.batchSize);
      const cursors = options.cursors || {};
      const includes = this.normalizeIncludes(options.includes);
      const safeUserId = String(userId).replaceAll(':', '-');
      const batches = await Promise.all(COLLECTIONS.map(async ({ key, model, prefix, cursor }) => {
        if (!includes[key]) {
          return { key, cursor, items: [], nextStart: COMPLETE_CURSOR };
        }
        const result = await this.fetchBatch(
          model, `${prefix}-${safeUserId}:*`, cursors[cursor], batchSize
        );
        return { key, cursor, ...result };
      }));

      const counts = {};
      const exported = {};
      const next = {};

      for (const batch of batches) {
        const records = batch.key === 'items'
          ? scrub(batch.items, 'accessToken')
          : batch.items;
        exported[batch.key] = records;
        counts[batch.key] = records.length;
        next[batch.cursor] = batch.nextStart;
      }

      return {
        generatedAt: new Date().toISOString(),
        userId,
        batchSize,
        includes,
        counts,
        ...exported,
        pagination: {
          ...next,
          hasMore: Object.values(next).some(cursor => cursor !== COMPLETE_CURSOR)
        }
      };
    } catch (error) {
      throw new Error(`DATA_EXPORT_ERROR: ${error.message}`);
    }
  }
}

export default new PlaidDataExportService();
