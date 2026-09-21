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
import { getLessonAvailability } from '@/features/lessons/lessonState';
import { useCancelRegistration, useJoinLesson } from '@/features/registrations/hooks';
import { formatDateTime } from '@/utils/date';
import { getErrorMessage, logError } from '@/utils/errors';

export default function PlayerLessonScreen() {
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
      <EmptyState
        icon="search-outline"
        title="Lesson not found"
        message="It may have been removed."
      />
    );
  }

  const participants = getActiveRegistrations(lesson).map((registration) => registration.player);
  const mine = findMyRegistration(lesson, member.id);
  const isRegistered = mine?.status === 'joined';
  const availability = getLessonAvailability(lesson, isRegistered);

  const handleJoin = () => {
    setFeedback(null);
    join.mutate(lesson.id, {
      onSuccess: () => setFeedback({ tone: 'success', text: "You're in! See you on the court." }),
      onError: (error) => {
        logError('joinLesson', error);
        setFeedback({ tone: 'danger', text: getErrorMessage(error) });
      },
    });
  };

  const handleCancel = () => {
    cancel.mutate(
      { lessonId: lesson.id, reason },
      {
        onSuccess: () => {
          setCancelOpen(false);
          setReason('');
          setFeedback({ tone: 'success', text: 'Your participation has been cancelled.' });
        },
        onError: (error) => logError('cancelRegistration', error),
      },
    );
  };

  const footer = availability.canJoin ? (
    <Button
      label="Join lesson"
      icon="add-circle-outline"
      onPress={handleJoin}
      loading={join.isPending}
    />
  ) : availability.canCancel ? (
    <View style={styles.registeredFooter}>
      <StatusBadge label="You're registered" tone="success" icon="checkmark-circle" />
      <Button
        label="Cancel participation"
        variant="danger"
        onPress={() => {
          setFeedback(null);
          cancel.reset();
          setCancelOpen(true);
        }}
      />
    </View>
  ) : (
    <Button label={availability.label} onPress={() => undefined} disabled variant="secondary" />
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
        <SectionHeader title="Players" count={participants.length} />
        <ParticipantList participants={participants} currentUserId={member.id} />
      </Card>

      {mine?.status === 'cancelled' && mine.cancelled_at ? (
        <Card>
          <AppText variant="label" tone="muted">
            You cancelled on {formatDateTime(mine.cancelled_at)}.
          </AppText>
          {mine.cancellation_reason ? (
            <AppText tone="muted">Your reason (private): {mine.cancellation_reason}</AppText>
          ) : null}
        </Card>
      ) : null}

      <ConfirmationModal
        visible={cancelOpen}
        title="Cancel participation"
        message="Your spot will be released so another player can take it."
        confirmLabel="Confirm cancellation"
        cancelLabel="Keep registration"
        destructive
        loading={cancel.isPending}
        error={cancel.isError ? getErrorMessage(cancel.error) : null}
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      >
        <TextField
          label="Reason (optional)"
          value={reason}
          onChangeText={setReason}
          multiline
          maxLength={MAX_CANCELLATION_REASON_LENGTH}
          placeholder="e.g. Work meeting"
          hint="Only your coach can see this."
        />
      </ConfirmationModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.md },
  registeredFooter: { gap: spacing.md, alignItems: 'stretch' },
});
