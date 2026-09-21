import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { ListRow } from '@/components/ListRow';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { colors, radius, spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/api';
import { useAuth, useCurrentMember } from '@/features/auth/AuthProvider';
import { findLevel, useLevels } from '@/features/levels/hooks';
import { useI18n } from '@/i18n';
import type { Locale } from '@/i18n/strings';
import { getErrorMessage, logError } from '@/utils/errors';

import { useUploadAvatar } from './hooks';
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
    <ScreenContainer edges={['top']} onRefresh={retryProfile} refreshing={isRetryingProfile}>
      <ScreenHeader title={t('profile')} />

      <PlayerProfileCard
        member={member}
        levelRank={findLevel(levels, member.player_level_id)?.rank}
        onChangePhoto={pickPhoto}
        uploadingPhoto={uploadAvatar.isPending}
      />
      {photoMessage ? <Banner tone={photoMessage.tone} message={photoMessage.text} /> : null}

      {member.role === 'player' ? (
        <AppText variant="caption" tone="subtle" style={styles.note}>
          {t('levelAssignedByCoach')}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        <View style={styles.language}>
          <AppText variant="bodyStrong">{t('language')}</AppText>
          <SegmentedControl
            options={[
              { value: 'en', label: t('languageEnglish') },
              { value: 'fr', label: t('languageFrench') },
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
      </View>

      <AppText variant="caption" tone="subtle" style={styles.note}>
        Tennis Longueuil · version {Constants.expoConfig?.version ?? '1.0.0'}
      </AppText>

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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 52 },
});
