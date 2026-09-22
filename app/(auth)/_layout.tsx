import { Stack } from 'expo-router';

import { colors, fonts } from '@/constants/theme';
import { useT } from '@/i18n';

// The welcome flyer is always underneath, so "back" from sign-in returns to it.
export const unstable_settings = { initialRouteName: 'welcome' };

const subScreen = {
  headerShown: true,
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.text, fontFamily: fonts.displaySemiBold },
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.background },
  headerBackButtonDisplayMode: 'minimal',
} as const;

export default function AuthLayout() {
  const t = useT();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" options={{ ...subScreen, title: '' }} />
      <Stack.Screen name="sign-up" options={{ ...subScreen, title: t('createAccount') }} />
      <Stack.Screen name="forgot-password" options={{ ...subScreen, title: t('resetPassword') }} />
    </Stack>
  );
}
