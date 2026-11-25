import { describe, it, expect } from 'vitest';
import { groupRetireesByYear } from '../src/utils/retireeGroups.js';

const person = (TLOid, separationDate) => ({ TLOid, separationDate });
const summary = (groups) => groups.map(g => [g.label, g.officials.map(o => o.TLOid)]);

describe('groupRetireesByYear', () => {
  it('groups by year with the soonest date first', () => {
    const groups = groupRetireesByYear([
      person('c', new Date(2028, 6, 9)),
      person('a', new Date(2027, 7, 8)),
      person('b', new Date(2028, 1, 7)),
    ]);
    expect(summary(groups)).toEqual([['2027', ['a']], ['2028', ['b', 'c']]]);
  });

  it('puts missing and invalid dates last in one group, losing nobody', () => {
    const groups = groupRetireesByYear([
      person('x', null), person('y', 'not a date'), person('a', new Date(2027, 0, 1)),
    ]);
    expect(summary(groups)).toEqual([['2027', ['a']], ['No date', ['x', 'y']]]);
  });

  it('does not reorder the input and handles an empty list', () => {
    const input = [person('b', new Date(2028, 0, 1)), person('a', new Date(2027, 0, 1))];
    groupRetireesByYear(input);
    expect(input.map(o => o.TLOid)).toEqual(['b', 'a']);
    expect(groupRetireesByYear([])).toEqual([]);
  });
});
