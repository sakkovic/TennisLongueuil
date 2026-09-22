import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { TextField } from '@/components/TextField';
import { MAX_CANCELLATION_REASON_LENGTH } from '@/constants/lessons';
import { spacing } from '@/constants/theme';
import { findMyRegistration, getWaitlistPosition, type Lesson } from '@/features/lessons/api';
import {
  AVAILABILITY_LABEL_KEYS,
  getLessonAvailability,
  type LessonAvailability,
} from '@/features/lessons/lessonState';
import { useT } from '@/i18n';
import { formatDateTime } from '@/utils/date';
import { getErrorMessage, logError } from '@/utils/errors';

import { useCancelRegistration, useJoinLesson, useJoinWaitlist } from './hooks';

interface LessonActionsViewProps {
  lessonId: string;
  availability: LessonAvailability;
  /** 1 for the first player in line, when the player is waiting. */
  waitlistPosition: number | null;
  /** Lesson screen: longer explanations and a disabled button for closed states. */
  detailed?: boolean;
  joining?: boolean;
  joiningWaitlist?: boolean;
  onJoin: () => void;
  onJoinWaitlist: () => void;
  onCancel: () => void;
}

/** True when a lesson card has buttons for the player (otherwise its badge says it all). */
export function hasLessonActions(availability: LessonAvailability): boolean {
  return (
    availability.canJoin ||
    availability.canJoinWaitlist ||
    availability.state === 'waitlisted' ||
    availability.state === 'registered'
  );
}

/** What the player can do right now, as buttons. Pure: see LessonActions for the wiring. */
export function LessonActionsView({
  lessonId,
  availability,
  waitlistPosition,
  detailed = false,
  joining = false,
  joiningWaitlist = false,
  onJoin,
  onJoinWaitlist,
  onCancel,
}: LessonActionsViewProps) {
  const t = useT();
  const { state } = availability;

  if (availability.canJoin) {
    return (
      <View style={styles.stack}>
        <Button
          label={t('joinLesson')}
          icon="add-circle-outline"
          onPress={onJoin}
          loading={joining}
          testID={`join-${lessonId}`}
        />
      </View>
    );
  }

  if (availability.canJoinWaitlist) {
    return (
      <View style={styles.stack}>
        <Button
          label={t('joinWaitlist')}
          icon="hourglass-outline"
          variant="secondary"
          onPress={onJoinWaitlist}
          loading={joiningWaitlist}
          testID={`waitlist-${lessonId}`}
        />
        {detailed ? (
          <AppText variant="caption" tone="muted" style={styles.centered}>
            {t('waitlistHint')}
          </AppText>
        ) : null}
      </View>
    );
  }

  // The card's badge already says "on the waitlist" / "registered", so the
  // actions only add what is new: the place in line, or until when to cancel.
  if (state === 'waitlisted') {
    return (
      <View style={styles.stack}>
        <AppText variant="label" tone="muted" style={styles.centered}>
          {waitlistPosition
            ? t('waitlistPosition', { position: waitlistPosition })
            : t('onWaitlist')}
        </AppText>
        <Button
          label={t('leaveWaitlist')}
          icon="exit-outline"
          variant="secondary"
          size="md"
          onPress={onCancel}
        />
      </View>
    );
  }

  if (state === 'registered') {
    return (
      <View style={styles.stack}>
        {availability.canCancel ? (
          <Button
            label={t('cancelParticipation')}
            icon="close-circle-outline"
            variant="danger"
            size="md"
            onPress={onCancel}
            testID={`cancel-${lessonId}`}
          />
        ) : null}
        <AppText variant="caption" tone="muted" style={styles.centered}>
          {availability.canCancel
            ? t('cancelUntil', { when: formatDateTime(availability.cancellationClosesAt) })
            : t('cancellationClosed')}
        </AppText>
      </View>
    );
  }

  // Full, closed, started, finished or cancelled: the card's badge already
  // says so in lists; the lesson screen shows it as a disabled button.
  if (!detailed) return null;
  return (
    <Button
      label={t(AVAILABILITY_LABEL_KEYS[state])}
      onPress={() => undefined}
      disabled
      variant="secondary"
    />
  );
}

interface LessonActionsProps {
  lesson: Lesson;
  userId: string;
  detailed?: boolean;
}

/**
 * Join, join the waitlist, cancel or leave the waitlist, right on the lesson
 * card. The database re-checks every rule; the result is shown in the card.
 */
export function LessonActions({ lesson, userId, detailed = false }: LessonActionsProps) {
  const t = useT();
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

  const mine = findMyRegistration(lesson, userId);
  const availability = getLessonAvailability(lesson, mine?.status);
  const input = { lessonId: lesson.id, title: lesson.title, startTime: lesson.start_time };

  const showError = (context: string) => (error: unknown) => {
    logError(context, error);
    setFeedback({ tone: 'danger', text: getErrorMessage(error) });
  };

  const handleJoin = () => {
    setFeedback(null);
    join.mutate(input, {
      onSuccess: () => setFeedback({ tone: 'success', text: t('youreIn') }),
      onError: showError('joinLesson'),
    });
  };

  const handleJoinWaitlist = () => {
    setFeedback(null);
    joinWaitlist.mutate(input, {
      onSuccess: (result) =>
        setFeedback({
          tone: 'success',
          text:
            result.status === 'joined'
              ? t('youreIn')
              : t('waitlistJoined', { position: result.waitlist_position ?? 1 }),
        }),
      onError: showError('joinWaitlist'),
    });
  };

  const openCancel = () => {
    setFeedback(null);
    cancel.reset();
    setLeavingWaitlist(mine?.status === 'waitlisted');
    setCancelOpen(true);
  };

  const confirmCancel = () => {
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

  return (
    <View style={styles.stack}>
      {feedback ? <Banner tone={feedback.tone} message={feedback.text} /> : null}
      <LessonActionsView
        lessonId={lesson.id}
        availability={availability}
        waitlistPosition={getWaitlistPosition(lesson, userId)}
        detailed={detailed}
        joining={join.isPending}
        joiningWaitlist={joinWaitlist.isPending}
        onJoin={handleJoin}
        onJoinWaitlist={handleJoinWaitlist}
        onCancel={openCancel}
      />
      <ConfirmationModal
        visible={cancelOpen}
        title={leavingWaitlist ? t('leaveWaitlist') : t('cancelParticipation')}
        message={leavingWaitlist ? t('leaveWaitlistMessage') : t('spotReleased')}
        confirmLabel={leavingWaitlist ? t('leaveWaitlist') : t('confirmCancellation')}
        cancelLabel={leavingWaitlist ? t('keepMyPlace') : t('keepRegistration')}
        destructive
        loading={cancel.isPending}
        error={cancel.isError ? getErrorMessage(cancel.error) : null}
        onConfirm={confirmCancel}
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
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  centered: { textAlign: 'center' },
});
