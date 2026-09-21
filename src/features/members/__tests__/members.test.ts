import { makeMember } from '@/test/fixtures';
import { getAccountState } from '@/types/models';

import { filterMembers, groupMembers } from '../api';

describe('getAccountState', () => {
  it('reports an approved, active member as active', () => {
    expect(getAccountState(makeMember())).toBe('active');
  });

  it('reports a never-approved account as pending', () => {
    expect(getAccountState(makeMember({ active: false, approved_at: null }))).toBe('pending');
  });

  it('reports an account approved then switched off as deactivated', () => {
    const member = makeMember({ active: false, approved_at: '2026-09-01T00:00:00.000Z' });
    expect(getAccountState(member)).toBe('deactivated');
  });

  it('never calls an active account pending, even without an approval date', () => {
    expect(getAccountState(makeMember({ active: true, approved_at: null }))).toBe('active');
  });
});

describe('groupMembers', () => {
  it('separates sign-ups waiting for approval from everyone else', () => {
    const pendingMember = makeMember({ full_name: 'Julie', active: false, approved_at: null });
    const activeMember = makeMember({ full_name: 'Alice' });
    const deactivated = makeMember({
      full_name: 'Zdenek',
      active: false,
      approved_at: '2026-09-02T00:00:00.000Z',
    });

    const { pending, approved } = groupMembers([pendingMember, activeMember, deactivated]);

    expect(pending.map((m) => m.full_name)).toEqual(['Julie']);
    expect(approved.map((m) => m.full_name)).toEqual(['Alice', 'Zdenek']);
  });

  it('returns empty groups for an empty list', () => {
    expect(groupMembers([])).toEqual({ pending: [], approved: [] });
  });
});

describe('filterMembers', () => {
  const members = [
    makeMember({ full_name: 'Mohamed Anis Sakka', email: 'mohamed@tennis.local' }),
    makeMember({ full_name: 'Maëlys Tremblay', email: 'maelys@tennis.local' }),
  ];

  it('returns everyone when the search is blank', () => {
    expect(filterMembers(members, '   ')).toHaveLength(2);
  });

  it('matches on name or email, ignoring case', () => {
    expect(filterMembers(members, 'ANIS').map((m) => m.email)).toEqual(['mohamed@tennis.local']);
    expect(filterMembers(members, 'maelys@').map((m) => m.full_name)).toEqual(['Maëlys Tremblay']);
  });
});
