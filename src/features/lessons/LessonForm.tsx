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
import { TextField } from '@/components/TextField';
import {
  MAX_COURTS,
  MAX_DESCRIPTION_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_COURTS,
} from '@/constants/lessons';
import { colors, radius, spacing } from '@/constants/theme';
import { useLevels } from '@/features/levels/hooks';
import { capacityForCourts, formatPlayerCount } from '@/utils/capacity';
import { combineDateAndTime } from '@/utils/date';

import type { LessonInput } from './api';
import { createLessonFormSchema, toLessonInput, type LessonFormValues } from './lessonFormSchema';

interface LessonFormProps {
  initialValues: LessonFormValues;
  /** New lessons (and edits of lessons that have not started) must start in the future. */
  requireFutureStart: boolean;
  submitLabel: string;
  submitting: boolean;
  submitError?: string | null;
  onSubmit: (input: LessonInput) => void;
}

export function LessonForm({
  initialValues,
  requireFutureStart,
  submitLabel,
  submitting,
  submitError,
  onSubmit,
}: LessonFormProps) {
  const { data: levels } = useLevels();
  const schema = useMemo(
    () => createLessonFormSchema({ requireFutureStart }),
    [requireFutureStart],
  );
  const { control, handleSubmit, setValue, getValues, formState } = useForm<LessonFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });
  const { errors } = formState;

  const courtCount = useWatch({ control, name: 'courtCount' });
  const hasDeadline = useWatch({ control, name: 'hasDeadline' });
  const capacity = capacityForCourts(courtCount);

  const levelOptions = [
    { value: null, label: 'All levels' },
    ...(levels ?? [])
      .filter((level) => level.active)
      .map((level) => ({ value: level.id, label: level.name })),
  ];

  const submit = handleSubmit((values) => onSubmit(toLessonInput(values)));

  return (
    <ScreenContainer
      keyboard
      footer={<Button label={submitLabel} onPress={submit} loading={submitting} />}
    >
      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <TextField
            label="Title"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            maxLength={MAX_TITLE_LENGTH}
            error={errors.title?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="date"
        render={({ field }) => (
          <DateTimeField
            label="Date"
            mode="date"
            value={field.value}
            onChange={(day) =>
              field.onChange(new Date(day.getFullYear(), day.getMonth(), day.getDate()))
            }
            error={errors.date?.message}
          />
        )}
      />

      <View style={styles.row}>
        <View style={styles.flex}>
          <Controller
            control={control}
            name="startTime"
            render={({ field }) => (
              <DateTimeField
                label="Start time"
                mode="time"
                value={field.value}
                onChange={(time) => {
                  // Keep the same duration when the start moves.
                  const duration =
                    getValues('endTime').getTime() - getValues('startTime').getTime();
                  field.onChange(time);
                  if (duration > 0) {
                    setValue('endTime', new Date(time.getTime() + duration), {
                      shouldValidate: true,
                    });
                  }
                }}
                error={errors.startTime?.message}
              />
            )}
          />
        </View>
        <View style={styles.flex}>
          <Controller
            control={control}
            name="endTime"
            render={({ field }) => (
              <DateTimeField
                label="End time"
                mode="time"
                value={field.value}
                onChange={field.onChange}
                error={errors.endTime?.message}
              />
            )}
          />
        </View>
      </View>

      <Controller
        control={control}
        name="location"
        render={({ field }) => (
          <TextField
            label="Location"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            maxLength={MAX_LOCATION_LENGTH}
            error={errors.location?.message}
          />
        )}
      />

      <Card>
        <Controller
          control={control}
          name="courtCount"
          render={({ field }) => (
            <Stepper
              label="Number of courts"
              value={field.value}
              min={MIN_COURTS}
              max={MAX_COURTS}
              onChange={field.onChange}
              formatValue={(value) => `${value} ${value === 1 ? 'court' : 'courts'}`}
            />
          )}
        />
        <View style={styles.capacity} accessibilityLiveRegion="polite">
          <AppText variant="label" tone="primary">
            Capacity: {formatPlayerCount(capacity)}
          </AppText>
          <AppText variant="caption" tone="muted">
            4 players per court
          </AppText>
        </View>
        {errors.courtCount?.message ? (
          <AppText variant="caption" tone="danger">
            {errors.courtCount.message}
          </AppText>
        ) : null}
      </Card>

      <Controller
        control={control}
        name="playerLevelId"
        render={({ field }) => (
          <ChipGroup
            label="Level (informational)"
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
            label="Description (optional)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            multiline
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder="Drills, match play, what to bring…"
            error={errors.description?.message}
          />
        )}
      />

      <Card>
        <Controller
          control={control}
          name="registrationOpen"
          render={({ field }) => (
            <SwitchRow
              label="Registration open"
              description="Players can join while registration is open."
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="hasDeadline"
          render={({ field }) => (
            <SwitchRow
              label="Registration deadline"
              description="Stop registrations at a set time before the lesson."
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
        {hasDeadline ? (
          <Controller
            control={control}
            name="deadline"
            render={({ field }) => (
              <View style={styles.deadline}>
                <DateTimeField
                  label="Deadline date"
                  mode="date"
                  value={field.value}
                  onChange={(day) => field.onChange(combineDateAndTime(day, field.value))}
                />
                <DateTimeField
                  label="Deadline time"
                  mode="time"
                  value={field.value}
                  onChange={(time) => field.onChange(combineDateAndTime(field.value, time))}
                  error={errors.deadline?.message}
                />
              </View>
            )}
          />
        ) : null}
      </Card>

      {submitError ? <Banner tone="danger" message={submitError} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  capacity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  deadline: { gap: spacing.md },
});
