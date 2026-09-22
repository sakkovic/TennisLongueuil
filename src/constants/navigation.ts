import type { NativeStackNavigationOptions } from 'expo-router';
import type { BottomTabNavigationOptions } from 'expo-router/js-tabs';

import { colors, fonts } from './theme';

/** Shared header style for pushed screens (details, forms). */
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 19 },
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: { backgroundColor: colors.background },
};

export const tabScreenOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.borderStrong,
    borderTopWidth: 1,
    height: 64,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
};
