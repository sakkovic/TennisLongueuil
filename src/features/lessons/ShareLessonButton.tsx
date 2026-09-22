import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';

import { shareLesson, type ShareableLesson } from './shareLesson';

/** Header button that opens the share sheet for a lesson. */
export function ShareLessonButton({ lesson }: { lesson: ShareableLesson }) {
  const { t, locale } = useI18n();
  return (
    <Pressable
      onPress={() => void shareLesson(lesson, locale)}
      accessibilityRole="button"
      accessibilityLabel={t('shareLesson')}
      hitSlop={12}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name="share-outline" size={22} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: spacing.xs },
  pressed: { opacity: 0.6 },
});
