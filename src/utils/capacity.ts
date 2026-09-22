import { PLAYERS_PER_COURT } from '@/constants/lessons';

import { getDateLocale } from './date';

/** Capacity for a number of courts (display only; the database enforces it). */
export function capacityForCourts(courts: number): number {
  return Math.max(0, Math.floor(courts)) * PLAYERS_PER_COURT;
}

export function spotsRemaining(registered: number, capacity: number): number {
  return Math.max(0, capacity - registered);
}

export function isLessonFull(registered: number, capacity: number): boolean {
  return registered >= capacity;
}

/** "1 spot remaining" / "3 spots remaining" / "Full" (or French) */
export function formatSpotsRemaining(registered: number, capacity: number): string {
  const spots = spotsRemaining(registered, capacity);
  if (getDateLocale() === 'fr') {
    if (spots === 0) return 'Complet';
    return spots === 1 ? '1 place restante' : `${spots} places restantes`;
  }
  if (spots === 0) return 'Full';
  return `${spots} ${spots === 1 ? 'spot' : 'spots'} remaining`;
}

/** "1 player" / "4 players" (or French) */
export function formatPlayerCount(count: number): string {
  if (getDateLocale() === 'fr') return `${count} ${count === 1 ? 'joueur' : 'joueurs'}`;
  return `${count} ${count === 1 ? 'player' : 'players'}`;
}

/** "3 / 4" */
export function formatCapacity(registered: number, capacity: number): string {
  return `${registered} / ${capacity}`;
}
