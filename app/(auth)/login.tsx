import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AppText } from '@/components/AppText';
import { BrandMark } from '@/components/BrandMark';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors, spacing } from '@/constants/theme';
import { signIn } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { useT } from '@/i18n';
import { getErrorMessage, logError } from '@/utils/errors';

const loginSchema = z.object({
  email: z.email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { recoveryError, clearRecoveryError } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setSubmitError(null);
    clearRecoveryError();
    try {
      // On success the auth listener routes to the player or admin app.
      await signIn(email, password);
    } catch (error) {
      logError('signIn', error);
      setSubmitError(getErrorMessage(error));
    }
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.hero, { paddingTop: insets.top + spacing.xxl }]}>
            <BrandMark layout="stacked" size="lg" subtitle={t('brandTagline')} />
            <AppText tone="muted" style={styles.tagline}>
              {t('loginTagline')}
            </AppText>
          </View>

          <View style={styles.form}>
            <AppText variant="title">Welcome back</AppText>
            <AppText tone="muted">Sign in to see your upcoming lessons.</AppText>

            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <TextField
                  label="Email"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  error={formState.errors.email?.message}
                  testID="login-email"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <View>
                  <TextField
                    ref={passwordRef}
                    label="Password"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={onSubmit}
                    error={formState.errors.password?.message}
                    style={styles.passwordInput}
                    testID="login-password"
                  />
                  <Pressable
                    onPress={() => setShowPassword((value) => !value)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    style={styles.eye}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
              )}
            />

            {recoveryError ? <Banner tone="warning" message={recoveryError} /> : null}
            {submitError ? <Banner tone="danger" message={submitError} /> : null}

            <Button
              label="Sign in"
              onPress={onSubmit}
              loading={formState.isSubmitting}
              testID="login-submit"
            />

            <Link href="/forgot-password" asChild>
              <Pressable accessibilityRole="link" style={styles.link} hitSlop={8}>
                <AppText variant="label" tone="primary">
                  Forgot your password?
                </AppText>
              </Pressable>
            </Link>

            <Button
              label="Create an account"
              variant="secondary"
              onPress={() => router.push('/sign-up')}
            />

            <AppText variant="caption" tone="subtle" style={styles.footnote}>
              This is a private club app. Your coach approves every new account before you can see
              lessons.
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  tagline: { textAlign: 'center' },
  form: {
    padding: spacing.xl,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  passwordInput: { paddingRight: 52 },
  eye: { position: 'absolute', right: spacing.md, top: 36 },
  link: { alignSelf: 'center', paddingVertical: spacing.sm },
  footnote: { textAlign: 'center' },
});
