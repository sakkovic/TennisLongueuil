import type { LessonInput, SeriesLesson } from '../api';
import { applyEditToSeries, laterInSeries } from '../lessonSeries';

// Tests run in America/Toronto (see jest.globalSetup.js). Weekly Monday 6:00 PM lessons
// across the November 1, 2026 daylight-saving change.
const occurrence = (id: string, start: Date): SeriesLesson => ({
  id,
  title: 'Tennis Lesson',
  description: null,
  start_time: start.toISOString(),
  end_time: new Date(start.getTime() + 120 * 60_000).toISOString(),
  location: 'Complexe Sportif Longueuil',
  court_count: 1,
  player_level_id: null,
  registration_open: true,
  registration_deadline: new Date(start.getTime() - 4 * 3_600_000).toISOString(),
  registered_count: 0,
});

const series = [
  occurrence('a', new Date(2026, 9, 26, 18, 0)),
  occurrence('b', new Date(2026, 10, 2, 18, 0)),
  occurrence('c', new Date(2026, 10, 9, 18, 0)),
];

function edit(start: Date, changes: Partial<LessonInput> = {}): LessonInput {
  return {
    ...series[0],
    start_time: start.toISOString(),
    end_time: new Date(start.getTime() + 90 * 60_000).toISOString(),
    registration_deadline: new Date(start.getTime() - 6 * 3_600_000).toISOString(),
    ...changes,
  };
}

describe('applyEditToSeries', () => {
  it('moves every following lesson to the new weekday and wall-clock time', () => {
    const edited = edit(new Date(2026, 9, 27, 19, 30), { court_count: 2, location: 'Court B' });
    const result = applyEditToSeries(series[0], edited, series);

    expect(result.map((lesson) => lesson.id)).toEqual(['a', 'b', 'c']);
    for (const lesson of result) {
      const start = new Date(lesson.start_time);
      expect(start.getDay()).toBe(2);
      expect([start.getHours(), start.getMinutes()]).toEqual([19, 30]);
      expect(new Date(lesson.end_time).getTime() - start.getTime()).toBe(90 * 60_000);
      expect(start.getTime() - new Date(lesson.registration_deadline ?? '').getTime()).toBe(
        6 * 3_600_000,
      );
      expect(lesson).toMatchObject({ court_count: 2, location: 'Court B' });
    }
    expect(new Date(result[1].start_time).getDate()).toBe(3);
  });

  it('keeps the edited lesson exactly as the coach entered it', () => {
    const edited = edit(new Date(2026, 9, 26, 17, 0));
    expect(applyEditToSeries(series[0], edited, series)[0]).toEqual({ ...edited, id: 'a' });
  });

  it('counts the lessons after the edited one', () => {
    expect(laterInSeries('a', series)).toBe(2);
    expect(laterInSeries('c', series.slice(2))).toBe(0);
  });
});
