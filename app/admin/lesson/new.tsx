import { router } from 'expo-router';
import { useState } from 'react';

import { ConfirmationModal } from '@/components/ConfirmationModal';
import { useSaveLesson, useUpcomingLessons } from '@/features/lessons/hooks';
import { LessonForm } from '@/features/lessons/LessonForm';
import { conflictMessage, findConflictingInputs } from '@/features/lessons/lessonConflicts';
import { defaultLessonFormValues } from '@/features/lessons/lessonFormSchema';
import type { LessonInput } from '@/features/lessons/api';
import { useT } from '@/i18n';
import { getErrorMessage, logError } from '@/utils/errors';

export default function NewLessonScreen() {
  const t = useT();
  const [initialValues] = useState(() => defaultLessonFormValues());
  const save = useSaveLesson();
  const existing = useUpcomingLessons();
  const [draft, setDraft] = useState<LessonInput[] | null>(null);
  const [conflicts, setConflicts] = useState<LessonInput[]>([]);

  const create = (inputs: LessonInput[]) => {
    setDraft(null);
    setConflicts([]);
    save.mutate(
      { inputs },
      {
        onSuccess: (ids) =>
          ids.length > 1
            ? router.replace('/admin/lessons')
            : router.replace({ pathname: '/admin/lesson/[id]', params: { id: ids[0] } }),
        onError: (error) => logError('createLessons', error),
      },
    );
  };

  const handleSubmit = (inputs: LessonInput[]) => {
    void (async () => {
      const latest = existing.data ?? (await existing.refetch()).data ?? [];
      const colliding = findConflictingInputs(inputs, latest);
      if (colliding.length === 0) {
        create(inputs);
        return;
      }
      setDraft(inputs);
      setConflicts(colliding);
    })();
  };

  const freeInputs =
    draft?.filter(
      (input) => !conflicts.some((conflict) => conflict.start_time === input.start_time),
    ) ?? [];
  const allCollide = draft !== null && freeInputs.length === 0;

  return (
    <>
      <LessonForm
        initialValues={initialValues}
        requireFutureStart
        allowRepeat
        submitLabel={t('createLesson')}
        submitting={save.isPending}
        submitError={save.isError ? getErrorMessage(save.error) : null}
        onSubmit={handleSubmit}
      />
      <ConfirmationModal
        visible={draft !== null}
        title={allCollide ? t('conflictTitleAll') : t('conflictTitleSome')}
        message={draft ? conflictMessage(conflicts, draft.length) : undefined}
        confirmLabel={
          allCollide ? t('createAnyway') : t('createOther', { count: freeInputs.length })
        }
        secondaryLabel={allCollide ? undefined : t('createAllAnyway')}
        cancelLabel={t('goBack')}
        loading={save.isPending}
        error={save.isError ? getErrorMessage(save.error) : null}
        onConfirm={() => create(allCollide ? (draft ?? []) : freeInputs)}
        onSecondary={draft ? () => create(draft) : undefined}
        onCancel={() => {
          setDraft(null);
          setConflicts([]);
        }}
      />
    </>
  );
}
