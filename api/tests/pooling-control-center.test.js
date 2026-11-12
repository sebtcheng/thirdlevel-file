import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/features/pooling/repositories/poolingRepository.js', () => ({
  getPoolingConfig: vi.fn(),
  setPoolingIntakeActive: vi.fn(),
  setPoolingDateRange: vi.fn()
}));
import { updatePoolingStatus, submitApplication } from '../src/features/pooling/controller.js';
import { getPoolingConfig, setPoolingIntakeActive, setPoolingDateRange } from '../src/features/pooling/repositories/poolingRepository.js';

const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() });
describe('Vacancies control center', () => {
  beforeEach(() => vi.resetAllMocks());
  it.each([undefined, { role: 'Applicant' }, { role: 'Regional Office' }])('rejects unauthorized changes from %j', async user => {
    const res = response();
    await updatePoolingStatus({ user, body: { is_intake_active: false } }, res);
    expect(res.status).toHaveBeenCalledWith(user ? 403 : 401);
    expect(setPoolingIntakeActive).not.toHaveBeenCalled();
  });
  it('rejects non-boolean settings', async () => {
    const res = response();
    await updatePoolingStatus({ user: { role: 'Central Office' }, body: { is_intake_active: 'false' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(setPoolingIntakeActive).not.toHaveBeenCalled();
  });
  it.each([true, false])('persists administrator setting %s', async active => {
    getPoolingConfig.mockResolvedValue({ is_intake_active: active });
    const res = response();
    await updatePoolingStatus({ user: { role: 'Central Office' }, body: { is_intake_active: active } }, res);
    expect(setPoolingIntakeActive).toHaveBeenCalledWith(active);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, isOpen: active }));
  });
  it('keeps an expired window closed after unlocking', async () => {
    getPoolingConfig.mockResolvedValue({ is_intake_active: true, intake_end_date: '2000-01-01' });
    const res = response();
    await updatePoolingStatus({ user: { role: 'Admin' }, body: { is_intake_active: true } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isOpen: false }));
  });
  it('rejects submissions while locked before processing the application', async () => {
    getPoolingConfig.mockResolvedValue({ is_intake_active: false });
    const res = response();
    await submitApplication({ user: { uid: 'candidate' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
  it.each([
    { start_date: '2026-11-20', end_date: '2026-11-19' },
    { start_date: '2026-02-30', end_date: '2026-03-05' },
    { start_date: '2026-11-20' }
  ])('rejects invalid date range %j', async body => {
    const res = response();
    await updatePoolingStatus({ user: { role: 'Admin' }, body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(setPoolingDateRange).not.toHaveBeenCalled();
  });
  it('saves an inclusive single-day Philippine-time window without unlocking', async () => {
    getPoolingConfig.mockResolvedValue({ is_intake_active: false });
    const res = response();
    await updatePoolingStatus({ user: { role: 'Admin' }, body: { start_date: '2026-11-20', end_date: '2026-11-20' } }, res);
    expect(setPoolingDateRange).toHaveBeenCalledWith('2026-11-20T00:00:00.000+08:00', '2026-11-20T23:59:59.999+08:00');
    expect(setPoolingIntakeActive).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isOpen: false }));
  });
});
