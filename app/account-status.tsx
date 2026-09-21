import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { logError } from '@/utils/errors';

/** Shown while the profile loads, or when the account cannot use the app. */
export default function AccountStatusScreen() {
  const { status, profileError, retryProfile, isRetryingProfile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      logError('signOut', error);
      setSigningOut(false);
    }
  };

  const signOutButton = (
    <Button label="Sign out" variant="secondary" onPress={handleSignOut} loading={signingOut} />
  );

  return (
    <ScreenContainer scroll={false} edges={['top', 'bottom']} contentStyle={styles.center}>
      {status === 'profileError' ? (
        <>
          <ErrorState error={profileError} onRetry={retryProfile} retrying={isRetryingProfile} />
          <View style={styles.actions}>{signOutButton}</View>
        </>
      ) : status === 'inactive' ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Your account is inactive"
          message="Please contact your coach to reactivate your account."
          action={signOutButton}
        />
      ) : status === 'profileMissing' ? (
        <EmptyState
          icon="person-outline"
          title="Profile not found"
          message="Your member profile has not been set up. Please contact your coach."
          action={signOutButton}
        />
      ) : (
        <LoadingState label="Loading your profile…" />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  actions: { paddingHorizontal: spacing.xl },
});
