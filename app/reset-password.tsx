import { useState } from 'react';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { NewPasswordForm } from '@/features/auth/NewPasswordForm';
import { useUpdatePassword } from '@/features/profile/hooks';
import { useT } from '@/i18n';
import { logError } from '@/utils/errors';

/** Reached from a password-reset email (link or code). */
export default function ResetPasswordScreen() {
  const t = useT();
  const { finishPasswordRecovery } = useAuth();
  const updatePassword = useUpdatePassword();
  const [cancelling, setCancelling] = useState(false);

  const cancel = async () => {
    setCancelling(true);
    try {
      await signOut();
    } catch (error) {
      logError('signOut', error);
      setCancelling(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']} keyboard>
      <ScreenHeader
        overline={t('passwordReset')}
        title={t('chooseNewPassword')}
        subtitle={t('resetVerified')}
      />
      <NewPasswordForm
        submitLabel={t('saveNewPassword')}
        submitting={updatePassword.isPending}
        error={updatePassword.error}
        onSubmit={({ newPassword }) =>
          updatePassword.mutate(newPassword, {
            onSuccess: finishPasswordRecovery,
            onError: (error) => logError('updatePassword', error),
          })
        }
      />
      <Button label={t('cancel')} variant="ghost" onPress={cancel} loading={cancelling} />
    </ScreenContainer>
  );
}
