import { makeLesson } from '@/test/fixtures';
import { setDateLocale } from '@/utils/date';

import {
  archiveLessons,
  defaultWeekKey,
  liveUpcomingLessons,
  resolveWeekKey,
  weekRelativeLabel,
  weeksFromItems,
} from '../lessonWeeks';

// Monday September 21, 2026.
const now = new Date(2026, 8, 21, 9, 0);

describe('lesson weeks', () => {
  beforeEach(() => setDateLocale('en'));

  it('groups lessons by Monday-based week and keeps Sunday with the previous Monday', () => {
    const tuesday = makeLesson({ start_time: '2026-09-22T22:00:00.000Z' });
    const nextMonday = makeLesson({ start_time: '2026-09-28T22:00:00.000Z' });
    const sunday = makeLesson({ start_time: '2026-09-20T22:00:00.000Z' });

    const weeks = weeksFromItems([tuesday, nextMonday, sunday], (lesson) => lesson.start_time);

    expect(weeks.map((week) => week.key)).toEqual(['2026-09-14', '2026-09-21', '2026-09-28']);
    expect(weeks[0].items).toEqual([sunday]);
    expect(weeks[1].items).toEqual([tuesday]);
    expect(weeks[2].items).toEqual([nextMonday]);
  });

  it('prefers this week, then the soonest or latest week with lessons', () => {
    const weeks = [{ key: '2026-09-28' }, { key: '2026-10-05' }, { key: '2026-10-12' }];

    expect(defaultWeekKey([{ key: '2026-09-21' }, ...weeks], 'soonest', now)).toBe('2026-09-21');
    expect(defaultWeekKey(weeks, 'soonest', now)).toBe('2026-09-28');
    expect(defaultWeekKey(weeks, 'latest', now)).toBe('2026-10-12');
    expect(defaultWeekKey([], 'soonest', now)).toBeNull();
  });

  it('keeps a selected week when it still exists', () => {
    const weeks = [{ key: '2026-09-28' }, { key: '2026-10-05' }];
    expect(resolveWeekKey(weeks, '2026-10-05', 'soonest', now)).toBe('2026-10-05');
    expect(resolveWeekKey(weeks, '2026-10-19', 'soonest', now)).toBe('2026-09-28');
  });

  it('keeps only scheduled lessons on the main list and archives cancelled ones', () => {
    const live = makeLesson({ status: 'scheduled', start_time: '2026-09-22T22:00:00.000Z' });
    const cancelled = makeLesson({
      status: 'cancelled',
      start_time: '2026-09-22T22:00:00.000Z',
    });
    const past = makeLesson({ start_time: '2026-09-15T22:00:00.000Z' });

    expect(liveUpcomingLessons([live, cancelled])).toEqual([live]);
    expect(archiveLessons([live, cancelled], [past]).map((lesson) => lesson.id)).toEqual([
      cancelled.id,
      past.id,
    ]);
  });

  it('labels this, next and last week', () => {
    expect(weekRelativeLabel(new Date(2026, 8, 21), now)).toBe('thisWeek');
    expect(weekRelativeLabel(new Date(2026, 8, 28), now)).toBe('nextWeek');
    expect(weekRelativeLabel(new Date(2026, 8, 14), now)).toBe('lastWeek');
    expect(weekRelativeLabel(new Date(2026, 9, 5), now)).toBeNull();
  });
});
