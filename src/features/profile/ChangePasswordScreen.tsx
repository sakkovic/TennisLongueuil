import { router } from 'expo-router';
import { Alert } from 'react-native';

import { AppText } from '@/components/AppText';
import { ScreenContainer } from '@/components/ScreenContainer';
import { NewPasswordForm } from '@/features/auth/NewPasswordForm';
import { logError } from '@/utils/errors';

import { useChangePassword } from './hooks';

export function ChangePasswordScreen() {
  const changePassword = useChangePassword();

  return (
    <ScreenContainer keyboard>
      <AppText tone="muted">Enter your current password, then choose a new one.</AppText>
      <NewPasswordForm
        askCurrentPassword
        submitLabel="Update password"
        submitting={changePassword.isPending}
        error={changePassword.error}
        onSubmit={(values) =>
          changePassword.mutate(values, {
            onSuccess: () => {
              Alert.alert('Password updated', 'Use your new password next time you sign in.');
              router.back();
            },
            onError: (error) => logError('changePassword', error),
          })
        }
      />
    </ScreenContainer>
  );
}
