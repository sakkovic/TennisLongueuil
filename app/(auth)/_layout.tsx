import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

const subScreen = {
  headerShown: true,
  headerTintColor: colors.primary,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.background },
} as const;

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="sign-up" options={{ ...subScreen, title: 'Create account' }} />
      <Stack.Screen name="forgot-password" options={{ ...subScreen, title: 'Reset password' }} />
    </Stack>
  );
}
