import { Stack, useLocalSearchParams } from 'expo-router';
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
import {
  findMyRegistration,
  getActiveRegistrations,
  getWaitlist,
  getWaitlistPosition,
} from '@/features/lessons/api';
import { useLesson, useLessonsRealtime } from '@/features/lessons/hooks';
import { LessonDetailsHeader } from '@/features/lessons/LessonDetailsHeader';
import { AVAILABILITY_LABEL_KEYS, getLessonAvailability } from '@/features/lessons/lessonState';
import { ShareLessonButton } from '@/features/lessons/ShareLessonButton';
import {
  useCancelRegistration,
  useJoinLesson,
  useJoinWaitlist,
} from '@/features/registrations/hooks';
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
  const joinWaitlist = useJoinWaitlist();
  const cancel = useCancelRegistration();
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; text: string } | null>(
    null,
  );
  const [cancelOpen, setCancelOpen] = useState(false);
  // Kept while the sheet animates closed, so its text never flips.
  const [leavingWaitlist, setLeavingWaitlist] = useState(false);
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
  const waiting = getWaitlist(lesson).map((registration) => registration.player);
  const mine = findMyRegistration(lesson, member.id);
  const isWaitlisted = mine?.status === 'waitlisted';
  const position = getWaitlistPosition(lesson, member.id);
  const availability = getLessonAvailability(lesson, mine?.status);
  const lessonInput = { lessonId: lesson.id, title: lesson.title, startTime: lesson.start_time };

  const handleJoin = () => {
    setFeedback(null);
    join.mutate(lessonInput, {
      onSuccess: () => setFeedback({ tone: 'success', text: t('youreIn') }),
      onError: (error) => {
        logError('joinLesson', error);
        setFeedback({ tone: 'danger', text: getErrorMessage(error) });
      },
    });
  };

  const handleJoinWaitlist = () => {
    setFeedback(null);
    joinWaitlist.mutate(lessonInput, {
      onSuccess: (result) =>
        setFeedback({
          tone: 'success',
          text:
            result.status === 'joined'
              ? t('youreIn')
              : t('waitlistJoined', { position: result.waitlist_position ?? 1 }),
        }),
      onError: (error) => {
        logError('joinWaitlist', error);
        setFeedback({ tone: 'danger', text: getErrorMessage(error) });
      },
    });
  };

  const openCancel = () => {
    setFeedback(null);
    cancel.reset();
    setLeavingWaitlist(isWaitlisted);
    setCancelOpen(true);
  };

  const handleCancel = () => {
    cancel.mutate(
      { lessonId: lesson.id, reason: leavingWaitlist ? '' : reason },
      {
        onSuccess: () => {
          setCancelOpen(false);
          setReason('');
          setFeedback({
            tone: 'success',
            text: leavingWaitlist ? t('leftWaitlist') : t('participationCancelled'),
          });
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
  ) : availability.canJoinWaitlist ? (
    <View style={styles.stack}>
      <Button
        label={t('joinWaitlist')}
        icon="hourglass-outline"
        onPress={handleJoinWaitlist}
        loading={joinWaitlist.isPending}
      />
      <AppText variant="caption" tone="muted" style={styles.centered}>
        {t('waitlistHint')}
      </AppText>
    </View>
  ) : availability.state === 'waitlisted' ? (
    <View style={styles.stack}>
      <StatusBadge
        label={position ? t('waitlistPosition', { position }) : t('onWaitlist')}
        tone="info"
        icon="hourglass-outline"
      />
      <Button label={t('leaveWaitlist')} variant="secondary" onPress={openCancel} />
    </View>
  ) : availability.canCancel ? (
    <View style={styles.stack}>
      <StatusBadge label={t('youreRegistered')} tone="success" icon="checkmark-circle" />
      <Button label={t('cancelParticipation')} variant="danger" onPress={openCancel} />
      <AppText variant="caption" tone="muted" style={styles.centered}>
        {t('cancelUntil', { when: formatDateTime(availability.cancellationClosesAt) })}
      </AppText>
    </View>
  ) : availability.state === 'registered' ? (
    // Registered, but within 24 hours of the lesson: the spot can no longer be released.
    <View style={styles.stack}>
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
      <Stack.Screen options={{ headerRight: () => <ShareLessonButton lesson={lesson} /> }} />
      <LessonDetailsHeader lesson={lesson} availability={availability} />

      {mine?.status === 'joined' && mine.promoted_at && availability.state === 'registered' ? (
        <Banner tone="success" message={t('spotOpened')} />
      ) : null}

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

      {waiting.length > 0 && availability.state !== 'cancelled' ? (
        <Card>
          <SectionHeader title={t('waitlist')} count={waiting.length} />
          <ParticipantList participants={waiting} currentUserId={member.id} />
        </Card>
      ) : null}

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
        title={leavingWaitlist ? t('leaveWaitlist') : t('cancelParticipation')}
        message={leavingWaitlist ? t('leaveWaitlistMessage') : t('spotReleased')}
        confirmLabel={leavingWaitlist ? t('leaveWaitlist') : t('confirmCancellation')}
        cancelLabel={leavingWaitlist ? t('keepMyPlace') : t('keepRegistration')}
        destructive
        loading={cancel.isPending}
        error={cancel.isError ? getErrorMessage(cancel.error) : null}
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      >
        {leavingWaitlist ? null : (
          <TextField
            label={t('reasonOptional')}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={MAX_CANCELLATION_REASON_LENGTH}
            placeholder={t('reasonPlaceholder')}
            hint={t('reasonHint')}
          />
        )}
      </ConfirmationModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.md },
  stack: { gap: spacing.md, alignItems: 'stretch' },
  centered: { textAlign: 'center' },
});
