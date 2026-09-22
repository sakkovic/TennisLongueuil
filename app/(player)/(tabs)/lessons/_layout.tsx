import { TabStack } from '@/features/navigation/TabStack';

export const unstable_settings = { initialRouteName: 'index' };

export default function LessonsStack() {
  return <TabStack title="tabLessons" screens={[{ name: '[id]', title: 'lesson' }]} />;
}
