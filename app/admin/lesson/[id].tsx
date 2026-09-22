import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
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
  getWaitlist,
  type LessonRegistration,
} from '@/features/lessons/api';
import { AttendanceToggle } from '@/features/lessons/AttendanceToggle';
import {
  useFollowingInSeries,
  useLesson,
  useLessonsRealtime,
  useSetAttendance,
  useSetLessonsStatus,
  useSetLessonStatus,
} from '@/features/lessons/hooks';
import { laterInSeries } from '@/features/lessons/lessonSeries';
import { canTakeAttendance, getLessonAvailability } from '@/features/lessons/lessonState';
import { LessonSummaryCard } from '@/features/lessons/LessonSummaryCard';
import { ShareLessonButton } from '@/features/lessons/ShareLessonButton';
import { useT } from '@/i18n';
import { formatDateTime } from '@/utils/date';
import { getErrorMessage, logError } from '@/utils/errors';

type StatusAction = 'cancel' | 'reinstate';

export default function AdminLessonScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonQuery = useLesson(id);
  const lesson = lessonQuery.data;
  const now = new Date();
  const cancellable =
    lesson && lesson.status === 'scheduled' && new Date(lesson.start_time) > now ? lesson : null;
  const following = useFollowingInSeries(cancellable);
  const setStatus = useSetLessonStatus();
  const setSeriesStatus = useSetLessonsStatus();
  const attendance = useSetAttendance();
  // The action is kept while the sheet animates closed, so its text never flips.
  const [action, setAction] = useState<StatusAction>('cancel');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
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
  if (!lesson) return <EmptyState icon="search-outline" title={t('lessonNotFound')} />;

  const registered = getActiveRegistrations(lesson);
  const waitlist = getWaitlist(lesson);
  const cancelled = getCancelledRegistrations(lesson);
  const availability = getLessonAvailability(lesson, false);
  const canCancel = lesson.status === 'scheduled' && new Date(lesson.end_time) > now;
  const canReinstate = lesson.status === 'cancelled' && new Date(lesson.start_time) > now;
  const takingAttendance = canTakeAttendance(lesson, now);
  const present = registered.filter((r) => r.attendance?.status === 'present').length;
  const followingIds = (following.data ?? []).map((l) => l.id);
  const later = cancellable ? laterInSeries(lesson.id, following.data ?? []) : 0;
  const statusError = setStatus.error ?? setSeriesStatus.error;

  const openConfirm = (next: StatusAction) => {
    setStatus.reset();
    setSeriesStatus.reset();
    setAction(next);
    setConfirmOpen(true);
  };

  const confirm = () => {
    const status = action === 'cancel' ? 'cancelled' : 'scheduled';
    setStatus.mutate(
      { lessonId: lesson.id, status },
      {
        onSuccess: () => {
          setNotice(action === 'cancel' ? t('lessonCancelledNotice') : t('lessonReinstatedNotice'));
          setConfirmOpen(false);
        },
        onError: (error) => logError('setLessonStatus', error),
      },
    );
  };

  const cancelFollowing = () =>
    setSeriesStatus.mutate(
      { lessonIds: followingIds, status: 'cancelled' },
      {
        onSuccess: () => {
          setNotice(t('lessonsCancelled', { count: followingIds.length }));
          setConfirmOpen(false);
        },
        onError: (error) => logError('setLessonsStatus', error),
      },
    );

  const markAttendance = (registration: LessonRegistration, value: 'present' | 'absent' | null) => {
    setAttendanceError(null);
    attendance.mutate(
      { registrationId: registration.id, status: value },
      {
        onError: (error) => {
          logError('setAttendance', error);
          setAttendanceError(getErrorMessage(error));
        },
      },
    );
  };

  return (
    <ScreenContainer
      onRefresh={() => void lessonQuery.refetch()}
      refreshing={lessonQuery.isRefetching}
    >
      <Stack.Screen options={{ headerRight: () => <ShareLessonButton lesson={lesson} /> }} />
      {notice ? <Banner tone="success" message={notice} /> : null}

      <LessonSummaryCard lesson={lesson} availability={availability}>
        <AppText variant="caption" tone="muted">
          {lesson.registration_open ? t('registrationOpen') : t('registrationClosed')}
        </AppText>
      </LessonSummaryCard>

      <Card>
        <SectionHeader
          title={takingAttendance ? t('attendance') : t('registered')}
          count={registered.length}
        />
        {takingAttendance && registered.length > 0 ? (
          <AppText variant="caption" tone="muted">
            {`${t('attendanceCount', { present, total: registered.length })} · ${t('attendanceHint')}`}
          </AppText>
        ) : null}
        {attendanceError ? <Banner tone="danger" message={attendanceError} /> : null}
        {registered.length === 0 ? (
          <AppText tone="muted">{t('noPlayersRegistered')}</AppText>
        ) : (
          registered.map((registration) => (
            <RegistrationLine
              key={registration.id}
              registration={registration}
              detail={
                registration.promoted_at
                  ? t('movedUp')
                  : t('joinedOn', { when: formatDateTime(registration.joined_at) })
              }
              trailing={
                takingAttendance ? (
                  <AttendanceToggle
                    playerName={registration.player.full_name}
                    value={registration.attendance?.status ?? null}
                    saving={
                      attendance.isPending &&
                      attendance.variables?.registrationId === registration.id
                    }
                    onChange={(value) => markAttendance(registration, value)}
                  />
                ) : null
              }
            />
          ))
        )}
        {!takingAttendance && registered.length > 0 && lesson.status === 'scheduled' ? (
          <AppText variant="caption" tone="subtle">
            {t('attendanceOpens')}
          </AppText>
        ) : null}
      </Card>

      {waitlist.length > 0 ? (
        <Card>
          <SectionHeader title={t('waitlist')} count={waitlist.length} />
          {waitlist.map((registration, index) => (
            <RegistrationLine
              key={registration.id}
              registration={registration}
              detail={`#${index + 1} · ${t('queuedOn', { when: formatDateTime(registration.joined_at) })}`}
            />
          ))}
        </Card>
      ) : null}

      <Card>
        <SectionHeader title={t('cancelled')} count={cancelled.length} />
        {cancelled.length === 0 ? (
          <AppText tone="muted">{t('noCancellations')}</AppText>
        ) : (
          cancelled.map((registration) => (
            <View key={registration.id} style={styles.cancelled}>
              <RegistrationLine
                registration={registration}
                detail={
                  registration.cancelled_at
                    ? t('cancelledOn', { when: formatDateTime(registration.cancelled_at) })
                    : t('cancelled')
                }
              />
              <AppText
                tone={registration.cancellation_reason ? 'default' : 'subtle'}
                style={styles.reason}
              >
                {registration.cancellation_reason
                  ? t('reasonLabel', { reason: registration.cancellation_reason })
                  : t('noReasonGiven')}
              </AppText>
            </View>
          ))
        )}
      </Card>

      <View style={styles.actions}>
        <Button
          label={t('editLesson')}
          icon="create-outline"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/admin/lesson/edit/[id]', params: { id: lesson.id } })
          }
        />
        {canCancel ? (
          <Button
            label={t('cancelLesson')}
            icon="close-circle-outline"
            variant="danger"
            onPress={() => openConfirm('cancel')}
          />
        ) : null}
        {canReinstate ? (
          <Button
            label={t('reinstateLesson')}
            icon="refresh"
            variant="secondary"
            onPress={() => openConfirm('reinstate')}
          />
        ) : null}
      </View>

      <ConfirmationModal
        visible={confirmOpen}
        title={action === 'cancel' ? t('cancelLessonTitle') : t('reinstateLessonTitle')}
        message={
          action === 'cancel'
            ? later > 0
              ? t('seriesCancelMessage')
              : t('cancelLessonMessage')
            : t('reinstateLessonMessage')
        }
        confirmLabel={
          action === 'cancel'
            ? later > 0
              ? t('thisLessonOnly')
              : t('cancelLesson')
            : t('reinstateLesson')
        }
        secondaryLabel={
          action === 'cancel' && later > 0
            ? later === 1
              ? t('thisAndFollowingOne')
              : t('thisAndFollowingOther', { count: later })
            : undefined
        }
        onSecondary={action === 'cancel' && later > 0 ? cancelFollowing : undefined}
        cancelLabel={action === 'cancel' ? t('keepLesson') : t('goBack')}
        destructive={action === 'cancel'}
        loading={setStatus.isPending || setSeriesStatus.isPending}
        error={statusError ? getErrorMessage(statusError) : null}
        onConfirm={confirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </ScreenContainer>
  );
}

function RegistrationLine({
  registration,
  detail,
  trailing,
}: {
  registration: LessonRegistration;
  detail: string;
  trailing?: ReactNode;
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
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {detail}
        </AppText>
      </View>
      {trailing}
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
