import { createHash } from 'crypto';
import Reports from '../models/reports';
import Tabs from '../models/tabs';
import Rules from '../models/rules';
import Groups from '../models/plaidGroups';
import { getResourceMutationMeta, SYNC_RESOURCE_KEYS } from '../services/syncMetaService.js';

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(item => normalizeValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalizeValue(value[key]);
        return acc;
      }, {});
  }

  return value;
}

function buildCollectionRevision(items = []) {
  const safeItems = (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .sort((a, b) => String(a?._id || '').localeCompare(String(b?._id || '')));

  const hash = createHash('sha256');

  safeItems.forEach((item) => {
    hash.update(JSON.stringify(normalizeValue(item)));
    hash.update('\n');
  });

  return `${safeItems.length}:${hash.digest('hex')}`;
}

function buildAppRevision(resources = {}) {
  const hash = createHash('sha256');

  Object.keys(resources)
    .sort()
    .forEach((resourceKey) => {
      hash.update(resourceKey);
      hash.update(':');
      hash.update(String(resources[resourceKey] || ''));
      hash.update('\n');
    });

  return hash.digest('hex');
}

export default {
  async getSyncState(req, res) {
    try {
      const userId = req.user._id;
      const [reports, tabs, rules, groups] = await Promise.all([
        Reports.findAll({ userId }),
        Tabs.findAll({ userId }),
        Rules.findAll({ userId }),
        Groups.findAll({ userId, name: '*' })
      ]);

      const resources = {
        reports: buildCollectionRevision(reports),
        tabs: buildCollectionRevision(tabs),
        rules: buildCollectionRevision(rules),
        groups: buildCollectionRevision(groups)
      };

      const mutations = Object.fromEntries(
        await Promise.all(
          SYNC_RESOURCE_KEYS.map(async (resource) => (
            [resource, await getResourceMutationMeta(userId, resource)]
          ))
        )
      );

      return res.json({
        appRevision: buildAppRevision(resources),
        resources,
        mutations,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to build sync state', error);
      return res.status(500).json({
        message: error?.message || 'Failed to build sync state'
      });
    }
  }
};
