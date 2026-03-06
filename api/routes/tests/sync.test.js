import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const member = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  };

  return {
    member,
    protect: {
      route: vi.fn(() => vi.fn(() => member))
    },
    syncController: {
      getSyncState: vi.fn()
    }
  };
});

vi.mock('../../middlewares/protect.js', () => ({
  default: mocks.protect
}));

vi.mock('../../controllers/sync.js', () => ({
  default: mocks.syncController
}));

import syncRoutes from '../sync.js';

describe('sync routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('registers sync state endpoint for member access', () => {
    const api = {};

    syncRoutes(api, '/api');

    expect(mocks.protect.route).toHaveBeenCalledWith(api, 'sync', '/api');
    expect(mocks.member.get).toHaveBeenCalledWith('/sync/state', mocks.syncController.getSyncState);
  });
});
