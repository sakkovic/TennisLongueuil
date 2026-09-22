import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateTimeField } from '@/components/DateTimeField';
import { ChipGroup, Stepper, SwitchRow } from '@/components/FormControls';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScrollSelector, type ScrollSelectorOption } from '@/components/ScrollSelector';
import { SectionHeader } from '@/components/SectionHeader';
import { TextField } from '@/components/TextField';
import {
  DATE_PICKER_DAYS,
  DEADLINE_OFFSET_CHOICES,
  LESSON_DURATION_CHOICES,
  MAX_COURTS,
  MAX_DESCRIPTION_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_REPEAT_WEEKS,
  MAX_TITLE_LENGTH,
  MIN_COURTS,
  MIN_REPEAT_WEEKS,
  QUICK_START_MINUTES,
} from '@/constants/lessons';
import { colors, radius, spacing, stroke } from '@/constants/theme';
import { useLevels } from '@/features/levels/hooks';
import { useI18n } from '@/i18n';
import { useValidationMessage } from '@/i18n/validation';
import { capacityForCourts } from '@/utils/capacity';
import {
  addMinutes,
  atMinutesOfDay,
  combineDateAndTime,
  formatDuration,
  formatLeadTime,
  formatLongDate,
  formatMonthDayShort,
  formatShortDate,
  formatTime,
  formatTimeRange,
  formatWeekdayShort,
  minutesOfDay,
  startOfDay,
  toDateKey,
} from '@/utils/date';

import type { LessonInput } from './api';
import {
  createLessonFormSchema,
  occurrenceStarts,
  toLessonInputs,
  type LessonFormValues,
} from './lessonFormSchema';

interface LessonFormProps {
  initialValues: LessonFormValues;
  /** New lessons (and edits of lessons that have not started) must start in the future. */
  requireFutureStart: boolean;
  /** Only when creating: an existing lesson cannot be turned into a series. */
  allowRepeat?: boolean;
  submitLabel: string;
  submitting: boolean;
  submitError?: string | null;
  onSubmit: (inputs: LessonInput[]) => void;
}

/** Keeps a value that isn't one of the presets (e.g. an older lesson) selectable. */
function withCurrent(choices: number[], current: number): number[] {
  return choices.includes(current) ? choices : [...choices, current].sort((a, b) => a - b);
}

export function LessonForm({
  initialValues,
  requireFutureStart,
  allowRepeat = false,
  submitLabel,
  submitting,
  submitError,
  onSubmit,
}: LessonFormProps) {
  const { t, locale } = useI18n();
  const v = useValidationMessage();
  const { data: levels } = useLevels();
  const schema = useMemo(
    () => createLessonFormSchema({ requireFutureStart }),
    [requireFutureStart],
  );
  const { control, handleSubmit, formState } = useForm<LessonFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });
  const { errors } = formState;

  const date = useWatch({ control, name: 'date' });
  const startTime = useWatch({ control, name: 'startTime' });
  const durationMinutes = useWatch({ control, name: 'durationMinutes' });
  const courtCount = useWatch({ control, name: 'courtCount' });
  const deadlineOffsetMinutes = useWatch({ control, name: 'deadlineOffsetMinutes' });
  const repeatWeekly = useWatch({ control, name: 'repeatWeekly' });
  const repeatWeeks = useWatch({ control, name: 'repeatWeeks' });

  const start = combineDateAndTime(date, startTime);
  const end = addMinutes(start, durationMinutes);
  const deadline = addMinutes(start, -deadlineOffsetMinutes);
  const capacity = capacityForCourts(courtCount);
  const repeating = allowRepeat && repeatWeekly;
  const count = repeating ? repeatWeeks : 1;

  // The day row opens on today and runs a few months out, plus the lesson's own
  // day when editing one that falls outside that window.
  const dayOptions = useMemo<ScrollSelectorOption<string>[]>(() => {
    // date helpers read the current locale from a module-level setter.
    void locale;
    const today = startOfDay(new Date());
    const days = Array.from(
      { length: DATE_PICKER_DAYS },
      (_, offset) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset),
    );
    if (!days.some((day) => toDateKey(day) === toDateKey(date))) days.unshift(startOfDay(date));
    return days.map((day) => ({
      value: toDateKey(day),
      label: formatWeekdayShort(day),
      sublabel: formatMonthDayShort(day),
      accessibilityLabel: formatLongDate(day),
    }));
  }, [date, locale]);

  const timeChoices = withCurrent(QUICK_START_MINUTES, minutesOfDay(startTime));

  const levelOptions = [
    { value: null, label: t('allLevels') },
    ...(levels ?? [])
      .filter((level) => level.active)
      .map((level) => ({ value: level.id, label: level.name })),
  ];

  const seriesStarts = repeating
    ? occurrenceStarts({ ...initialValues, date, startTime, repeatWeekly: true, repeatWeeks })
    : [];
  const lastStart = seriesStarts[seriesStarts.length - 1];

  const submit = handleSubmit((values) =>
    onSubmit(toLessonInputs({ ...values, repeatWeekly: repeating })),
  );

  return (
    <ScreenContainer
      keyboard
      footer={
        <Button
          label={allowRepeat && count > 1 ? t('createNLessons', { count }) : submitLabel}
          onPress={submit}
          loading={submitting}
        />
      }
    >
      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <TextField
            label={t('title')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            maxLength={MAX_TITLE_LENGTH}
            error={v(errors.title?.message)}
          />
        )}
      />

      <Card>
        <SectionHeader title={t('when')} />
        <Controller
          control={control}
          name="date"
          render={({ field }) => (
            <>
              <DateTimeField
                label={t('date')}
                mode="date"
                value={field.value}
                onChange={field.onChange}
                minimumDate={requireFutureStart ? startOfDay(new Date()) : undefined}
                error={v(errors.date?.message)}
              />
              <ScrollSelector
                label={t('nearbyDays')}
                options={dayOptions}
                value={toDateKey(field.value)}
                onChange={(key) => {
                  const [year, month, day] = key.split('-').map(Number);
                  field.onChange(new Date(year, month - 1, day));
                }}
                itemWidth={72}
              />
            </>
          )}
        />

        <Controller
          control={control}
          name="startTime"
          render={({ field }) => (
            <>
              <DateTimeField
                label={t('startTime')}
                mode="time"
                value={field.value}
                onChange={field.onChange}
                error={v(errors.startTime?.message)}
              />
              <ChipGroup
                label={t('usualStartTimes')}
                options={timeChoices.map((minutes) => ({
                  value: minutes,
                  label: formatTime(atMinutesOfDay(field.value, minutes)),
                }))}
                value={minutesOfDay(field.value)}
                onChange={(minutes) => field.onChange(atMinutesOfDay(field.value, minutes))}
              />
            </>
          )}
        />

        <Controller
          control={control}
          name="durationMinutes"
          render={({ field }) => (
            <ChipGroup
              label={t('length')}
              options={withCurrent(LESSON_DURATION_CHOICES, field.value).map((minutes) => ({
                value: minutes,
                label: formatDuration(minutes),
              }))}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        {errors.durationMinutes?.message ? (
          <AppText variant="caption" tone="danger">
            {v(errors.durationMinutes.message)}
          </AppText>
        ) : null}

        <View style={styles.summary} accessibilityLiveRegion="polite">
          <AppText variant="label" tone="primary">
            {formatLongDate(start)}
          </AppText>
          <AppText variant="caption" tone="muted">
            {formatTimeRange(start, end)}
          </AppText>
        </View>
      </Card>

      {allowRepeat ? (
        <Card>
          <SectionHeader title={t('repeat')} />
          <Controller
            control={control}
            name="repeatWeekly"
            render={({ field }) => (
              <View style={styles.repeatButtons}>
                <Button
                  label={t('weekly')}
                  icon="repeat-outline"
                  variant={field.value ? 'primary' : 'secondary'}
                  size="md"
                  fullWidth={false}
                  style={styles.flex}
                  onPress={() => field.onChange(true)}
                />
                <Button
                  label={t('oneLesson')}
                  icon="calendar-outline"
                  variant={field.value ? 'secondary' : 'primary'}
                  size="md"
                  fullWidth={false}
                  style={styles.flex}
                  onPress={() => field.onChange(false)}
                />
              </View>
            )}
          />
          {repeatWeekly ? (
            <>
              <Controller
                control={control}
                name="repeatWeeks"
                render={({ field }) => (
                  <Stepper
                    label={t('numberOfWeeks')}
                    value={field.value}
                    min={MIN_REPEAT_WEEKS}
                    max={MAX_REPEAT_WEEKS}
                    onChange={field.onChange}
                  />
                )}
              />
              <View style={styles.summary} accessibilityLiveRegion="polite">
                <AppText variant="label" tone="primary">
                  {t('nLessons', { count })}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {formatShortDate(start)} → {lastStart ? formatShortDate(lastStart) : ''}
                </AppText>
              </View>
              {errors.repeatWeeks?.message ? (
                <AppText variant="caption" tone="danger">
                  {v(errors.repeatWeeks.message)}
                </AppText>
              ) : null}
              <AppText variant="caption" tone="subtle">
                {t('weeklyHint')}
              </AppText>
            </>
          ) : (
            <AppText variant="caption" tone="muted">
              {t('createsSingle', { date: formatLongDate(start) })}
            </AppText>
          )}
        </Card>
      ) : null}

      <Controller
        control={control}
        name="location"
        render={({ field }) => (
          <TextField
            label={t('location')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            maxLength={MAX_LOCATION_LENGTH}
            error={v(errors.location?.message)}
          />
        )}
      />

      <Card>
        <Controller
          control={control}
          name="courtCount"
          render={({ field }) => (
            <Stepper
              label={t('numberOfCourts')}
              value={field.value}
              min={MIN_COURTS}
              max={MAX_COURTS}
              onChange={field.onChange}
              formatValue={(value) => t(value === 1 ? 'courtOne' : 'courtOther', { count: value })}
            />
          )}
        />
        <View style={styles.summary} accessibilityLiveRegion="polite">
          <AppText variant="label" tone="primary">
            {t('capacityLabel', {
              count: t(capacity === 1 ? 'playerOne' : 'playerOther', { count: capacity }),
            })}
          </AppText>
          <AppText variant="caption" tone="muted">
            {t('playersPerCourt')}
          </AppText>
        </View>
        {errors.courtCount?.message ? (
          <AppText variant="caption" tone="danger">
            {v(errors.courtCount.message)}
          </AppText>
        ) : null}
      </Card>

      <Controller
        control={control}
        name="playerLevelId"
        render={({ field }) => (
          <ChipGroup
            label={t('levelInformational')}
            options={levelOptions}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField
            label={t('descriptionOptional')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            multiline
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder={t('descriptionPlaceholder')}
            error={v(errors.description?.message)}
          />
        )}
      />

      <Card>
        <SectionHeader title={t('registration')} />
        <Controller
          control={control}
          name="registrationOpen"
          render={({ field }) => (
            <SwitchRow
              label={t('registrationOpen')}
              description={t('registrationOpenHint')}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="deadlineOffsetMinutes"
          render={({ field }) => (
            <ChipGroup
              label={t('closesBefore')}
              options={withCurrent(DEADLINE_OFFSET_CHOICES, field.value).map((minutes) => ({
                value: minutes,
                label: formatLeadTime(minutes),
              }))}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <AppText variant="caption" tone="muted">
          {repeating
            ? t('eachCloses', {
                lead: formatLeadTime(deadlineOffsetMinutes),
                date: formatLongDate(deadline),
                time: formatTime(deadline),
              })
            : t('closesAt', {
                date: formatLongDate(deadline),
                time: formatTime(deadline),
              })}
        </AppText>
        {deadline <= new Date() ? (
          <Banner
            tone="warning"
            message={repeating ? t('deadlinePassedFirst') : t('deadlinePassed')}
          />
        ) : null}
        {errors.deadlineOffsetMinutes?.message ? (
          <AppText variant="caption" tone="danger">
            {v(errors.deadlineOffsetMinutes.message)}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="subtle">
          {t('registrationRuleHint')}
        </AppText>
      </Card>

      {submitError ? <Banner tone="danger" message={submitError} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  repeatButtons: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    borderWidth: stroke,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
