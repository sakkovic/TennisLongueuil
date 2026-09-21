import { useState } from 'react';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { NewPasswordForm } from '@/features/auth/NewPasswordForm';
import { logError } from '@/utils/errors';

/** Reached after verifying an emailed reset code. */
export default function ResetPasswordScreen() {
  const { finishPasswordRecovery } = useAuth();
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
        overline="Password reset"
        title="Choose a new password"
        subtitle="Your code was verified. Pick a new password to finish."
      />
      <NewPasswordForm submitLabel="Save new password" onSuccess={finishPasswordRecovery} />
      <Button label="Cancel" variant="ghost" onPress={cancel} loading={cancelling} />
    </ScreenContainer>
  );
}
