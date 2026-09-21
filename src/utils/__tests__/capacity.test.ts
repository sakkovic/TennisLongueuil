import {
  capacityForCourts,
  formatCapacity,
  formatPlayerCount,
  formatSpotsRemaining,
  isLessonFull,
  spotsRemaining,
} from '../capacity';

describe('capacity', () => {
  it('allows 4 players per court', () => {
    expect(capacityForCourts(1)).toBe(4);
    expect(capacityForCourts(2)).toBe(8);
    expect(capacityForCourts(3)).toBe(12);
  });

  it('computes remaining spots without going negative', () => {
    expect(spotsRemaining(3, 4)).toBe(1);
    expect(spotsRemaining(4, 4)).toBe(0);
    expect(spotsRemaining(5, 4)).toBe(0);
  });

  it('uses correct singular and plural forms', () => {
    expect(formatSpotsRemaining(3, 4)).toBe('1 spot remaining');
    expect(formatSpotsRemaining(2, 4)).toBe('2 spots remaining');
    expect(formatSpotsRemaining(0, 8)).toBe('8 spots remaining');
    expect(formatSpotsRemaining(4, 4)).toBe('Full');
    expect(formatPlayerCount(1)).toBe('1 player');
    expect(formatPlayerCount(4)).toBe('4 players');
  });

  it('formats and detects full lessons', () => {
    expect(formatCapacity(3, 4)).toBe('3 / 4');
    expect(isLessonFull(3, 4)).toBe(false);
    expect(isLessonFull(4, 4)).toBe(true);
  });
});
