import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { isBusinessError } from '@/utils/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Business-rule errors (e.g. NOT_AUTHORIZED) will not succeed on retry.
      retry: (failureCount, error) => !isBusinessError(error) && failureCount < 2,
    },
    mutations: {
      retry: false,
    },
  },
});

// React Native has no window focus: refetch stale queries when the app returns
// to the foreground instead.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    focusManager.setFocused(state === 'active');
  });
}

export const queryKeys = {
  myProfile: (userId: string | undefined) => ['profile', 'me', userId] as const,
  levels: ['levels'] as const,
  lessons: ['lessons'] as const,
  upcomingLessons: ['lessons', 'upcoming'] as const,
  pastLessons: ['lessons', 'past'] as const,
  lesson: (lessonId: string) => ['lessons', 'detail', lessonId] as const,
  myRegistrations: (userId: string | undefined) => ['registrations', 'mine', userId] as const,
  members: ['members'] as const,
  member: (memberId: string) => ['members', 'detail', memberId] as const,
  memberRegistrations: (memberId: string) => ['registrations', 'member', memberId] as const,
};
