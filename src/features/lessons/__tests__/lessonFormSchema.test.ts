import { makeLesson } from '@/test/fixtures';

import {
  createLessonFormSchema,
  defaultLessonFormValues,
  lessonToFormValues,
  occurrenceStarts,
  toLessonInputs,
  type LessonFormValues,
} from '../lessonFormSchema';

const schema = createLessonFormSchema({ requireFutureStart: true });
const base = () => defaultLessonFormValues(new Date());

/** A single lesson, so tests about one occurrence aren't affected by repeats. */
const once = () => ({ ...base(), repeatWeekly: false });

function errorsFor(values: LessonFormValues) {
  const result = schema.safeParse(values);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]));
}

describe('lesson form defaults', () => {
  it('defaults to one court at Complexe Sportif Longueuil, a 2-hour session at 6:00 PM tomorrow', () => {
    const values = base();
    expect(values.location).toBe('Complexe Sportif Longueuil');
    expect(values.title).toBe('Tennis Lesson');
    expect(values.courtCount).toBe(1);
    expect(values.startTime.getHours()).toBe(18);
    expect(values.durationMinutes).toBe(120);
    expect(schema.safeParse(values).success).toBe(true);
  });

  it('repeats weekly and keeps registration open until the start by default', () => {
    const values = base();
    expect(values.repeatWeekly).toBe(true);
    expect(values.repeatWeeks).toBe(8);
    expect(values.deadlineOffsetMinutes).toBe(0);
  });
});

describe('lesson form validation', () => {
  it('requires a title and a location', () => {
    expect(errorsFor({ ...base(), title: '   ' })).toHaveProperty('title');
    expect(errorsFor({ ...base(), location: '' })).toHaveProperty('location');
  });

  it('requires a sensible lesson length', () => {
    expect(errorsFor({ ...base(), durationMinutes: 5 })).toHaveProperty('durationMinutes');
    expect(errorsFor({ ...base(), durationMinutes: 13 * 60 })).toHaveProperty('durationMinutes');
  });

  it('requires at least one court', () => {
    expect(errorsFor({ ...base(), courtCount: 0 })).toHaveProperty('courtCount');
  });

  it('rejects new lessons in the past', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(errorsFor({ ...base(), date: yesterday })).toHaveProperty('startTime');
  });

  it('never lets registration close after the lesson starts', () => {
    expect(errorsFor({ ...base(), deadlineOffsetMinutes: -30 })).toHaveProperty(
      'deadlineOffsetMinutes',
    );
    expect(errorsFor({ ...base(), deadlineOffsetMinutes: 0 })).not.toHaveProperty(
      'deadlineOffsetMinutes',
    );
  });

  it('bounds the length of a weekly series', () => {
    expect(errorsFor({ ...base(), repeatWeeks: 1 })).toHaveProperty('repeatWeeks');
    expect(errorsFor({ ...base(), repeatWeeks: 60 })).toHaveProperty('repeatWeeks');
  });

  it('ignores the number of weeks when the lesson does not repeat', () => {
    expect(errorsFor({ ...base(), repeatWeekly: false, repeatWeeks: 99 })).not.toHaveProperty(
      'repeatWeeks',
    );
  });
});

describe('converting the form to database rows', () => {
  it('converts local wall-clock values into absolute timestamps', () => {
    const values: LessonFormValues = {
      ...once(),
      date: new Date(2026, 8, 28),
      startTime: new Date(2026, 0, 1, 18, 0),
      durationMinutes: 90,
      description: '  ',
      title: '  Doubles clinic ',
    };
    const inputs = toLessonInputs(values);
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({
      title: 'Doubles clinic',
      description: null,
      start_time: '2026-09-28T22:00:00.000Z',
      end_time: '2026-09-28T23:30:00.000Z',
      location: 'Complexe Sportif Longueuil',
      court_count: 1,
      // Default rule: registration stays open until the start (6:00 PM).
      registration_deadline: '2026-09-28T22:00:00.000Z',
    });
  });

  it('turns the deadline offset into an instant before each start', () => {
    const inputs = toLessonInputs({
      ...once(),
      date: new Date(2026, 8, 28),
      startTime: new Date(2026, 0, 1, 18, 0),
      deadlineOffsetMinutes: 24 * 60,
    });
    // 6:00 PM on September 27, the day before.
    expect(inputs[0].registration_deadline).toBe('2026-09-27T22:00:00.000Z');
  });

  it('creates one row per week, same weekday and clock time', () => {
    const inputs = toLessonInputs({
      ...base(),
      date: new Date(2026, 8, 28),
      startTime: new Date(2026, 0, 1, 18, 0),
      repeatWeekly: true,
      repeatWeeks: 3,
    });
    expect(inputs.map((i) => i.start_time)).toEqual([
      '2026-09-28T22:00:00.000Z',
      '2026-10-05T22:00:00.000Z',
      '2026-10-12T22:00:00.000Z',
    ]);
  });

  it('keeps 6:00 PM across the end of daylight saving', () => {
    // DST ends Sunday November 1, 2026, between these two Mondays.
    const starts = occurrenceStarts({
      ...base(),
      date: new Date(2026, 9, 26),
      startTime: new Date(2026, 0, 1, 18, 0),
      repeatWeekly: true,
      repeatWeeks: 2,
    });
    expect(starts.map((d) => d.getHours())).toEqual([18, 18]);
    // The absolute instants differ by 25 hours × 7, not a flat 7 × 24 h.
    expect(starts[0].toISOString()).toBe('2026-10-26T22:00:00.000Z');
    expect(starts[1].toISOString()).toBe('2026-11-02T23:00:00.000Z');
  });
});

describe('editing an existing lesson', () => {
  it('round-trips an existing lesson', () => {
    const lesson = makeLesson({
      court_count: 2,
      registration_deadline: '2026-09-27T22:00:00.000Z',
    });
    const values = lessonToFormValues(lesson);
    expect(values.durationMinutes).toBe(90);
    expect(values.deadlineOffsetMinutes).toBe(24 * 60);

    const inputs = toLessonInputs(values);
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({
      start_time: lesson.start_time,
      end_time: lesson.end_time,
      court_count: 2,
      registration_deadline: '2026-09-27T22:00:00.000Z',
    });
  });

  it('never repeats when editing', () => {
    expect(lessonToFormValues(makeLesson()).repeatWeekly).toBe(false);
  });

  it('keeps an unusual length or deadline instead of snapping to a preset', () => {
    const lesson = makeLesson({
      start_time: '2026-09-28T22:00:00.000Z',
      end_time: '2026-09-28T23:10:00.000Z',
      registration_deadline: '2026-09-28T19:30:00.000Z',
    });
    const values = lessonToFormValues(lesson);
    expect(values.durationMinutes).toBe(70);
    expect(values.deadlineOffsetMinutes).toBe(150);
  });
});
