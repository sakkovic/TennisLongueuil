import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TextInput } from 'react-native';
import { z } from 'zod';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { signUp } from '@/features/auth/api';
import { newPasswordSchema } from '@/features/auth/NewPasswordForm';
import { useT } from '@/i18n';
import { useValidationMessage } from '@/i18n/validation';
import { getErrorMessage, logError } from '@/utils/errors';

const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Please enter your full name.')
      .max(80, 'Use at most 80 characters.'),
    email: z.email('Please enter a valid email address.'),
    password: newPasswordSchema,
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'The passwords do not match.',
  });

type SignUpValues = z.infer<typeof signUpSchema>;

/**
 * Creates a pending account. The database makes every new account inactive, so
 * the member lands on "Waiting for approval" until the coach approves them.
 */
export default function SignUpScreen() {
  const t = useT();
  const v = useValidationMessage();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ fullName, email, password }) => {
    setSubmitError(null);
    try {
      const { needsEmailConfirmation } = await signUp(email, password, fullName);
      // Otherwise the auth listener routes to the "waiting for approval" screen.
      if (needsEmailConfirmation) setConfirmationEmail(email.trim());
    } catch (error) {
      logError('signUp', error);
      setSubmitError(getErrorMessage(error));
    }
  });

  if (confirmationEmail) {
    return (
      <ScreenContainer keyboard edges={['bottom']}>
        <AppText variant="title">{t('confirmYourEmail')}</AppText>
        <Banner tone="info" message={t('confirmationSent', { email: confirmationEmail })} />
        <AppText tone="muted">{t('confirmationHint')}</AppText>
        <Button label={t('backToSignIn')} onPress={() => router.replace('/login')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer keyboard edges={['bottom']}>
      <AppText variant="title">{t('joinTheClub')}</AppText>
      <AppText tone="muted">{t('joinTheClubHint')}</AppText>

      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <TextField
            label={t('fullName')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            error={v(formState.errors.fullName?.message)}
            testID="signup-name"
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            ref={emailRef}
            label={t('email')}
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
            error={v(formState.errors.email?.message)}
            testID="signup-email"
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            ref={passwordRef}
            label={t('password')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            error={v(formState.errors.password?.message)}
            hint={t('passwordHint')}
            testID="signup-password"
          />
        )}
      />

      <Controller
        control={control}
        name="confirm"
        render={({ field }) => (
          <TextField
            ref={confirmRef}
            label={t('confirmPassword')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            error={v(formState.errors.confirm?.message)}
            testID="signup-confirm"
          />
        )}
      />

      {submitError ? <Banner tone="danger" message={submitError} /> : null}

      <Button
        label={t('createAccount')}
        onPress={onSubmit}
        loading={formState.isSubmitting}
        testID="signup-submit"
      />
    </ScreenContainer>
  );
}
