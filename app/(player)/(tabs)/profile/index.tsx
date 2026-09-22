import { router } from 'expo-router';

import { ProfileScreen } from '@/features/profile/ProfileScreen';

export default function PlayerProfileTab() {
  return (
    <ProfileScreen
      onEditProfile={() => router.push('/profile/edit')}
      onChangePassword={() => router.push('/profile/change-password')}
    />
  );
}
