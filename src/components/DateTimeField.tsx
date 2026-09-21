import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
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

/**
 * Native date / time picker:
 *  - iOS: the compact system picker inline in the row
 *  - Android: a field that opens the Material dialog
 *  - Web (development only): a text input (YYYY-MM-DD or HH:MM)
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
            onValueChange={(_, date) => onChange(date)}
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
              onValueChange: (_, date) => onChange(date),
            })
          }
          style={({ pressed }) => [
            styles.field,
            pressed && styles.pressed,
            Boolean(error) && styles.invalid,
          ]}
        >
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
        </Pressable>
      ) : (
        <WebDateTimeInput label={label} mode={mode} value={value} onChange={onChange} />
      )}
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

function WebDateTimeInput({ label, mode, value, onChange }: Omit<DateTimeFieldProps, 'error'>) {
  const format = (date: Date) =>
    mode === 'date'
      ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      : `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const [text, setText] = useState(format(value));

  const commit = (input: string) => {
    setText(input);
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

  return (
    <View style={styles.webContainer}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <TextInput
        value={text}
        onChangeText={commit}
        placeholder={mode === 'date' ? 'YYYY-MM-DD' : 'HH:MM'}
        accessibilityLabel={label}
        style={styles.webInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  flex: { flex: 1, gap: spacing.xxs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  iosField: { justifyContent: 'space-between' },
  pressed: { backgroundColor: colors.surfaceMuted },
  invalid: { borderColor: colors.danger },
  webContainer: { gap: spacing.xs + 2 },
  webInput: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md + 2,
    minHeight: 50,
  },
});
