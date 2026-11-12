import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/features/pooling/repositories/poolingRepository.js', () => ({
  findCandidateApplicationById: vi.fn(),
  withdrawCandidateApplication: vi.fn()
}));

import { withdrawApplication } from '../src/features/pooling/controller.js';
import { findCandidateApplicationById, withdrawCandidateApplication } from '../src/features/pooling/repositories/poolingRepository.js';

const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() });

describe('Application withdrawal ownership and state checks', () => {
  beforeEach(() => vi.resetAllMocks());

  it('requires an authenticated identity', async () => {
    const res = response();
    await withdrawApplication({ params: { id: '1' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(withdrawCandidateApplication).not.toHaveBeenCalled();
  });

  it('does not modify another candidate application', async () => {
    findCandidateApplicationById.mockResolvedValue(null);
    const res = response();
    await withdrawApplication({ user: { uid: 'owner' }, params: { id: '1' } }, res);
    expect(findCandidateApplicationById).toHaveBeenCalledWith('owner', 1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(withdrawCandidateApplication).not.toHaveBeenCalled();
  });

  it('rejects a state change that is no longer eligible', async () => {
    findCandidateApplicationById.mockResolvedValue({ id: 1 });
    withdrawCandidateApplication.mockResolvedValue(null);
    const res = response();
    await withdrawApplication({ user: { id: 'owner' }, params: { id: '1' } }, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('returns the withdrawn record for the signed-in owner', async () => {
    findCandidateApplicationById.mockResolvedValue({ id: 1 });
    withdrawCandidateApplication.mockResolvedValue({ id: 1, status: 'withdrawn' });
    const res = response();
    await withdrawApplication({ user: { uid: 'owner', id: 'other' }, params: { id: '1' } }, res);
    expect(withdrawCandidateApplication).toHaveBeenCalledWith('owner', 1);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, status: 'withdrawn' } });
  });
});
