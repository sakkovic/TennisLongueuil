import type { NativeStackNavigationOptions } from 'expo-router';
import type { BottomTabNavigationOptions } from 'expo-router/js-tabs';

import { colors, fonts } from './theme';

/** Ink bar, white title — same look on tab roots and pushed screens. */
export const inkHeader = {
  headerTintColor: colors.onNavy,
  headerTitleStyle: { color: colors.onNavy, fontFamily: fonts.bold, fontSize: 17 },
  headerStyle: { backgroundColor: colors.header },
  headerShadowVisible: false,
};

/** Shared header style for tab stacks and pushed screens (details, forms). */
export const stackScreenOptions: NativeStackNavigationOptions = {
  ...inkHeader,
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: { backgroundColor: colors.background },
};

export const tabScreenOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11 },
};
