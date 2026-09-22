import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/constants/navigation';
import { useT } from '@/i18n';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function PlayerLayout() {
  const t = useT();
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="lesson/[id]" options={{ title: t('lesson') }} />
      <Stack.Screen name="edit-profile" options={{ title: t('editProfile') }} />
      <Stack.Screen name="change-password" options={{ title: t('changePassword') }} />
    </Stack>
  );
}
