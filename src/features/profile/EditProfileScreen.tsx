import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { spacing } from '@/constants/theme';
import { useCurrentMember } from '@/features/auth/AuthProvider';
import { useT } from '@/i18n';
import { useValidationMessage } from '@/i18n/validation';
import { getErrorMessage, logError } from '@/utils/errors';

import { useUpdateProfile } from './hooks';

export const profileFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Please enter your name.')
    .max(80, 'Keep your name under 80 characters.'),
  phone: z
    .string()
    .trim()
    .refine((value) => value === '' || /^[0-9+() .-]{7,30}$/.test(value), {
      message: 'Please enter a valid phone number.',
    }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

/** Members can edit their name and phone. Email, role and level are not editable here. */
export function EditProfileScreen() {
  const t = useT();
  const v = useValidationMessage();
  const member = useCurrentMember();
  const updateProfile = useUpdateProfile();
  const { control, handleSubmit, formState } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { fullName: member.full_name, phone: member.phone ?? '' },
  });

  const onSubmit = handleSubmit(async ({ fullName, phone }) => {
    try {
      await updateProfile.mutateAsync({ full_name: fullName.trim(), phone: phone.trim() || null });
      router.back();
    } catch (error) {
      logError('updateProfile', error);
    }
  });

  return (
    <ScreenContainer
      keyboard
      footer={
        <Button label={t('saveChanges')} onPress={onSubmit} loading={updateProfile.isPending} />
      }
    >
      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <TextField
            label={t('fullName')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoComplete="name"
            textContentType="name"
            error={v(formState.errors.fullName?.message)}
          />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <TextField
            label={t('phoneOptional')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="+1 514 555 0100"
            error={v(formState.errors.phone?.message)}
            hint={t('phoneHint')}
          />
        )}
      />

      <Card>
        <View style={styles.readOnly}>
          <AppText variant="caption" tone="muted">
            {t('email')}
          </AppText>
          <AppText variant="bodyStrong">{member.email}</AppText>
        </View>
        <AppText variant="caption" tone="subtle">
          {t('emailChangeNote')}
          {member.role === 'player' ? t('levelAlsoCoach') : ''}
        </AppText>
      </Card>

      {updateProfile.isError ? (
        <Banner tone="danger" message={getErrorMessage(updateProfile.error)} />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  readOnly: { gap: spacing.xxs },
});
