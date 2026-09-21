import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { StatusBadge } from '@/components/Badges';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { CapacityIndicator } from '@/components/CapacityIndicator';
import { Card } from '@/components/Card';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { ParticipantList } from '@/components/ParticipantList';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { TextField } from '@/components/TextField';
import { MAX_CANCELLATION_REASON_LENGTH } from '@/constants/lessons';
import { spacing } from '@/constants/theme';
import { useCurrentMember } from '@/features/auth/AuthProvider';
import { findMyRegistration, getActiveRegistrations } from '@/features/lessons/api';
import { useLesson, useLessonsRealtime } from '@/features/lessons/hooks';
import { LessonDetailsHeader } from '@/features/lessons/LessonDetailsHeader';
import { AVAILABILITY_LABEL_KEYS, getLessonAvailability } from '@/features/lessons/lessonState';
import { useCancelRegistration, useJoinLesson } from '@/features/registrations/hooks';
import { useT } from '@/i18n';
import { formatDateTime } from '@/utils/date';
import { getErrorMessage, logError } from '@/utils/errors';

export default function PlayerLessonScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const member = useCurrentMember();
  const lessonQuery = useLesson(id);
  useLessonsRealtime(id);

  const join = useJoinLesson();
  const cancel = useCancelRegistration();
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; text: string } | null>(
    null,
  );
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

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
  if (!lesson) {
    return (
      <EmptyState icon="search-outline" title={t('lessonNotFound')} message={t('lessonRemoved')} />
    );
  }

  const participants = getActiveRegistrations(lesson).map((registration) => registration.player);
  const mine = findMyRegistration(lesson, member.id);
  const isRegistered = mine?.status === 'joined';
  const availability = getLessonAvailability(lesson, isRegistered);

  const handleJoin = () => {
    setFeedback(null);
    join.mutate(
      { lessonId: lesson.id, title: lesson.title, startTime: lesson.start_time },
      {
        onSuccess: () => setFeedback({ tone: 'success', text: t('youreIn') }),
        onError: (error) => {
          logError('joinLesson', error);
          setFeedback({ tone: 'danger', text: getErrorMessage(error) });
        },
      },
    );
  };

  const handleCancel = () => {
    cancel.mutate(
      { lessonId: lesson.id, reason },
      {
        onSuccess: () => {
          setCancelOpen(false);
          setReason('');
          setFeedback({ tone: 'success', text: t('participationCancelled') });
        },
        onError: (error) => logError('cancelRegistration', error),
      },
    );
  };

  const footer = availability.canJoin ? (
    <Button
      label={t('joinLesson')}
      icon="add-circle-outline"
      onPress={handleJoin}
      loading={join.isPending}
    />
  ) : availability.canCancel ? (
    <View style={styles.registeredFooter}>
      <StatusBadge label={t('youreRegistered')} tone="success" icon="checkmark-circle" />
      <Button
        label={t('cancelParticipation')}
        variant="danger"
        onPress={() => {
          setFeedback(null);
          cancel.reset();
          setCancelOpen(true);
        }}
      />
      <AppText variant="caption" tone="muted" style={styles.centered}>
        {t('cancelUntil', { when: formatDateTime(availability.cancellationClosesAt) })}
      </AppText>
    </View>
  ) : availability.state === 'registered' ? (
    // Registered, but within 24 hours of the lesson: the spot can no longer be released.
    <View style={styles.registeredFooter}>
      <StatusBadge label={t('youreRegistered')} tone="success" icon="checkmark-circle" />
      <AppText variant="caption" tone="muted" style={styles.centered}>
        {t('cancellationClosed')}
      </AppText>
    </View>
  ) : (
    <Button
      label={t(AVAILABILITY_LABEL_KEYS[availability.state])}
      onPress={() => undefined}
      disabled
      variant="secondary"
    />
  );

  return (
    <ScreenContainer
      onRefresh={() => void lessonQuery.refetch()}
      refreshing={lessonQuery.isRefetching}
      footer={
        <View style={styles.footer}>
          {feedback ? <Banner tone={feedback.tone} message={feedback.text} /> : null}
          {footer}
        </View>
      }
    >
      <LessonDetailsHeader lesson={lesson} availability={availability} />

      <Card>
        <CapacityIndicator
          registered={lesson.registered_count}
          capacity={lesson.capacity}
          size="large"
          hideAvailability={availability.state === 'cancelled'}
        />
      </Card>

      <Card>
        <SectionHeader title={t('players')} count={participants.length} />
        <ParticipantList participants={participants} currentUserId={member.id} />
      </Card>

      {mine?.status === 'cancelled' && mine.cancelled_at ? (
        <Card>
          <AppText variant="label" tone="muted">
            {t('youCancelledOn', { when: formatDateTime(mine.cancelled_at) })}
          </AppText>
          {mine.cancellation_reason ? (
            <AppText tone="muted">
              {t('yourReasonPrivate', { reason: mine.cancellation_reason })}
            </AppText>
          ) : null}
        </Card>
      ) : null}

      <ConfirmationModal
        visible={cancelOpen}
        title={t('cancelParticipation')}
        message={t('spotReleased')}
        confirmLabel={t('confirmCancellation')}
        cancelLabel={t('keepRegistration')}
        destructive
        loading={cancel.isPending}
        error={cancel.isError ? getErrorMessage(cancel.error) : null}
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      >
        <TextField
          label={t('reasonOptional')}
          value={reason}
          onChangeText={setReason}
          multiline
          maxLength={MAX_CANCELLATION_REASON_LENGTH}
          placeholder={t('reasonPlaceholder')}
          hint={t('reasonHint')}
        />
      </ConfirmationModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.md },
  registeredFooter: { gap: spacing.md, alignItems: 'stretch' },
  centered: { textAlign: 'center' },
});
