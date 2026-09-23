import { router } from 'expo-router';

import { ProfileScreen } from '@/features/profile/ProfileScreen';

export default function AdminProfileTab() {
  return (
    <ProfileScreen
      onEditProfile={() => router.push('/admin/profile/edit')}
      onChangePassword={() => router.push('/admin/profile/change-password')}
    />
  );
}
