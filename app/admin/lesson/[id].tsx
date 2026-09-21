import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { CapacityIndicator } from '@/components/CapacityIndicator';
import { Card } from '@/components/Card';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { spacing } from '@/constants/theme';
import {
  getActiveRegistrations,
  getCancelledRegistrations,
  type LessonRegistration,
} from '@/features/lessons/api';
import { useLesson, useLessonsRealtime, useSetLessonStatus } from '@/features/lessons/hooks';
import { LessonDetailsHeader } from '@/features/lessons/LessonDetailsHeader';
import { getLessonAvailability } from '@/features/lessons/lessonState';
import { formatDateTime } from '@/utils/date';
import { getErrorMessage, logError } from '@/utils/errors';

type StatusAction = 'cancel' | 'reinstate';

export default function AdminLessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonQuery = useLesson(id);
  const setStatus = useSetLessonStatus();
  // The action is kept while the sheet animates closed, so its text never flips.
  const [action, setAction] = useState<StatusAction>('cancel');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  useLessonsRealtime(id);

  if (lessonQuery.isPending) return <LoadingState />;
  if (lessonQuery.isError) {
    return (
      <ErrorState
        error={lessonQuery.error}
        onRetry={() => void lessonQuery.refetch()}
        retrying={lessonQuery.isRefetching}
      />
    );
  }
  const lesson = lessonQuery.data;
  if (!lesson) return <EmptyState icon="search-outline" title="Lesson not found" />;

  const registered = getActiveRegistrations(lesson);
  const cancelled = getCancelledRegistrations(lesson);
  const availability = getLessonAvailability(lesson, false);
  const now = new Date();
  const canCancel = lesson.status === 'scheduled' && new Date(lesson.end_time) > now;
  const canReinstate = lesson.status === 'cancelled' && new Date(lesson.start_time) > now;

  const openConfirm = (next: StatusAction) => {
    setStatus.reset();
    setAction(next);
    setConfirmOpen(true);
  };

  const confirm = () => {
    const status = action === 'cancel' ? 'cancelled' : 'scheduled';
    setStatus.mutate(
      { lessonId: lesson.id, status },
      {
        onSuccess: () => {
          setNotice(
            action === 'cancel'
              ? 'The lesson has been cancelled.'
              : 'The lesson is scheduled again.',
          );
          setConfirmOpen(false);
        },
        onError: (error) => logError('setLessonStatus', error),
      },
    );
  };

  return (
    <ScreenContainer
      onRefresh={() => void lessonQuery.refetch()}
      refreshing={lessonQuery.isRefetching}
    >
      <LessonDetailsHeader lesson={lesson} availability={availability} />
      {notice ? <Banner tone="success" message={notice} /> : null}

      <Card>
        <CapacityIndicator
          registered={lesson.registered_count}
          capacity={lesson.capacity}
          size="large"
        />
        <AppText variant="caption" tone="muted">
          Registration {lesson.registration_open ? 'open' : 'closed'}
        </AppText>
      </Card>

      <Card>
        <SectionHeader title="Registered" count={registered.length} />
        {registered.length === 0 ? (
          <AppText tone="muted">No players registered yet.</AppText>
        ) : (
          registered.map((registration) => (
            <RegistrationLine
              key={registration.id}
              registration={registration}
              detail={`Joined ${formatDateTime(registration.joined_at)}`}
            />
          ))
        )}
      </Card>

      <Card>
        <SectionHeader title="Cancelled" count={cancelled.length} />
        {cancelled.length === 0 ? (
          <AppText tone="muted">No cancellations.</AppText>
        ) : (
          cancelled.map((registration) => (
            <View key={registration.id} style={styles.cancelled}>
              <RegistrationLine
                registration={registration}
                detail={
                  registration.cancelled_at
                    ? `Cancelled ${formatDateTime(registration.cancelled_at)}`
                    : 'Cancelled'
                }
              />
              <AppText
                tone={registration.cancellation_reason ? 'default' : 'subtle'}
                style={styles.reason}
              >
                {registration.cancellation_reason
                  ? `Reason: ${registration.cancellation_reason}`
                  : 'No reason given'}
              </AppText>
            </View>
          ))
        )}
      </Card>

      <View style={styles.actions}>
        <Button
          label="Edit lesson"
          icon="create-outline"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/admin/lesson/edit/[id]', params: { id: lesson.id } })
          }
        />
        {canCancel ? (
          <Button
            label="Cancel lesson"
            icon="close-circle-outline"
            variant="danger"
            onPress={() => openConfirm('cancel')}
          />
        ) : null}
        {canReinstate ? (
          <Button
            label="Reinstate lesson"
            icon="refresh"
            variant="secondary"
            onPress={() => openConfirm('reinstate')}
          />
        ) : null}
      </View>

      <ConfirmationModal
        visible={confirmOpen}
        title={action === 'cancel' ? 'Cancel this lesson?' : 'Reinstate this lesson?'}
        message={
          action === 'cancel'
            ? "Players will see the lesson as cancelled and won't be able to join. Registrations are kept for your records."
            : 'The lesson will be scheduled again. Players who were registered stay registered.'
        }
        confirmLabel={action === 'cancel' ? 'Cancel lesson' : 'Reinstate lesson'}
        cancelLabel={action === 'cancel' ? 'Keep lesson' : 'Go back'}
        destructive={action === 'cancel'}
        loading={setStatus.isPending}
        error={setStatus.isError ? getErrorMessage(setStatus.error) : null}
        onConfirm={confirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </ScreenContainer>
  );
}

function RegistrationLine({
  registration,
  detail,
}: {
  registration: LessonRegistration;
  detail: string;
}) {
  return (
    <View style={styles.line}>
      <PlayerAvatar
        name={registration.player.full_name}
        avatarPath={registration.player.avatar_path}
        version={registration.player.updated_at}
        size={36}
      />
      <View style={styles.lineText}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {registration.player.full_name}
        </AppText>
        <AppText variant="caption" tone="muted">
          {detail}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lineText: { flex: 1, gap: spacing.xxs },
  cancelled: { gap: spacing.xs },
  reason: { marginLeft: 36 + spacing.md },
  actions: { gap: spacing.md },
});
