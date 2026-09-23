import { render, screen, userEvent } from '@testing-library/react-native';

import { makeMember } from '@/test/fixtures';

import { PlayerPicker } from '../PlayerPicker';

jest.mock('@/lib/supabase', () => ({ getAvatarUrl: () => null }));

const mockMembers = [
  makeMember({ id: 'alice', full_name: 'Alice Smith' }),
  makeMember({ id: 'zdenek', full_name: 'Zdenek Novak' }),
  makeMember({ id: 'maelys', full_name: 'Maëlys Tremblay' }),
  // Not selectable: pending, deactivated, and the coach.
  makeMember({ id: 'pending', full_name: 'Julie Bergeron', active: false, approved_at: null }),
  makeMember({ id: 'gone', full_name: 'Gone Player', active: false }),
  makeMember({ id: 'coach', full_name: 'Coach Sakka', role: 'admin' }),
];

jest.mock('../hooks', () => ({
  useMembers: () => ({ data: mockMembers, isPending: false }),
}));

describe('PlayerPicker', () => {
  it('lists only active players', async () => {
    await render(<PlayerPicker value={[]} onChange={jest.fn()} max={4} />);

    expect(screen.getByText('Alice Smith')).toBeTruthy();
    expect(screen.queryByText('Julie Bergeron')).toBeNull();
    expect(screen.queryByText('Gone Player')).toBeNull();
    expect(screen.queryByText('Coach Sakka')).toBeNull();
  });

  it('adds and removes a player, and counts the spots', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await render(<PlayerPicker value={['alice']} onChange={onChange} max={4} />);

    expect(screen.getByText('1 of 4 chosen')).toBeTruthy();

    await user.press(screen.getByRole('checkbox', { name: 'Zdenek Novak' }));
    expect(onChange).toHaveBeenLastCalledWith(['alice', 'zdenek']);

    await user.press(screen.getByRole('checkbox', { name: 'Alice Smith' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('stops at the number of spots', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await render(<PlayerPicker value={['alice', 'zdenek']} onChange={onChange} max={2} />);

    const full = screen.getByRole('checkbox', { name: 'Maëlys Tremblay' });
    expect(full.props.accessibilityState).toMatchObject({ disabled: true });
    await user.press(full);
    expect(onChange).not.toHaveBeenCalled();

    // Removing one is still possible.
    await user.press(screen.getByRole('checkbox', { name: 'Alice Smith' }));
    expect(onChange).toHaveBeenLastCalledWith(['zdenek']);
  });
});
