import { getDateLocale } from './date';

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

/**
 * "Mohamed", "Mohamed and Alice", "Mohamed, Alice and Zdenek",
 * "Mohamed, Alice and 3 others" — "et" / "autres" when the app is in French.
 */
export function formatNameList(names: string[], maxShown = 3): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  const fr = getDateLocale() === 'fr';
  const and = fr ? 'et' : 'and';
  if (names.length <= maxShown) {
    return `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;
  }
  const shown = names.slice(0, maxShown - 1);
  const others = names.length - shown.length;
  const otherWord = fr ? (others === 1 ? 'autre' : 'autres') : others === 1 ? 'other' : 'others';
  return `${shown.join(', ')} ${and} ${others} ${otherWord}`;
}
