import { router, useLocalSearchParams } from 'expo-router';

import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useLesson, useSaveLesson } from '@/features/lessons/hooks';
import { LessonForm } from '@/features/lessons/LessonForm';
import { lessonToFormValues } from '@/features/lessons/lessonFormSchema';
import { useT } from '@/i18n';
import { getErrorMessage, logError } from '@/utils/errors';

export default function EditLessonScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonQuery = useLesson(id);
  const save = useSaveLesson();

  if (lessonQuery.isPending) return <LoadingState />;
  if (lessonQuery.isError) {
    return <ErrorState error={lessonQuery.error} onRetry={() => void lessonQuery.refetch()} />;
  }
  const lesson = lessonQuery.data;
  if (!lesson) return <EmptyState icon="search-outline" title={t('lessonNotFound')} />;

  return (
    <LessonForm
      initialValues={lessonToFormValues(lesson)}
      requireFutureStart={new Date(lesson.start_time) > new Date()}
      submitLabel={t('saveChanges')}
      submitting={save.isPending}
      submitError={save.isError ? getErrorMessage(save.error) : null}
      onSubmit={(inputs) =>
        save.mutate(
          { lessonId: lesson.id, inputs },
          {
            onSuccess: () => router.back(),
            onError: (error) => logError('updateLesson', error),
          },
        )
      }
    />
  );
}
