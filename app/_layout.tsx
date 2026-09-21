import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { config } from '@/constants/config';
import { colors, spacing } from '@/constants/theme';
import { AuthProvider, useAuth, type AppStatus } from '@/features/auth/AuthProvider';
import { configureNotificationHandler } from '@/features/notifications/reminders';
import { I18nProvider } from '@/i18n';
import { queryClient } from '@/lib/queryClient';

void configureNotificationHandler();

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  if (!config.isSupabaseConfigured) return <MissingConfiguration />;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const GATE_STATUSES: AppStatus[] = [
  'restoring',
  'loadingProfile',
  'profileError',
  'profileMissing',
  'pendingApproval',
  'inactive',
];

/**
 * Exactly one route group is reachable for each auth status, so a player can
 * never navigate to admin screens (and vice versa) by changing the URL.
 * This is a UX guard only: the database enforces every permission with RLS.
 */
function RootNavigator() {
  const { status } = useAuth();
  const ready = status !== 'restoring' && status !== 'loadingProfile';
  // Mount the navigator only once the first auth + profile check is done, so
  // the initial URL (e.g. a deep link to a lesson) resolves against the right
  // route group instead of being redirected while the session is restored.
  const [booted, setBooted] = useState(false);
  if (ready && !booted) setBooted(true);

  useEffect(() => {
    if (booted) void SplashScreen.hideAsync();
  }, [booted]);

  if (!booted && !ready) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'passwordRecovery'}>
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
      <Stack.Protected guard={GATE_STATUSES.includes(status)}>
        <Stack.Screen name="account-status" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'player'}>
        <Stack.Screen name="(player)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'admin'}>
        <Stack.Screen name="admin" />
      </Stack.Protected>
    </Stack>
  );
}

function MissingConfiguration() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <View style={styles.missing}>
      <AppText variant="title">App not configured</AppText>
      <AppText tone="muted">
        Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in a .env file (see
        .env.example), then restart Expo with `npx expo start --clear`.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
});
