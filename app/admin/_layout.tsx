import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/constants/navigation';
import { useT } from '@/i18n';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function AdminLayout() {
  const t = useT();
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="lesson/new" options={{ title: t('newLesson'), presentation: 'modal' }} />
      <Stack.Screen name="lesson/[id]" options={{ title: t('lesson') }} />
      <Stack.Screen
        name="lesson/edit/[id]"
        options={{ title: t('editLesson'), presentation: 'modal' }}
      />
      <Stack.Screen name="member/[id]" options={{ title: t('member') }} />
      <Stack.Screen name="edit-profile" options={{ title: t('editProfile') }} />
      <Stack.Screen name="change-password" options={{ title: t('changePassword') }} />
    </Stack>
  );
}
