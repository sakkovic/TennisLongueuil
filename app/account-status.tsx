import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { useT } from '@/i18n';
import { logError } from '@/utils/errors';
import { firstName } from '@/utils/names';

/** Shown while the profile loads, or when the account cannot use the app. */
export default function AccountStatusScreen() {
  const t = useT();
  const { status, profile, profileError, retryProfile, isRetryingProfile } = useAuth();
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
    <Button label={t('signOut')} variant="secondary" onPress={handleSignOut} loading={signingOut} />
  );

  const greeting = profile
    ? t('thanksSignup', { name: firstName(profile.full_name) })
    : t('thanksSignupAnon');

  return (
    <ScreenContainer scroll={false} edges={['top', 'bottom']} contentStyle={styles.center}>
      {status === 'profileError' ? (
        <>
          <ErrorState error={profileError} onRetry={retryProfile} retrying={isRetryingProfile} />
          <View style={styles.actions}>{signOutButton}</View>
        </>
      ) : status === 'pendingApproval' ? (
        <EmptyState
          icon="hourglass-outline"
          title={t('waitingApproval')}
          message={`${greeting} ${t('pendingMessage')}`}
          action={
            <View style={styles.actions}>
              <Button
                label={t('checkAgain')}
                icon="refresh"
                onPress={retryProfile}
                loading={isRetryingProfile}
              />
              {signOutButton}
            </View>
          }
        />
      ) : status === 'inactive' ? (
        <EmptyState
          icon="lock-closed-outline"
          title={t('accountInactive')}
          message={t('accountInactiveMessage')}
          action={signOutButton}
        />
      ) : status === 'profileMissing' ? (
        <EmptyState
          icon="person-outline"
          title={t('profileNotFound')}
          message={t('profileNotFoundMessage')}
          action={signOutButton}
        />
      ) : (
        <LoadingState label={t('loadingProfile')} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  actions: { paddingHorizontal: spacing.xl, gap: spacing.md, alignSelf: 'stretch' },
});
