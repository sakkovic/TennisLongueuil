import { TabStack } from '@/features/navigation/TabStack';

// A deep link to a lesson (e.g. a shared link) opens it above the home screen.
export const unstable_settings = { initialRouteName: 'index' };

export default function HomeStack() {
  return <TabStack screens={[{ name: 'lesson/[id]', title: 'lesson' }]} />;
}
