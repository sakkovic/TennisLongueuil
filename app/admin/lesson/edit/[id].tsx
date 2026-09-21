import { router, useLocalSearchParams } from 'expo-router';

import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useLesson, useSaveLesson } from '@/features/lessons/hooks';
import { LessonForm } from '@/features/lessons/LessonForm';
import { lessonToFormValues } from '@/features/lessons/lessonFormSchema';
import { getErrorMessage, logError } from '@/utils/errors';

export default function EditLessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonQuery = useLesson(id);
  const save = useSaveLesson();

  if (lessonQuery.isPending) return <LoadingState />;
  if (lessonQuery.isError) {
    return <ErrorState error={lessonQuery.error} onRetry={() => void lessonQuery.refetch()} />;
  }
  const lesson = lessonQuery.data;
  if (!lesson) return <EmptyState icon="search-outline" title="Lesson not found" />;

  return (
    <LessonForm
      initialValues={lessonToFormValues(lesson)}
      requireFutureStart={new Date(lesson.start_time) > new Date()}
      submitLabel="Save changes"
      submitting={save.isPending}
      submitError={save.isError ? getErrorMessage(save.error) : null}
      onSubmit={(input) =>
        save.mutate(
          { lessonId: lesson.id, input },
          {
            onSuccess: () => router.back(),
            onError: (error) => logError('updateLesson', error),
          },
        )
      }
    />
  );
}
