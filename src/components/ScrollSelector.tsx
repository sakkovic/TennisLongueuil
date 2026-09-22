import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { colors, radius, spacing, stroke } from '@/constants/theme';

import { AppText } from './AppText';

export interface ScrollSelectorOption<T> {
  value: T;
  /** Main line, e.g. "Mon" or "6:00". */
  label: string;
  /** Second line, e.g. "Sep 22" or "PM". */
  sublabel?: string;
  /** Read out instead of `label sublabel`, for screen readers. */
  accessibilityLabel?: string;
}

interface ScrollSelectorProps<T> {
  label: string;
  options: ScrollSelectorOption<T>[];
  value: T;
  onChange: (value: T) => void;
  itemWidth?: number;
  /** Hide the field label when the page title already names the control. */
  hideLabel?: boolean;
  error?: string;
}

const GAP = spacing.sm;

/**
 * A single-select row that scrolls sideways. Arrows step one option at a time
 * so the coach never has to fight the page scroll; the strip still snaps, and
 * on web the mouse wheel moves the row sideways instead of the page.
 */
export function ScrollSelector<T extends string | number>({
  label,
  options,
  value,
  onChange,
  itemWidth = 72,
  hideLabel = false,
  error,
}: ScrollSelectorProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const hasScrolled = useRef(false);
  const scrollX = useRef(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const stride = itemWidth + GAP;

  useEffect(() => {
    if (selectedIndex < 0 || viewportWidth === 0) return;
    const centred = selectedIndex * stride - viewportWidth / 2 + itemWidth / 2;
    scrollRef.current?.scrollTo({
      x: Math.max(0, centred),
      animated: hasScrolled.current,
    });
    hasScrolled.current = true;
  }, [selectedIndex, viewportWidth, itemWidth, stride]);

  const step = (direction: -1 | 1) => {
    const next = selectedIndex + direction;
    if (next < 0 || next >= options.length) return;
    onChange(options[next].value);
  };

  return (
    <View
      style={styles.container}
      // On web, a wheel over this row should move the days/times, not the page.
      {...(Platform.OS === 'web'
        ? {
            onWheel: (event: { deltaY: number; preventDefault: () => void }) => {
              event.preventDefault();
              scrollRef.current?.scrollTo({
                x: Math.max(0, scrollX.current + event.deltaY),
                animated: false,
              });
            },
          }
        : null)}
    >
      {hideLabel ? null : (
        <AppText variant="label" tone="muted">
          {label}
        </AppText>
      )}
      <View style={styles.row}>
        <StepArrow
          direction="back"
          disabled={selectedIndex <= 0}
          onPress={() => step(-1)}
          label={`Previous ${label}`}
        />
        <ScrollView
          ref={scrollRef}
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          disableIntervalMomentum
          decelerationRate="fast"
          snapToInterval={stride}
          snapToAlignment="center"
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.stripViewport}
          contentContainerStyle={styles.strip}
          onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
          onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            scrollX.current = event.nativeEvent.contentOffset.x;
          }}
          scrollEventThrottle={16}
          accessibilityRole="radiogroup"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={String(option.value)}
                onPress={() => onChange(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={
                  option.accessibilityLabel ??
                  `${option.label}${option.sublabel ? ` ${option.sublabel}` : ''}`
                }
                style={[styles.item, { width: itemWidth }, selected && styles.itemSelected]}
              >
                <AppText variant="bodyStrong" tone={selected ? 'default' : 'muted'}>
                  {option.label}
                </AppText>
                {option.sublabel ? (
                  <AppText variant="caption" tone={selected ? 'default' : 'muted'}>
                    {option.sublabel}
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
        <StepArrow
          direction="forward"
          disabled={selectedIndex < 0 || selectedIndex >= options.length - 1}
          onPress={() => step(1)}
          label={`Next ${label}`}
        />
      </View>
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function StepArrow({
  direction,
  disabled,
  onPress,
  label,
}: {
  direction: 'back' | 'forward';
  disabled: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.arrow,
        pressed && styles.arrowPressed,
        disabled && styles.arrowDisabled,
      ]}
    >
      <Ionicons
        name={direction === 'back' ? 'chevron-back' : 'chevron-forward'}
        size={22}
        color={colors.primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stripViewport: { flex: 1, minWidth: 0 },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
    paddingVertical: spacing.xxs,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    height: 56,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: stroke,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  itemSelected: { backgroundColor: colors.lime, borderColor: colors.lime },
  arrow: {
    width: 40,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: stroke,
    borderColor: colors.border,
  },
  arrowPressed: { backgroundColor: colors.border },
  arrowDisabled: { opacity: 0.35 },
});
