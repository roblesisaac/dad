import { describe, expect, test, vi } from 'vitest';
import app from '../../api/controllers/plaid';

describe('plaid controller', async () => {
  test('should return a token', async () => {
    const req = {
      params: {},
      user: {
        _id: 'test_id',
      }
    };
  
    const res = {
      json: vi.fn()
    };
  
    const response = await app.connectLink(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.any(String));
    expect(response).toHaveProperty('link_token');
  })
});