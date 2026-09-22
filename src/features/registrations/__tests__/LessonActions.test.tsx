import { render, screen, userEvent } from '@testing-library/react-native';

import { getLessonAvailability } from '@/features/lessons/lessonState';
import { makeLesson, NOW } from '@/test/fixtures';

import { LessonActionsView } from '../LessonActions';

// makeLesson(): a 1-court lesson on Monday September 28, 2026, 6:00 PM; NOW is a week earlier.
type ViewProps = Parameters<typeof LessonActionsView>[0];

async function renderActions(props: Partial<ViewProps> & Pick<ViewProps, 'availability'>) {
  const callbacks = { onJoin: jest.fn(), onJoinWaitlist: jest.fn(), onCancel: jest.fn() };
  await render(
    <LessonActionsView lessonId="lesson-1" waitlistPosition={null} {...callbacks} {...props} />,
  );
  return callbacks;
}

const open = () => getLessonAvailability(makeLesson({ registered_count: 2 }), null, NOW);
const full = () => getLessonAvailability(makeLesson({ registered_count: 4 }), null, NOW);

describe('LessonActionsView', () => {
  it('offers Join lesson when a spot is available', async () => {
    const user = userEvent.setup();
    const callbacks = await renderActions({ availability: open() });

    await user.press(screen.getByRole('button', { name: 'Join lesson' }));
    expect(callbacks.onJoin).toHaveBeenCalledTimes(1);
  });

  it('disables Join while the request is in flight', async () => {
    await renderActions({ availability: open(), joining: true });
    expect(
      screen.getByRole('button', { name: 'Join lesson' }).props.accessibilityState,
    ).toMatchObject({ disabled: true, busy: true });
  });

  it('offers the waitlist when the lesson is full', async () => {
    const user = userEvent.setup();
    const callbacks = await renderActions({ availability: full() });

    expect(screen.queryByRole('button', { name: 'Join lesson' })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Join the waitlist' }));
    expect(callbacks.onJoinWaitlist).toHaveBeenCalledTimes(1);
  });

  it('lets a registered player cancel, and says until when', async () => {
    const user = userEvent.setup();
    const callbacks = await renderActions({
      availability: getLessonAvailability(makeLesson({ registered_count: 3 }), 'joined', NOW),
    });

    expect(screen.getByText(/You can cancel until/)).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Cancel participation' }));
    expect(callbacks.onCancel).toHaveBeenCalledTimes(1);
  });

  it('explains that cancelling is closed within 24 hours', async () => {
    const dayBefore = new Date('2026-09-28T10:00:00.000Z');
    await renderActions({
      availability: getLessonAvailability(makeLesson({ registered_count: 3 }), 'joined', dayBefore),
    });

    expect(screen.queryByRole('button', { name: 'Cancel participation' })).toBeNull();
    expect(screen.getByText(/Cancellations close 24 hours before/)).toBeTruthy();
  });

  it('shows the place in line and lets the player leave the waitlist', async () => {
    const user = userEvent.setup();
    const callbacks = await renderActions({
      availability: getLessonAvailability(makeLesson({ registered_count: 4 }), 'waitlisted', NOW),
      waitlistPosition: 2,
    });

    expect(screen.getByText("You're #2 in line")).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Leave the waitlist' }));
    expect(callbacks.onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows nothing on a list card for a cancelled lesson, a disabled button on the lesson', async () => {
    const cancelled = getLessonAvailability(makeLesson({ status: 'cancelled' }), null, NOW);
    await renderActions({ availability: cancelled });
    expect(screen.queryByRole('button')).toBeNull();

    await renderActions({ availability: cancelled, detailed: true });
    expect(
      screen.getByRole('button', { name: 'Lesson cancelled' }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
  });
});
