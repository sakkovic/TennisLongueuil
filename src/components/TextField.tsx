import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, stroke, typography } from '@/constants/theme';

import { AppText } from './AppText';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  ref?: Ref<TextInput>;
}

export function TextField({
  label,
  error,
  hint,
  style,
  ref,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.textSubtle}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        keyboardAppearance="light"
        maxFontSizeMultiplier={1.4}
        multiline={multiline}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.focused,
          Boolean(error) && styles.invalid,
          style,
        ]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="subtle">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs + 2 },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: stroke,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    minHeight: 50,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top', paddingTop: spacing.md },
  focused: { borderColor: colors.primary },
  invalid: { borderColor: colors.danger },
});
