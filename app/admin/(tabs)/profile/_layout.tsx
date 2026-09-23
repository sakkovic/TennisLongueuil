import { TabStack } from '@/features/navigation/TabStack';

export const unstable_settings = { initialRouteName: 'index' };

export default function AdminProfileStack() {
  return (
    <TabStack
      title="profile"
      screens={[
        { name: 'edit', title: 'editProfile' },
        { name: 'change-password', title: 'changePassword' },
      ]}
    />
  );
}
