import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../models/reports', () => ({
  default: {
    findOne: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    erase: vi.fn()
  }
}));

import Reports from '../models/reports';
import app from './reports';

function createRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn()
  };
}

describe('reports controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('denies access when fetching report owned by another user', async () => {
    Reports.findOne.mockResolvedValue({ _id: 'report-1', userId: 'user-2' });

    const req = {
      user: { _id: 'user-1' },
      params: { _reportId: 'report-1' }
    };
    const res = createRes();

    await app.getReports(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User not authorized to access this report' })
    );
  });

  test('creates report with normalized payload', async () => {
    Reports.save.mockResolvedValue({
      _id: 'report-1',
      userId: 'user-1',
      name: 'Monthly',
      rows: [
        {
          rowId: 'r1',
          type: 'manual',
          title: 'manual',
          amount: 25,
          sort: 0
        }
      ]
    });

    const req = {
      user: { _id: 'user-1' },
      body: {
        name: ' Monthly ',
        rows: [
          {
            rowId: 'r1',
            type: 'manual',
            title: 'manual',
            amount: '25',
            sort: 9,
            unknown: true
          }
        ]
      }
    };

    const res = createRes();
    await app.saveReport(req, res);

    expect(Reports.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Monthly',
        totalFormula: '',
        totalDisplayType: 'dollar',
        rows: [
          {
            rowId: 'r1',
            type: 'manual',
            title: 'manual',
            amount: 25,
            sort: 0
          }
        ]
      })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _id: 'report-1' }));
  });

  test('deletes report when user owns it', async () => {
    Reports.findOne.mockResolvedValue({ _id: 'report-1', userId: 'user-1' });
    Reports.erase.mockResolvedValue({ removed: true });

    const req = {
      user: { _id: 'user-1' },
      params: { _reportId: 'report-1' }
    };
    const res = createRes();

    await app.deleteReport(req, res);

    expect(Reports.erase).toHaveBeenCalledWith('report-1');
    expect(res.json).toHaveBeenCalledWith({ removed: true });
  });
});
