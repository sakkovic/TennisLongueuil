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
import { colors, radius } from '@/constants/theme';
import { signOut } from '@/features/auth/api';
import { useAuth, useCurrentMember } from '@/features/auth/AuthProvider';
import { findLevel, useLevels } from '@/features/levels/hooks';
import { getErrorMessage, logError } from '@/utils/errors';

import { useUploadAvatar } from './hooks';
import { PlayerProfileCard } from './PlayerProfileCard';

interface ProfileScreenProps {
  onEditProfile: () => void;
  onChangePassword: () => void;
}

/** Profile tab for players and the coach. */
export function ProfileScreen({ onEditProfile, onChangePassword }: ProfileScreenProps) {
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
      onSuccess: () => setPhotoMessage({ tone: 'success', text: 'Profile photo updated.' }),
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
      <ScreenHeader title="Profile" />

      <PlayerProfileCard
        member={member}
        levelRank={findLevel(levels, member.player_level_id)?.rank}
        onChangePhoto={pickPhoto}
        uploadingPhoto={uploadAvatar.isPending}
      />
      {photoMessage ? <Banner tone={photoMessage.tone} message={photoMessage.text} /> : null}

      {member.role === 'player' ? (
        <AppText variant="caption" tone="subtle" style={styles.note}>
          Your level is assigned by your coach.
        </AppText>
      ) : null}

      <View style={styles.actions}>
        <ListRow
          icon="create-outline"
          label="Edit profile"
          description="Name and phone"
          onPress={onEditProfile}
        />
        <View style={styles.divider} />
        <ListRow icon="key-outline" label="Change password" onPress={onChangePassword} />
        <View style={styles.divider} />
        <ListRow
          icon="log-out-outline"
          label="Sign out"
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
        title="Sign out?"
        message="You'll need your email and password to sign in again."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
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
  actions: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 52 },
});
