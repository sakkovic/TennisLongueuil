import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { spacing } from '@/constants/theme';
import { useT } from '@/i18n';
import { useValidationMessage } from '@/i18n/validation';
import { getErrorMessage } from '@/utils/errors';

/** Mirrors the Supabase Auth password policy (length + lower/upper case + digit). */
export const newPasswordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Use at most 72 characters.')
  .regex(/[a-z]/, 'Add a lowercase letter.')
  .regex(/[A-Z]/, 'Add an uppercase letter.')
  .regex(/[0-9]/, 'Add a number.');

export function createPasswordFormSchema(askCurrentPassword: boolean) {
  return z
    .object({
      currentPassword: askCurrentPassword
        ? z.string().min(1, 'Enter your current password.')
        : z.string(),
      password: newPasswordSchema,
      confirm: z.string(),
    })
    .refine((values) => values.password === values.confirm, {
      path: ['confirm'],
      message: 'The passwords do not match.',
    });
}

type PasswordFormValues = z.infer<ReturnType<typeof createPasswordFormSchema>>;

interface NewPasswordFormProps {
  submitLabel: string;
  /** Changing a password while signed in requires the current one. */
  askCurrentPassword?: boolean;
  submitting: boolean;
  error: unknown;
  onSubmit: (values: { currentPassword: string; newPassword: string }) => void;
}

export function NewPasswordForm({
  submitLabel,
  askCurrentPassword = false,
  submitting,
  error,
  onSubmit,
}: NewPasswordFormProps) {
  const t = useT();
  const v = useValidationMessage();
  const schema = useMemo(() => createPasswordFormSchema(askCurrentPassword), [askCurrentPassword]);
  const { control, handleSubmit, formState } = useForm<PasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', password: '', confirm: '' },
  });

  const submit = handleSubmit(({ currentPassword, password }) =>
    onSubmit({ currentPassword, newPassword: password }),
  );

  return (
    <View style={styles.form}>
      {askCurrentPassword ? (
        <Controller
          control={control}
          name="currentPassword"
          render={({ field }) => (
            <TextField
              label={t('currentPassword')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              error={v(formState.errors.currentPassword?.message)}
            />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label={t('newPassword')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            error={v(formState.errors.password?.message)}
            hint={t('passwordHint')}
          />
        )}
      />
      <Controller
        control={control}
        name="confirm"
        render={({ field }) => (
          <TextField
            label={t('confirmNewPassword')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={submit}
            error={v(formState.errors.confirm?.message)}
          />
        )}
      />
      {error ? <Banner tone="danger" message={getErrorMessage(error)} /> : null}
      <Button label={submitLabel} onPress={submit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg } });
