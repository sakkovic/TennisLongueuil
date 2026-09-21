/* eslint-disable react-hooks/refs -- hidden web <input> is only used to call showPicker() */
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { createElement, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { formatLongDate, formatTime } from '@/utils/date';

import { AppText } from './AppText';

interface DateTimeFieldProps {
  label: string;
  mode: 'date' | 'time';
  value: Date;
  onChange: (value: Date) => void;
  error?: string;
  minimumDate?: Date;
}

interface WebInputElement {
  value: string;
  showPicker?: () => void;
  click: () => void;
}

/**
 * Compact date / time row. Tap it to open the system picker
 * (iOS compact control, Android dialog, browser calendar / clock on web).
 * The native web widgets are kept hidden so they cannot blow the layout.
 */
export function DateTimeField({
  label,
  mode,
  value,
  onChange,
  error,
  minimumDate,
}: DateTimeFieldProps) {
  const display = mode === 'date' ? formatLongDate(value) : formatTime(value);

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' ? (
        <View style={[styles.field, styles.iosField, Boolean(error) && styles.invalid]}>
          <AppText variant="label" tone="muted">
            {label}
          </AppText>
          <DateTimePicker
            value={value}
            mode={mode}
            display="compact"
            minuteInterval={5}
            minimumDate={minimumDate}
            accentColor={colors.primary}
            themeVariant="light"
            onValueChange={(_, date) => {
              if (date) onChange(date);
            }}
            accessibilityLabel={label}
          />
        </View>
      ) : Platform.OS === 'android' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${display}`}
          onPress={() =>
            DateTimePickerAndroid.open({
              value,
              mode,
              minimumDate,
              onValueChange: (_, date) => {
                if (date) onChange(date);
              },
            })
          }
          style={({ pressed }) => [
            styles.field,
            pressed && styles.pressed,
            Boolean(error) && styles.invalid,
          ]}
        >
          <FieldContent label={label} display={display} mode={mode} />
        </Pressable>
      ) : (
        <WebDateTimeInput
          label={label}
          mode={mode}
          value={value}
          onChange={onChange}
          error={error}
          display={display}
        />
      )}
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function FieldContent({
  label,
  display,
  mode,
}: {
  label: string;
  display: string;
  mode: 'date' | 'time';
}) {
  return (
    <>
      <View style={styles.flex}>
        <AppText variant="caption" tone="muted">
          {label}
        </AppText>
        <AppText variant="bodyStrong">{display}</AppText>
      </View>
      <Ionicons
        name={mode === 'date' ? 'calendar-outline' : 'time-outline'}
        size={20}
        color={colors.primary}
      />
    </>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

function WebDateTimeInput({
  label,
  mode,
  value,
  onChange,
  error,
  display,
}: DateTimeFieldProps & { display: string }) {
  const inputRef = useRef<WebInputElement | null>(null);

  const formatted =
    mode === 'date'
      ? `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
      : `${pad(value.getHours())}:${pad(value.getMinutes())}`;

  const commit = (input: string) => {
    const next = new Date(value);
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(input);
    if (mode === 'date' && dateMatch) {
      next.setFullYear(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
      onChange(next);
    } else if (mode === 'time' && timeMatch) {
      next.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
      onChange(next);
    }
  };

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    try {
      input.showPicker?.();
    } catch {
      input.click();
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${display}`}
      onPress={openPicker}
      style={({ pressed }) => [
        styles.field,
        pressed && styles.pressed,
        Boolean(error) && styles.invalid,
      ]}
    >
      <FieldContent label={label} display={display} mode={mode} />
      {createElement('input', {
        ref: (node: WebInputElement | null) => {
          inputRef.current = node;
        },
        type: mode === 'date' ? 'date' : 'time',
        value: formatted,
        step: mode === 'time' ? 900 : undefined,
        tabIndex: -1,
        'aria-hidden': true,
        onChange: (event: { target: { value: string } }) => commit(event.target.value),
        style: hiddenInputStyle,
      })}
    </Pressable>
  );
}

const hiddenInputStyle = {
  position: 'absolute' as const,
  opacity: 0,
  width: 0,
  height: 0,
  border: 'none',
  padding: 0,
  pointerEvents: 'none' as const,
};

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  flex: { flex: 1, gap: spacing.xxs },
  field: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  iosField: { justifyContent: 'space-between' },
  pressed: { backgroundColor: colors.border },
  invalid: { borderColor: colors.danger },
});
