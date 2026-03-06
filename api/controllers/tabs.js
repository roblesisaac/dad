import Tabs from '../models/tabs';
import { getRequestClientId } from '../utils/clientIdentity.js';
import { markResourceUpdated } from '../services/syncMetaService.js';

function normalizeSortByGroup(sortByGroup) {
  if (!sortByGroup || typeof sortByGroup !== 'object' || Array.isArray(sortByGroup)) {
    return {};
  }

  return Object.entries(sortByGroup).reduce((acc, [scopeId, rawSort]) => {
    const normalizedScopeId = String(scopeId || '').trim();
    const normalizedSort = Number(rawSort);

    if (!normalizedScopeId || !Number.isFinite(normalizedSort)) {
      return acc;
    }

    acc[normalizedScopeId] = normalizedSort;
    return acc;
  }, {});
}

function normalizeScopeId(scopeId) {
  return typeof scopeId === 'string'
    ? scopeId.trim()
    : '';
}

export default {
  deleteTab: async (req, res) => {
    const { params, user } = req;
    const deletedTab = await Tabs.erase(params._tabId);
    await markResourceUpdated({
      userId: user._id,
      resource: 'tabs',
      clientId: getRequestClientId(req)
    });

    res.json(deletedTab);
  },

  getTabs: async (req, res) => {
    const userId = req.user._id;
    const s = await Tabs.findAll({ userId });

    res.json(s);
  },

  saveTab: async (req, res) => {
    const { body, user } = req;
    const savedTab = await Tabs.save({
      ...body,
      userId: user._id
    });

    await markResourceUpdated({
      userId: user._id,
      resource: 'tabs',
      clientId: getRequestClientId(req)
    });
  
    res.json(savedTab);
  },

  updateTab: async (req, res) => {
    const { params, body, user } = req;
    const updates = { ...(body || {}) };
    const scopeId = normalizeScopeId(updates.sortScopeId);
    const hasScopedSortUpdate = scopeId && Object.prototype.hasOwnProperty.call(updates, 'sort');

    if (hasScopedSortUpdate) {
      const parsedSort = Number(updates.sort);
      if (!Number.isFinite(parsedSort)) {
        return res.status(400).json({
          message: 'sort must be a valid number'
        });
      }

      const existingTab = await Tabs.findOne(params._tabId);
      const currentSortByGroup = normalizeSortByGroup(existingTab?.sortByGroup);

      updates.sortByGroup = {
        ...currentSortByGroup,
        [scopeId]: parsedSort
      };

      // Preserve legacy global sort and only persist scoped order.
      delete updates.sort;
    }

    delete updates.sortScopeId;

    const updatedTab = await Tabs.update(params._tabId, updates);
    await markResourceUpdated({
      userId: user._id,
      resource: 'tabs',
      clientId: getRequestClientId(req)
    });

    res.json(updatedTab);
  }
}
