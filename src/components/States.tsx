import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { useT } from '@/i18n';
import { getErrorMessage } from '@/utils/errors';

import { AppText } from './AppText';
import { Button } from './Button';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon = 'tennisball-outline',
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <AppText variant="heading" style={styles.center}>
        {title}
      </AppText>
      {message ? (
        <AppText tone="muted" style={styles.center}>
          {message}
        </AppText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

interface ErrorStateProps {
  error?: unknown;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function ErrorState({ error, message, onRetry, retrying }: ErrorStateProps) {
  const t = useT();
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={[styles.iconCircle, styles.errorCircle]}>
        <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
      </View>
      <AppText variant="heading" style={styles.center}>
        {t('couldntLoad')}
      </AppText>
      <AppText tone="muted" style={styles.center}>
        {message ?? getErrorMessage(error)}
      </AppText>
      {onRetry ? (
        <View style={styles.action}>
          <Button
            label={t('tryAgain')}
            icon="refresh"
            variant="secondary"
            onPress={onRetry}
            loading={retrying}
            fullWidth={false}
          />
        </View>
      ) : null}
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const t = useT();
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? t('loading')}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <AppText tone="muted">{label}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  errorCircle: { backgroundColor: colors.dangerSoft },
  center: { textAlign: 'center' },
  action: { marginTop: spacing.md },
});
