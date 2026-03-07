import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../models/tabs', () => ({
  default: {
    erase: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    update: vi.fn()
  }
}));

import Tabs from '../models/tabs';
import app from './tabs';

function createRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn()
  };
}

describe('tabs controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('writes sort updates into sortByGroup when scope id is provided', async () => {
    Tabs.findOne.mockResolvedValue({
      _id: 'tab-1',
      sortByGroup: {
        'group-1': 2
      }
    });
    Tabs.update.mockResolvedValue({
      _id: 'tab-1',
      sortByGroup: {
        'group-1': 2,
        'group-2': 5
      }
    });

    const req = {
      params: { _tabId: 'tab-1' },
      body: {
        sort: 5,
        sortScopeId: 'group-2',
        tabName: 'Updated name'
      },
      user: { _id: 'user-1' }
    };
    const res = createRes();

    await app.updateTab(req, res);

    expect(Tabs.findOne).toHaveBeenCalledWith('tab-1');
    expect(Tabs.update).toHaveBeenCalledWith('tab-1', {
      tabName: 'Updated name',
      sortByGroup: {
        'group-1': 2,
        'group-2': 5
      }
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _id: 'tab-1' }));
  });

  test('returns 400 for invalid scoped sort values', async () => {
    const req = {
      params: { _tabId: 'tab-1' },
      body: {
        sort: 'not-a-number',
        sortScopeId: 'group-2'
      },
      user: { _id: 'user-1' }
    };
    const res = createRes();

    await app.updateTab(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'sort must be a valid number' });
    expect(Tabs.findOne).not.toHaveBeenCalled();
    expect(Tabs.update).not.toHaveBeenCalled();
  });

  test('keeps legacy global sort updates when no scope id is provided', async () => {
    Tabs.update.mockResolvedValue({ _id: 'tab-1', sort: 9 });

    const req = {
      params: { _tabId: 'tab-1' },
      body: {
        sort: 9
      },
      user: { _id: 'user-1' }
    };
    const res = createRes();

    await app.updateTab(req, res);

    expect(Tabs.findOne).not.toHaveBeenCalled();
    expect(Tabs.update).toHaveBeenCalledWith('tab-1', {
      sort: 9
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _id: 'tab-1' }));
  });
});
