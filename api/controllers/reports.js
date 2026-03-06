import Reports from '../models/reports';
import { normalizeReportPayload, isReportOwnedByUser } from './reports.normalize';
import { getRequestClientId } from '../utils/clientIdentity.js';
import { markResourceUpdated } from '../services/syncMetaService.js';

function respondWithError(res, error) {
  const status = error.status || 400;
  return res.status(status).json({ message: error.message || 'Request failed' });
}

async function fetchOwnedReport(_reportId, userId) {
  const report = await Reports.findOne(_reportId);

  if (!report) {
    const notFound = new Error('Report not found');
    notFound.status = 404;
    throw notFound;
  }

  if (!isReportOwnedByUser(report, userId)) {
    const forbidden = new Error('User not authorized to access this report');
    forbidden.status = 403;
    throw forbidden;
  }

  return report;
}

export default {
  async getReports(req, res) {
    try {
      const userId = req.user._id;
      const { _reportId } = req.params;

      if (_reportId) {
        const report = await fetchOwnedReport(_reportId, userId);
        return res.json(report);
      }

      const reports = await Reports.findAll({ userId });
      reports.sort((a, b) => {
        const aSort = Number(a?.sort);
        const bSort = Number(b?.sort);
        const aHasSort = Number.isFinite(aSort);
        const bHasSort = Number.isFinite(bSort);

        if (aHasSort && bHasSort && aSort !== bSort) {
          return aSort - bSort;
        }

        if (aHasSort !== bHasSort) {
          return aHasSort ? -1 : 1;
        }

        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });

      return res.json(reports);
    } catch (error) {
      return respondWithError(res, error);
    }
  },

  async saveReport(req, res) {
    try {
      const normalized = normalizeReportPayload(req.body);
      const now = new Date().toISOString();
      const userId = req.user._id;
      const clientId = getRequestClientId(req);
      const hasSort = Number.isFinite(Number(normalized.sort));

      let nextSort = hasSort ? Number(normalized.sort) : 0;
      if (!hasSort) {
        const existingReports = await Reports.findAll({ userId }) || [];
        const maxSort = existingReports.reduce((max, report) => {
          const value = Number(report?.sort);
          return Number.isFinite(value) ? Math.max(max, value) : max;
        }, -1);
        nextSort = maxSort + 1;
      }

      const saved = await Reports.save({
        ...normalized,
        sort: nextSort,
        createdAt: now,
        updatedAt: now,
        req: { user: req.user }
      });

      await markResourceUpdated({ userId, resource: 'reports', clientId });

      return res.json(saved);
    } catch (error) {
      return respondWithError(res, error);
    }
  },

  async updateReport(req, res) {
    try {
      const userId = req.user._id;
      const clientId = getRequestClientId(req);
      const { _reportId } = req.params;

      await fetchOwnedReport(_reportId, userId);

      const normalized = normalizeReportPayload(req.body);
      const updates = {
        ...normalized,
        updatedAt: new Date().toISOString()
      };

      if (!Number.isFinite(Number(normalized.sort))) {
        delete updates.sort;
      } else {
        updates.sort = Number(normalized.sort);
      }

      const updated = await Reports.update(_reportId, updates);
      await markResourceUpdated({ userId, resource: 'reports', clientId });

      return res.json(updated);
    } catch (error) {
      return respondWithError(res, error);
    }
  },

  async deleteReport(req, res) {
    try {
      const userId = req.user._id;
      const clientId = getRequestClientId(req);
      const { _reportId } = req.params;

      await fetchOwnedReport(_reportId, userId);

      const removed = await Reports.erase(_reportId);
      await markResourceUpdated({ userId, resource: 'reports', clientId });
      return res.json(removed);
    } catch (error) {
      return respondWithError(res, error);
    }
  }
};
