import { router } from 'expo-router';

import { ProfileScreen } from '@/features/profile/ProfileScreen';

export default function AdminProfileTab() {
  return (
    <ProfileScreen
      onEditProfile={() => router.push('/admin/edit-profile')}
      onChangePassword={() => router.push('/admin/change-password')}
    />
  );
}
