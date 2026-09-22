import { router } from 'expo-router';
import { Alert } from 'react-native';

import { AppText } from '@/components/AppText';
import { ScreenContainer } from '@/components/ScreenContainer';
import { NewPasswordForm } from '@/features/auth/NewPasswordForm';
import { useT } from '@/i18n';
import { logError } from '@/utils/errors';

import { useChangePassword } from './hooks';

export function ChangePasswordScreen() {
  const t = useT();
  const changePassword = useChangePassword();

  return (
    <ScreenContainer keyboard>
      <AppText tone="muted">{t('changePasswordHint')}</AppText>
      <NewPasswordForm
        askCurrentPassword
        submitLabel={t('updatePassword')}
        submitting={changePassword.isPending}
        error={changePassword.error}
        onSubmit={(values) =>
          changePassword.mutate(values, {
            onSuccess: () => {
              Alert.alert(t('passwordUpdated'), t('passwordUpdatedMessage'));
              router.back();
            },
            onError: (error) => logError('changePassword', error),
          })
        }
      />
    </ScreenContainer>
  );
}
