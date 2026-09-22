import { formatShortDate, getDateLocale } from '@/utils/date';
import { formatNameList } from '@/utils/names';

import type { LessonInput } from './api';

export interface ExistingLessonSlot {
  start_time: string;
  end_time: string;
  location: string;
  status: string;
}

function sameLocation(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA;
}

/** True when two scheduled lessons share a location and overlap in time. */
export function slotsOverlap(
  proposed: Pick<LessonInput, 'start_time' | 'end_time' | 'location'>,
  existing: ExistingLessonSlot,
): boolean {
  if (existing.status !== 'scheduled') return false;
  if (!sameLocation(proposed.location, existing.location)) return false;
  return rangesOverlap(
    proposed.start_time,
    proposed.end_time,
    existing.start_time,
    existing.end_time,
  );
}

/**
 * Proposed rows that collide with a lesson already on the calendar.
 * Cancelled and completed lessons are ignored.
 */
export function findConflictingInputs(
  proposed: LessonInput[],
  existing: ExistingLessonSlot[],
): LessonInput[] {
  return proposed.filter((input) => existing.some((lesson) => slotsOverlap(input, lesson)));
}

export function conflictMessage(conflicts: LessonInput[], total: number): string {
  const dates = formatNameList(conflicts.map((row) => formatShortDate(row.start_time)));
  const one = conflicts.length === 1;
  if (getDateLocale() === 'fr') {
    const booked = one
      ? `${dates} a déjà une leçon à cette heure et à cet endroit.`
      : `${dates} ont déjà une leçon à cette heure et à cet endroit.`;
    if (conflicts.length === total) return booked;
    return `${booked} ${one ? 'Cette semaine sera ignorée' : 'Ces semaines seront ignorées'}.`;
  }
  if (conflicts.length === total) {
    return `${dates} already ${one ? 'has' : 'have'} a lesson at this time and place.`;
  }
  return `${dates} already ${one ? 'has' : 'have'} a lesson at this time and place. ${one ? 'That week will be skipped' : 'Those weeks will be skipped'}.`;
}
