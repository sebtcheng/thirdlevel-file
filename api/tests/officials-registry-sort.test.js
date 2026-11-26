import { describe, expect, it } from 'vitest';
import { buildOfficialsOrderBy } from '../src/features/officials-registry/controller.js';

describe('buildOfficialsOrderBy', () => {
  const columns = ['status', 'office', 'position_title', 'first_name', 'name', 'region', 'division', 'designation', 'profile_completion', undefined, 'unknown', 'constructor'];

  it.each(columns)('ends with the unique TLOid when sorting by %s', (column) => {
    expect(buildOfficialsOrderBy(column, 'asc')).toMatch(/f."TLOid" ASC$/);
    expect(buildOfficialsOrderBy(column, 'desc')).toMatch(/f."TLOid" ASC$/);
  });

  it('sorts names by first name, then last name', () => {
    const sql = buildOfficialsOrderBy('name', 'asc');
    expect(sql.indexOf('f.first_name')).toBeLessThan(sql.indexOf('f.last_name'));
    expect(sql).not.toContain('DESC');
    expect(buildOfficialsOrderBy('name', 'desc').match(/DESC NULLS LAST/g)).toHaveLength(2);
  });

  it('breaks ties by name for other columns', () => {
    const sql = buildOfficialsOrderBy('status', 'desc');
    expect(sql).toContain('ORDER BY f.status DESC NULLS LAST, ');
    expect(sql.indexOf('f.status')).toBeLessThan(sql.indexOf('f.first_name'));
    expect(sql.match(/DESC/g)).toHaveLength(1);
  });

  it('falls back to TLOid for unknown columns', () => {
    expect(buildOfficialsOrderBy('unknown', 'desc')).toBe(' ORDER BY f."TLOid" ASC');
  });
});
