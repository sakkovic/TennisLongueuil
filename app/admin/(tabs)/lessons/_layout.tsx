import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/constants/navigation';
import { useT } from '@/i18n';

// History opens inside the Lessons tab, so the tab bar stays visible and
// "back" returns to the list.
export const unstable_settings = { initialRouteName: 'index' };

export default function AdminLessonsLayout() {
  const t = useT();
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: t('tabLessons'), headerBackVisible: false }} />
      <Stack.Screen name="history" options={{ title: t('lessonHistory') }} />
    </Stack>
  );
}
