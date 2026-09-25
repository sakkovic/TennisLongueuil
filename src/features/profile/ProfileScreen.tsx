import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { ListRow } from '@/components/ListRow';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedControl } from '@/components/SegmentedControl';
import { APP_NAME } from '@/constants/brand';
import { colors, radius, spacing, stroke } from '@/constants/theme';
import { signOut } from '@/features/auth/api';
import { useAuth, useCurrentMember } from '@/features/auth/AuthProvider';
import { findLevel, useLevels } from '@/features/levels/hooks';
import { useI18n } from '@/i18n';
import type { Locale } from '@/i18n/strings';
import { getErrorMessage, logError } from '@/utils/errors';

import { useDeleteAccount, useUploadAvatar } from './hooks';
import { PlayerProfileCard } from './PlayerProfileCard';

interface ProfileScreenProps {
  onEditProfile: () => void;
  onChangePassword: () => void;
}

/** Profile tab for players and the coach. */
export function ProfileScreen({ onEditProfile, onChangePassword }: ProfileScreenProps) {
  const { t, locale, setLocale } = useI18n();
  const member = useCurrentMember();
  const { retryProfile, isRetryingProfile } = useAuth();
  const { data: levels } = useLevels();
  const uploadAvatar = useUploadAvatar();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteAccount = useDeleteAccount();
  const [signingOut, setSigningOut] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<{
    tone: 'success' | 'danger';
    text: string;
  } | null>(null);

  const pickPhoto = async () => {
    setPhotoMessage(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    uploadAvatar.mutate(result.assets[0].uri, {
      onSuccess: () => setPhotoMessage({ tone: 'success', text: t('photoUpdated') }),
      onError: (error) => {
        logError('uploadAvatar', error);
        setPhotoMessage({ tone: 'danger', text: getErrorMessage(error) });
      },
    });
  };

  const handleDeleteAccount = () => {
    deleteAccount.mutate(undefined, {
      // The account is gone: clearing the session sends them to the welcome screen.
      onSuccess: () => void signOut().catch((error) => logError('signOut', error)),
      onError: (error) => logError('deleteAccount', error),
    });
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      logError('signOut', error);
      setSigningOut(false);
      setConfirmSignOut(false);
    }
  };

  return (
    <ScreenContainer onRefresh={retryProfile} refreshing={isRetryingProfile}>
      <PlayerProfileCard
        member={member}
        levelNote={member.role === 'player' ? t('levelAssignedByCoach') : undefined}
        levelRank={findLevel(levels, member.player_level_id)?.rank}
        onChangePhoto={pickPhoto}
        uploadingPhoto={uploadAvatar.isPending}
      />
      {photoMessage ? <Banner tone={photoMessage.tone} message={photoMessage.text} /> : null}

      <View style={styles.actions}>
        <View style={styles.language}>
          <AppText variant="bodyStrong">{t('language')}</AppText>
          <SegmentedControl
            options={[
              { value: 'fr', label: t('languageFrench') },
              { value: 'en', label: t('languageEnglish') },
            ]}
            value={locale}
            onChange={(next) => setLocale(next as Locale)}
          />
        </View>
        <View style={styles.divider} />
        <ListRow
          icon="create-outline"
          label={t('editProfile')}
          description={t('editProfileHint')}
          onPress={onEditProfile}
        />
        <View style={styles.divider} />
        <ListRow icon="key-outline" label={t('changePassword')} onPress={onChangePassword} />
        <View style={styles.divider} />
        <ListRow
          icon="log-out-outline"
          label={t('signOut')}
          tone="danger"
          onPress={() => setConfirmSignOut(true)}
          trailing={<View />}
        />
        {/* Both stores require account deletion from inside the app. The coach
            keeps the club's lessons, so their account is removed by support. */}
        {member.role === 'player' ? (
          <>
            <View style={styles.divider} />
            <ListRow
              icon="trash-outline"
              label={t('deleteAccount')}
              tone="danger"
              onPress={() => {
                deleteAccount.reset();
                setConfirmDelete(true);
              }}
              trailing={<View />}
            />
          </>
        ) : null}
      </View>

      <AppText variant="caption" tone="subtle" style={styles.note}>
        {APP_NAME} · version {Constants.expoConfig?.version ?? '1.0.0'}
      </AppText>

      <ConfirmationModal
        visible={confirmDelete}
        title={t('deleteAccountTitle')}
        message={t('deleteAccountMessage')}
        confirmLabel={t('deleteAccount')}
        cancelLabel={t('keepAccount')}
        destructive
        loading={deleteAccount.isPending}
        error={deleteAccount.isError ? getErrorMessage(deleteAccount.error) : null}
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmationModal
        visible={confirmSignOut}
        title={t('signOutTitle')}
        message={t('signOutMessage')}
        confirmLabel={t('signOut')}
        cancelLabel={t('staySignedIn')}
        destructive
        loading={signingOut}
        onConfirm={handleSignOut}
        onCancel={() => setConfirmSignOut(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  note: { textAlign: 'center' },
  language: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  actions: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: stroke,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  divider: { height: stroke, backgroundColor: colors.border, marginLeft: 52 },
});
