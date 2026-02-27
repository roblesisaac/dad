import { describe, expect, test, vi } from 'vitest';

vi.mock('../auth.js', () => ({
  checkJWT: (req, _res, next) => next(),
  checkLoggedIn: (req, _res, next) => next()
}));

import Protect from '../protect.js';

describe('protect middleware access control', () => {
  function registerDeleteHandlers(requiredRole = 'member') {
    const api = {
      delete: vi.fn()
    };

    const member = Protect.route(api, 'plaiditems', '/api')(requiredRole);
    member.delete('/plaid/items/:_id', (_req, _res) => {});

    const [, ...handlers] = api.delete.mock.calls[0];
    return handlers;
  }

  test('denies access for unauthorized roles', () => {
    const handlers = registerDeleteHandlers('member');
    const permit = handlers[2];
    const req = { user: { roles: ['guest'] } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    permit(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Access Denied'
      })
    );
  });

  test('allows access for authorized roles', () => {
    const handlers = registerDeleteHandlers('member');
    const permit = handlers[2];
    const req = { user: { roles: ['member'] } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    permit(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
