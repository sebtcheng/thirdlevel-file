import { describe, it, expect } from 'vitest';
import { buildApiUrl } from '../src/utils/api.js';

describe('buildApiUrl', () => {
  it('never produces a duplicate /api/api segment, whichever form the base takes', () => {
    const expected = '/insighted-third-level-officials/api/auth/login';
    expect(buildApiUrl('/insighted-third-level-officials', '/api/auth/login')).toBe(expected);
    expect(buildApiUrl('/insighted-third-level-officials/api', '/api/auth/login')).toBe(expected);
    expect(buildApiUrl('/insighted-third-level-officials/api/', '/api/auth/login')).toBe(expected);
  });

  it('works with an absolute production origin', () => {
    expect(buildApiUrl('https://stride.deped.gov.ph/insighted-third-level-officials/api', '/api/pooling/status'))
      .toBe('https://stride.deped.gov.ph/insighted-third-level-officials/api/pooling/status');
  });

  it('uses the path as-is when no base is set (dev proxy) and adds a missing leading slash', () => {
    expect(buildApiUrl('', '/api/pooling/status')).toBe('/api/pooling/status');
    expect(buildApiUrl(undefined, 'api/pooling/status')).toBe('/api/pooling/status');
  });

  it('prefixes http:// for a bare localhost base', () => {
    expect(buildApiUrl('localhost:3008', '/api/auth/login')).toBe('http://localhost:3008/api/auth/login');
  });
});
