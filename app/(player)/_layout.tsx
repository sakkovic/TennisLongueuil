import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/constants/navigation';

export const unstable_settings = { initialRouteName: '(tabs)' };

/**
 * Every player page lives inside a tab (each tab folder has its own stack),
 * so the tab bar is always visible.
 */
export default function PlayerLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
