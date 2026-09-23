import { TabStack } from '@/features/navigation/TabStack';

export const unstable_settings = { initialRouteName: 'index' };

export default function AdminMembersStack() {
  return <TabStack title="tabMembers" screens={[{ name: '[id]', title: 'member' }]} />;
}
