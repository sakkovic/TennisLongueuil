import { render, screen, userEvent } from '@testing-library/react-native';

import { SessionPoster } from '../SessionPoster';

jest.mock('@/lib/supabase', () => ({ supabase: {}, getAvatarUrl: () => null }));

describe('SessionPoster', () => {
  it('shows the brand, the offer and the next sessions like a flyer', async () => {
    await render(
      <SessionPoster
        slots={[
          { id: 'a', startTime: '2026-09-28T22:00:00.000Z', tone: 'open', spotsLeft: 3 },
          { id: 'b', startTime: '2026-10-01T23:00:00.000Z', tone: 'full', spotsLeft: 0 },
        ]}
        primaryAction={{ label: 'Book your spot', onPress: jest.fn() }}
      />,
    );

    expect(screen.getByText('SaKKa.Tennis')).toBeTruthy();
    expect(screen.getByText('120-minute sessions')).toBeTruthy();
    expect(screen.getByText('Complexe Sportif Longueuil')).toBeTruthy();
    expect(screen.getByText('120 min · Coach CP1 · 4 players per court')).toBeTruthy();
    expect(screen.getByText('6:00 PM')).toBeTruthy();
    expect(screen.getByText('3 spots left')).toBeTruthy();
    expect(screen.getByText('Full')).toBeTruthy();
    expect(screen.getByText('$45')).toBeTruthy();
    expect(screen.getByText('+ court fees shared')).toBeTruthy();
    expect(screen.getByText('Coach · Sakka Mohamed Anis · CP1')).toBeTruthy();
  });

  it('runs the main action and opens a tapped session', async () => {
    const user = userEvent.setup();
    const onBook = jest.fn();
    const onPressSlot = jest.fn();
    await render(
      <SessionPoster
        slots={[{ id: 'a', startTime: '2026-09-28T22:00:00.000Z', tone: 'open', spotsLeft: 1 }]}
        onPressSlot={onPressSlot}
        primaryAction={{ label: 'Book your spot', sublabel: 'Next session', onPress: onBook }}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Book your spot. Next session' }));
    expect(onBook).toHaveBeenCalledTimes(1);

    await user.press(screen.getByRole('button', { name: /1 spot left/ }));
    expect(onPressSlot).toHaveBeenCalledWith('a');
  });

  it('says when no session is scheduled yet', async () => {
    await render(
      <SessionPoster
        slots={[]}
        primaryAction={{ label: 'New sessions coming soon', onPress: jest.fn(), disabled: true }}
      />,
    );
    expect(screen.getAllByText('New sessions coming soon').length).toBeGreaterThan(0);
  });
});
