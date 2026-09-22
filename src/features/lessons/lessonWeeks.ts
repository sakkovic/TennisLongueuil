import type { Lesson } from '@/features/lessons/api';
import { addWeeks, startOfWeek, toDate, toDateKey, toWeekKey, type DateInput } from '@/utils/date';

export type WeekRelative = 'thisWeek' | 'nextWeek' | 'lastWeek';

export interface LessonWeek<T> {
  /** Monday of the week, as `YYYY-MM-DD`. */
  key: string;
  start: Date;
  items: T[];
}

/** Group items by the Monday-based week of their start time, soonest first. */
export function weeksFromItems<T>(
  items: readonly T[],
  startTime: (item: T) => DateInput,
): LessonWeek<T>[] {
  const groups = new Map<string, LessonWeek<T>>();

  for (const item of items) {
    const start = startOfWeek(toDate(startTime(item)));
    const key = toDateKey(start);
    const existing = groups.get(key);
    if (existing) existing.items.push(item);
    else groups.set(key, { key, start, items: [item] });
  }

  return [...groups.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Prefer the week that contains `now`. If that week has no items, use the
 * soonest week (upcoming lists) or the latest week (past lists).
 */
export function defaultWeekKey(
  weeks: readonly { key: string }[],
  fallback: 'soonest' | 'latest',
  now: Date = new Date(),
): string | null {
  if (weeks.length === 0) return null;
  const current = toWeekKey(now);
  if (weeks.some((week) => week.key === current)) return current;
  return fallback === 'soonest' ? weeks[0].key : weeks[weeks.length - 1].key;
}

export function resolveWeekKey(
  weeks: readonly { key: string }[],
  selected: string | null,
  fallback: 'soonest' | 'latest',
  now: Date = new Date(),
): string | null {
  if (selected && weeks.some((week) => week.key === selected)) return selected;
  return defaultWeekKey(weeks, fallback, now);
}

export function weekRelativeLabel(weekStart: Date, now: Date = new Date()): WeekRelative | null {
  const current = startOfWeek(now);
  if (toDateKey(weekStart) === toDateKey(current)) return 'thisWeek';
  if (toDateKey(weekStart) === toDateKey(addWeeks(current, 1))) return 'nextWeek';
  if (toDateKey(weekStart) === toDateKey(addWeeks(current, -1))) return 'lastWeek';
  return null;
}

/** Live sessions for the main Lessons tab — cancelled copies stay in History. */
export function liveUpcomingLessons(lessons: readonly Lesson[] = []): Lesson[] {
  return lessons.filter((lesson) => lesson.status === 'scheduled');
}

/** Past lessons plus cancelled future ones, newest first. */
export function archiveLessons(
  upcoming: readonly Lesson[] = [],
  past: readonly Lesson[] = [],
): Lesson[] {
  const seen = new Set<string>();
  return [...upcoming.filter((lesson) => lesson.status === 'cancelled'), ...past]
    .filter((lesson) => {
      if (seen.has(lesson.id)) return false;
      seen.add(lesson.id);
      return true;
    })
    .sort((a, b) => b.start_time.localeCompare(a.start_time));
}
