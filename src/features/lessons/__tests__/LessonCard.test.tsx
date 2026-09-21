import { render, screen, userEvent } from '@testing-library/react-native';

import { makeLesson, makeRegistration, NOW } from '@/test/fixtures';

import { LessonCard } from '../LessonCard';

jest.mock('@/lib/supabase', () => ({ getAvatarUrl: () => null }));

const ME = 'player-me';

function threePlayers() {
  return [
    makeRegistration({ name: 'Mohamed Anis Sakka' }),
    makeRegistration({ name: 'Alice Smith' }),
    makeRegistration({ name: 'Zdenek Novak' }),
  ];
}

describe('LessonCard', () => {
  it('shows date, time, location, level, capacity and participants', async () => {
    await render(
      <LessonCard
        lesson={makeLesson({ registrations: threePlayers() })}
        onPress={jest.fn()}
        now={NOW}
      />,
    );

    expect(screen.getByText('MONDAY · SEP 28')).toBeTruthy();
    expect(screen.getByText('6:00 PM – 7:30 PM')).toBeTruthy();
    expect(screen.getByText('Complexe Sportif Longueuil')).toBeTruthy();
    expect(screen.getByText('Intermediate')).toBeTruthy();
    expect(screen.getByText('3 / 4')).toBeTruthy();
    expect(screen.getByText('1 spot remaining')).toBeTruthy();
    expect(screen.getByText('Mohamed, Alice and Zdenek')).toBeTruthy();
  });

  it('offers JOIN LESSON when a spot is available', async () => {
    const user = userEvent.setup();
    const onJoin = jest.fn();
    await render(
      <LessonCard
        lesson={makeLesson({ registrations: threePlayers() })}
        currentUserId={ME}
        onPress={jest.fn()}
        onJoin={onJoin}
        now={NOW}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Join lesson' }));
    expect(onJoin).toHaveBeenCalledTimes(1);
  });

  it('disables the join button while the request is in flight', async () => {
    await render(
      <LessonCard
        lesson={makeLesson()}
        currentUserId={ME}
        onPress={jest.fn()}
        onJoin={jest.fn()}
        joining
        now={NOW}
      />,
    );
    const button = screen.getByRole('button', { name: 'Join lesson' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
  });

  it('shows "You\'re registered" instead of JOIN for a registered player', async () => {
    const lesson = makeLesson({
      registrations: [...threePlayers(), makeRegistration({ player_id: ME, name: 'Me Myself' })],
    });
    await render(
      <LessonCard
        lesson={lesson}
        currentUserId={ME}
        onPress={jest.fn()}
        onJoin={jest.fn()}
        now={NOW}
      />,
    );

    expect(screen.getByText("You're registered")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View lesson' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Join lesson' })).toBeNull();
  });

  it('shows FULL and no join button when the lesson is full', async () => {
    const lesson = makeLesson({
      registrations: [...threePlayers(), makeRegistration({ name: 'Maëlys Tremblay' })],
    });
    await render(
      <LessonCard
        lesson={lesson}
        currentUserId={ME}
        onPress={jest.fn()}
        onJoin={jest.fn()}
        now={NOW}
      />,
    );

    expect(screen.getByText('4 / 4')).toBeTruthy();
    expect(screen.getByText('Full')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Join lesson' })).toBeNull();
  });

  it('shows a cancelled lesson clearly and without actions', async () => {
    await render(
      <LessonCard
        lesson={makeLesson({ status: 'cancelled', registrations: threePlayers() })}
        currentUserId={ME}
        onPress={jest.fn()}
        onJoin={jest.fn()}
        now={NOW}
      />,
    );

    expect(screen.getByText('Lesson cancelled')).toBeTruthy();
    expect(screen.getByText('This lesson has been cancelled.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Join lesson' })).toBeNull();
    expect(screen.queryByText('3 / 4')).toBeNull();
  });

  it('shows "All levels" when the lesson has no target level', async () => {
    await render(
      <LessonCard
        lesson={makeLesson({ level: null, player_level_id: null })}
        onPress={jest.fn()}
        now={NOW}
      />,
    );
    expect(screen.getByText('All levels')).toBeTruthy();
  });
});
