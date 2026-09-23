import { TabStack } from '@/features/navigation/TabStack';

export const unstable_settings = { initialRouteName: 'index' };

export default function AdminLessonsStack() {
  return (
    <TabStack
      title="tabLessons"
      screens={[
        { name: 'new', title: 'newLesson' },
        { name: '[id]', title: 'lesson' },
        { name: 'edit/[id]', title: 'editLesson' },
        { name: 'history', title: 'lessonHistory' },
      ]}
    />
  );
}
