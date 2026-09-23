import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ConfirmationModal } from '@/components/ConfirmationModal';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import type { LessonInput } from '@/features/lessons/api';
import {
  useFollowingInSeries,
  useLesson,
  useSaveLesson,
  useUpdateLessons,
} from '@/features/lessons/hooks';
import { LessonForm } from '@/features/lessons/LessonForm';
import { lessonToFormValues } from '@/features/lessons/lessonFormSchema';
import { applyEditToSeries, laterInSeries } from '@/features/lessons/lessonSeries';
import { useT } from '@/i18n';
import { getErrorMessage, logError } from '@/utils/errors';

export default function EditLessonScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonQuery = useLesson(id);
  const lesson = lessonQuery.data;
  const upcomingInSeries = lesson && new Date(lesson.start_time) > new Date() ? lesson : null;
  const following = useFollowingInSeries(upcomingInSeries);
  const save = useSaveLesson();
  const saveSeries = useUpdateLessons();
  // The edit waiting for "this lesson only" or "this and the following".
  const [draft, setDraft] = useState<LessonInput | null>(null);
  const [invited, setInvited] = useState<string[]>([]);

  if (lessonQuery.isPending) return <LoadingState />;
  if (lessonQuery.isError) {
    return <ErrorState error={lessonQuery.error} onRetry={() => void lessonQuery.refetch()} />;
  }
  if (!lesson) return <EmptyState icon="search-outline" title={t('lessonNotFound')} />;

  const later = laterInSeries(lesson.id, following.data ?? []);

  // Back to the lesson screen, which confirms how many lessons were saved.
  const backToLesson = (saved: number) =>
    router.dismissTo({
      pathname: '/admin/lessons/[id]',
      params: { id: lesson.id, saved: String(saved) },
    });

  const saveThisOnly = (input: LessonInput, invitedPlayerIds = invited) =>
    save.mutate(
      { lessonId: lesson.id, inputs: [input], invitedPlayerIds },
      {
        onSuccess: () => {
          setDraft(null);
          backToLesson(1);
        },
        onError: (error) => logError('updateLesson', error),
      },
    );

  const saveFollowing = (input: LessonInput) =>
    saveSeries.mutate(
      {
        lessons: applyEditToSeries(lesson, input, following.data ?? []),
        invitedPlayerIds: invited,
      },
      {
        onSuccess: (_result, variables) => {
          setDraft(null);
          backToLesson(variables.lessons.length);
        },
        onError: (error) => logError('updateLessons', error),
      },
    );

  const error = save.error ?? saveSeries.error;

  return (
    <>
      <LessonForm
        initialValues={lessonToFormValues(lesson)}
        requireFutureStart={new Date(lesson.start_time) > new Date()}
        submitLabel={t('saveChanges')}
        submitting={save.isPending || saveSeries.isPending}
        submitError={draft === null && error ? getErrorMessage(error) : null}
        onSubmit={([input], invitedPlayerIds) => {
          save.reset();
          saveSeries.reset();
          setInvited(invitedPlayerIds);
          if (later > 0) setDraft(input);
          else saveThisOnly(input, invitedPlayerIds);
        }}
      />
      <ConfirmationModal
        visible={draft !== null}
        title={t('applyToWhich')}
        message={t('seriesEditMessage')}
        confirmLabel={t('thisLessonOnly')}
        secondaryLabel={
          later === 1 ? t('thisAndFollowingOne') : t('thisAndFollowingOther', { count: later })
        }
        cancelLabel={t('goBack')}
        loading={save.isPending || saveSeries.isPending}
        error={draft !== null && error ? getErrorMessage(error) : null}
        onConfirm={() => draft && saveThisOnly(draft)}
        onSecondary={() => draft && saveFollowing(draft)}
        onCancel={() => setDraft(null)}
      />
    </>
  );
}
