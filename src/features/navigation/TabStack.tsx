import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/constants/navigation';
import { useT } from '@/i18n';
import type { TranslationKey } from '@/i18n/strings';

interface TabStackProps {
  /** Ink header title on the tab’s first screen. Omit to hide the bar (Home). */
  title?: TranslationKey;
  /** Pages opened from the tab, with their header title. */
  screens: readonly { name: string; title: TranslationKey }[];
}

/**
 * The stack inside a player tab. Pages opened from a tab (a lesson, editing
 * the profile…) are pushed here instead of above the tabs, so the tab bar
 * stays visible and tapping the tab again returns to its first screen.
 */
export function TabStack({ title, screens }: TabStackProps) {
  const t = useT();
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="index"
        options={title ? { title: t(title), headerBackVisible: false } : { headerShown: false }}
      />
      {screens.map((screen) => (
        <Stack.Screen key={screen.name} name={screen.name} options={{ title: t(screen.title) }} />
      ))}
    </Stack>
  );
}
