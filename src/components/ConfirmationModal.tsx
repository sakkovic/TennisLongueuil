import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';

import { AppText } from './AppText';
import { Button } from './Button';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Optional extra action between confirm and cancel (e.g. "Create all anyway"). */
  secondaryLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onSecondary?: () => void;
  destructive?: boolean;
  loading?: boolean;
  /** Error to show inside the sheet (e.g. the action failed). */
  error?: string | null;
  /** Extra content such as an optional reason field. */
  children?: ReactNode;
}

/** Bottom-sheet confirmation used before any consequential action. */
export function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Go back',
  secondaryLabel,
  onConfirm,
  onCancel,
  onSecondary,
  destructive = false,
  loading = false,
  error,
  children,
}: ConfirmationModalProps) {
  const insets = useSafeAreaInsets();
  const dismiss = () => {
    if (!loading) onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={dismiss}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
        >
          <View style={styles.backdrop} />
        </Pressable>
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
          {message ? <AppText tone="muted">{message}</AppText> : null}
          {children}
          {error ? (
            <View style={styles.error} accessibilityRole="alert">
              <AppText variant="label" tone="danger">
                {error}
              </AppText>
            </View>
          ) : null}
          <View style={styles.actions}>
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
            />
            {secondaryLabel && onSecondary ? (
              <Button
                label={secondaryLabel}
                variant="secondary"
                onPress={onSecondary}
                disabled={loading}
              />
            ) : null}
            <Button label={cancelLabel} variant="ghost" onPress={dismiss} disabled={loading} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.sm,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  actions: { gap: spacing.xs, marginTop: spacing.sm },
});
