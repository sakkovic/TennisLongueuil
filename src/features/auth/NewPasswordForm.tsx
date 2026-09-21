import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { View, StyleSheet } from 'react-native';
import { z } from 'zod';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { spacing } from '@/constants/theme';
import { useUpdatePassword } from '@/features/profile/hooks';
import { getErrorMessage, logError } from '@/utils/errors';

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters.').max(72, 'Use at most 72 characters.'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'The passwords do not match.',
  });

type NewPasswordValues = z.infer<typeof newPasswordSchema>;

interface NewPasswordFormProps {
  submitLabel: string;
  onSuccess: () => void;
}

export function NewPasswordForm({ submitLabel, onSuccess }: NewPasswordFormProps) {
  const updatePassword = useUpdatePassword();
  const { control, handleSubmit, formState } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    try {
      await updatePassword.mutateAsync(password);
      onSuccess();
    } catch (error) {
      logError('updatePassword', error);
    }
  });

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="New password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            error={formState.errors.password?.message}
            hint="At least 8 characters."
          />
        )}
      />
      <Controller
        control={control}
        name="confirm"
        render={({ field }) => (
          <TextField
            label="Confirm new password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            error={formState.errors.confirm?.message}
          />
        )}
      />
      {updatePassword.isError ? (
        <Banner tone="danger" message={getErrorMessage(updatePassword.error)} />
      ) : null}
      <Button label={submitLabel} onPress={onSubmit} loading={updatePassword.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg } });
