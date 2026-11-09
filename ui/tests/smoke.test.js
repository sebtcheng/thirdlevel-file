import { describe, it, expect } from 'vitest';
import { normalizeRole } from '../src/utils/roleUtils.js';

describe('ui smoke', () => {
  it('normalizes role names', () => {
    expect(normalizeRole('deped_efd admin')).toBe('DepEd EFD Admin');
    expect(normalizeRole('')).toBeNull();
  });
});
