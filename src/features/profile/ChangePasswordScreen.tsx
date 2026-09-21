import { router } from 'expo-router';
import { Alert } from 'react-native';

import { AppText } from '@/components/AppText';
import { ScreenContainer } from '@/components/ScreenContainer';
import { NewPasswordForm } from '@/features/auth/NewPasswordForm';

export function ChangePasswordScreen() {
  return (
    <ScreenContainer keyboard>
      <AppText tone="muted">Choose a new password for your account.</AppText>
      <NewPasswordForm
        submitLabel="Update password"
        onSuccess={() => {
          Alert.alert('Password updated', 'Use your new password next time you sign in.');
          router.back();
        }}
      />
    </ScreenContainer>
  );
}
