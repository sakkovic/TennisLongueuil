import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/constants/navigation';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function AdminLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="lesson/new" options={{ title: 'New lesson', presentation: 'modal' }} />
      <Stack.Screen name="lesson/[id]" options={{ title: 'Lesson' }} />
      <Stack.Screen
        name="lesson/edit/[id]"
        options={{ title: 'Edit lesson', presentation: 'modal' }}
      />
      <Stack.Screen name="member/[id]" options={{ title: 'Member' }} />
      <Stack.Screen name="edit-profile" options={{ title: 'Edit profile' }} />
      <Stack.Screen name="change-password" options={{ title: 'Change password' }} />
    </Stack>
  );
}
