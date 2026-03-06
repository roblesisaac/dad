import SyncMeta from '../models/syncMeta';

export const SYNC_RESOURCE_KEYS = ['reports', 'tabs', 'rules', 'groups'];
const IS_TEST_ENV = process.env.VITEST === 'true';

function normalizeResource(resource) {
  const normalized = String(resource || '').trim().toLowerCase();
  return SYNC_RESOURCE_KEYS.includes(normalized) ? normalized : '';
}

function sanitizeSegment(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9|@._:-]/g, '_');
}

export function buildSyncMetaId(userId, resource) {
  const safeUserId = sanitizeSegment(userId);
  const safeResource = normalizeResource(resource);
  return safeUserId && safeResource
    ? `syncmeta:${safeUserId}:${safeResource}`
    : '';
}

export async function markResourceUpdated({ userId, resource, clientId = '' } = {}) {
  if (IS_TEST_ENV) {
    return null;
  }

  const normalizedResource = normalizeResource(resource);
  const syncMetaId = buildSyncMetaId(userId, normalizedResource);

  if (!normalizedResource || !syncMetaId) {
    return null;
  }

  const now = new Date().toISOString();
  const normalizedClientId = String(clientId || '').trim();

  try {
    const existing = await SyncMeta.findOne(syncMetaId);
    if (!existing?._id) {
      return await SyncMeta.save({
        _id: syncMetaId,
        userId,
        resource: normalizedResource,
        revision: 1,
        updatedAt: now,
        updatedByClientId: normalizedClientId
      });
    }

    const currentRevision = Number(existing.revision);
    const nextRevision = Number.isFinite(currentRevision) ? currentRevision + 1 : 1;

    return await SyncMeta.update(syncMetaId, {
      revision: nextRevision,
      updatedAt: now,
      updatedByClientId: normalizedClientId
    });
  } catch (error) {
    console.error(`Failed to mark sync resource '${normalizedResource}'`, error);
    return null;
  }
}

export async function getResourceMutationMeta(userId, resource) {
  if (IS_TEST_ENV) {
    return {
      revision: 0,
      updatedAt: '',
      updatedByClientId: ''
    };
  }

  const normalizedResource = normalizeResource(resource);
  const syncMetaId = buildSyncMetaId(userId, normalizedResource);

  if (!normalizedResource || !syncMetaId) {
    return {
      revision: 0,
      updatedAt: '',
      updatedByClientId: ''
    };
  }

  try {
    const found = await SyncMeta.findOne(syncMetaId);

    if (!found) {
      return {
        revision: 0,
        updatedAt: '',
        updatedByClientId: ''
      };
    }

    return {
      revision: Number.isFinite(Number(found.revision)) ? Number(found.revision) : 0,
      updatedAt: String(found.updatedAt || ''),
      updatedByClientId: String(found.updatedByClientId || '')
    };
  } catch (error) {
    console.error(`Failed to read sync mutation meta '${normalizedResource}'`, error);
    return {
      revision: 0,
      updatedAt: '',
      updatedByClientId: ''
    };
  }
}
