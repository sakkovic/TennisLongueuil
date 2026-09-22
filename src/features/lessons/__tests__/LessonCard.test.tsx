import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

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
  it('shows the date block, time, place, level, capacity and participants', async () => {
    await render(
      <LessonCard
        lesson={makeLesson({ registrations: threePlayers() })}
        onPress={jest.fn()}
        now={NOW}
      />,
    );

    // Date block: weekday, day and month (decorative, so hidden from screen readers).
    const hidden = { includeHiddenElements: true };
    expect(screen.getByText('MON', hidden)).toBeTruthy();
    expect(screen.getByText('28', hidden)).toBeTruthy();
    expect(screen.getByText('SEP', hidden)).toBeTruthy();
    expect(screen.getByText('6:00 PM – 7:30 PM')).toBeTruthy();
    expect(screen.getByText('Group Tennis Lesson')).toBeTruthy();
    expect(screen.getByText('Complexe Sportif Longueuil')).toBeTruthy();
    expect(screen.getByText('Intermediate')).toBeTruthy();
    expect(screen.getByText('3 / 4')).toBeTruthy();
    expect(screen.getByText('1 spot remaining')).toBeTruthy();
    expect(screen.getByText('Mohamed, Alice and Zdenek')).toBeTruthy();
  });

  it('opens the lesson when the card is tapped', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<LessonCard lesson={makeLesson()} onPress={onPress} now={NOW} />);

    await user.press(screen.getByRole('button', { name: /Group Tennis Lesson/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows the actions below the details, separately pressable', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <LessonCard
        lesson={makeLesson()}
        onPress={onPress}
        now={NOW}
        actions={<Text>Actions here</Text>}
      />,
    );

    expect(screen.getByText('Actions here')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: /Group Tennis Lesson/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks a lesson the player is registered for', async () => {
    const lesson = makeLesson({
      registrations: [...threePlayers(), makeRegistration({ player_id: ME, name: 'Me Myself' })],
    });
    await render(<LessonCard lesson={lesson} currentUserId={ME} onPress={jest.fn()} now={NOW} />);

    expect(screen.getByText("You're registered")).toBeTruthy();
  });

  it('shows FULL when the lesson is full', async () => {
    const lesson = makeLesson({
      registrations: [...threePlayers(), makeRegistration({ name: 'Maëlys Tremblay' })],
    });
    await render(<LessonCard lesson={lesson} currentUserId={ME} onPress={jest.fn()} now={NOW} />);

    expect(screen.getByText('4 / 4')).toBeTruthy();
    expect(screen.getByText('Full')).toBeTruthy();
  });

  it('shows a cancelled lesson clearly and without capacity', async () => {
    await render(
      <LessonCard
        lesson={makeLesson({ status: 'cancelled', registrations: threePlayers() })}
        currentUserId={ME}
        onPress={jest.fn()}
        now={NOW}
      />,
    );

    expect(screen.getByText('Lesson cancelled')).toBeTruthy();
    expect(screen.getByText('This lesson has been cancelled.')).toBeTruthy();
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
