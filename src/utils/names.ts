export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

/**
 * "Mohamed", "Mohamed and Alice", "Mohamed, Alice and Zdenek",
 * "Mohamed, Alice and 3 others".
 */
export function formatNameList(names: string[], maxShown = 3): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length <= maxShown) {
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }
  const shown = names.slice(0, maxShown - 1);
  const others = names.length - shown.length;
  return `${shown.join(', ')} and ${others} ${others === 1 ? 'other' : 'others'}`;
}
