import { TabStack } from '@/features/navigation/TabStack';

export const unstable_settings = { initialRouteName: 'index' };

export default function MyLessonsStack() {
  return <TabStack title="tabMyLessons" screens={[{ name: '[id]', title: 'lesson' }]} />;
}
