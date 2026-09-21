import { makeLesson } from '@/test/fixtures';

import {
  createLessonFormSchema,
  defaultLessonFormValues,
  lessonToFormValues,
  toLessonInput,
  type LessonFormValues,
} from '../lessonFormSchema';

const schema = createLessonFormSchema({ requireFutureStart: true });
const base = () => defaultLessonFormValues(new Date());

function errorsFor(values: LessonFormValues) {
  const result = schema.safeParse(values);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]));
}

describe('lesson form', () => {
  it('defaults to one court at Complexe Sportif Longueuil, 6:00–7:30 PM tomorrow', () => {
    const values = base();
    expect(values.location).toBe('Complexe Sportif Longueuil');
    expect(values.title).toBe('Tennis Lesson');
    expect(values.courtCount).toBe(1);
    expect(values.startTime.getHours()).toBe(18);
    expect(values.endTime.getHours() * 60 + values.endTime.getMinutes()).toBe(19 * 60 + 30);
    expect(schema.safeParse(values).success).toBe(true);
  });

  it('requires a title and a location', () => {
    expect(errorsFor({ ...base(), title: '   ' })).toHaveProperty('title');
    expect(errorsFor({ ...base(), location: '' })).toHaveProperty('location');
  });

  it('requires the end time to be after the start time', () => {
    const values = base();
    const errors = errorsFor({ ...values, endTime: new Date(values.startTime.getTime() - 60_000) });
    expect(errors.endTime).toBe('The end time must be after the start time.');
  });

  it('requires at least one court', () => {
    expect(errorsFor({ ...base(), courtCount: 0 })).toHaveProperty('courtCount');
  });

  it('rejects a registration deadline after the lesson starts', () => {
    const values = base();
    const errors = errorsFor({
      ...values,
      hasDeadline: true,
      deadline: new Date(values.startTime.getTime() + 60_000),
    });
    expect(errors.deadline).toBe('The registration deadline must be before the lesson starts.');
  });

  it('ignores the deadline value when no deadline is set', () => {
    const values = base();
    expect(
      schema.safeParse({ ...values, hasDeadline: false, deadline: new Date(2100, 0, 1) }).success,
    ).toBe(true);
  });

  it('rejects new lessons in the past', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(errorsFor({ ...base(), date: yesterday })).toHaveProperty('startTime');
  });

  it('converts local wall-clock values into absolute timestamps', () => {
    const values: LessonFormValues = {
      ...base(),
      date: new Date(2026, 8, 28),
      startTime: new Date(2026, 0, 1, 18, 0),
      endTime: new Date(2026, 0, 1, 19, 30),
      description: '  ',
      title: '  Doubles clinic ',
    };
    expect(toLessonInput(values)).toMatchObject({
      title: 'Doubles clinic',
      description: null,
      start_time: '2026-09-28T22:00:00.000Z',
      end_time: '2026-09-28T23:30:00.000Z',
      location: 'Complexe Sportif Longueuil',
      court_count: 1,
      registration_deadline: null,
    });
  });

  it('round-trips an existing lesson', () => {
    const lesson = makeLesson({
      court_count: 2,
      registration_deadline: '2026-09-28T18:00:00.000Z',
    });
    const input = toLessonInput(lessonToFormValues(lesson));
    expect(input).toMatchObject({
      start_time: lesson.start_time,
      end_time: lesson.end_time,
      court_count: 2,
      registration_deadline: '2026-09-28T18:00:00.000Z',
    });
  });
});
