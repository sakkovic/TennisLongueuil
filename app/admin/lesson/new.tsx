import { router } from 'expo-router';
import { useState } from 'react';

import { useSaveLesson } from '@/features/lessons/hooks';
import { LessonForm } from '@/features/lessons/LessonForm';
import { defaultLessonFormValues } from '@/features/lessons/lessonFormSchema';
import { getErrorMessage, logError } from '@/utils/errors';

export default function NewLessonScreen() {
  const [initialValues] = useState(() => defaultLessonFormValues());
  const save = useSaveLesson();

  return (
    <LessonForm
      initialValues={initialValues}
      requireFutureStart
      submitLabel="Create lesson"
      submitting={save.isPending}
      submitError={save.isError ? getErrorMessage(save.error) : null}
      onSubmit={(input) =>
        save.mutate(
          { input },
          {
            onSuccess: (id) => router.replace({ pathname: '/admin/lesson/[id]', params: { id } }),
            onError: (error) => logError('createLesson', error),
          },
        )
      }
    />
  );
}
