import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../baseService.js', () => ({
  default: class {
    constructor() { this.client = { itemRemove: vi.fn() }; }
    handlePlaidError(error) { throw new Error(error.error_code || error.message); }
  }
}));
vi.mock('../itemService.js', () => ({ default: {} }));

import plaidService from '../plaidService.js';

describe('plaidService.removeItem retry handling', () => {
  beforeEach(() => vi.clearAllMocks());

  test('returns normal Plaid success', async () => {
    plaidService.client.itemRemove.mockResolvedValue({ data: { request_id: '123' } });
    expect(await plaidService.removeItem('access-token')).toEqual({ request_id: '123' });
  });

  test('recognizes previously removed Item as already disconnected', async () => {
    plaidService.client.itemRemove.mockRejectedValue({
      response: { data: { error_code: 'ITEM_NOT_FOUND' } }
    });
    expect(await plaidService.removeItem('access-token')).toEqual({ alreadyRemoved: true });
  });

  test('does not mistake INVALID_ACCESS_TOKEN for successful revocation', async () => {
    plaidService.client.itemRemove.mockRejectedValue({
      response: { data: { error_code: 'INVALID_ACCESS_TOKEN' } }
    });
    await expect(plaidService.removeItem('access-token'))
      .rejects.toThrow('INVALID_ACCESS_TOKEN');
  });
});
