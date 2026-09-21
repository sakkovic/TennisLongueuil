import type { Session, User } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { fetchMyProfile } from '@/features/profile/api';
import { queryKeys } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import type { Member } from '@/types/models';

/**
 * Where the member is in the app lifecycle. The root navigator maps each
 * status to exactly one accessible route group.
 */
export type AppStatus =
  | 'restoring' // reading the stored session
  | 'signedOut'
  | 'passwordRecovery' // signed in with a reset code; must choose a new password
  | 'loadingProfile'
  | 'profileError'
  | 'profileMissing'
  | 'inactive'
  | 'player'
  | 'admin';

interface AuthContextValue {
  status: AppStatus;
  session: Session | null;
  user: User | null;
  profile: Member | null;
  lastKnownProfile: Member | null;
  profileError: unknown;
  retryProfile: () => void;
  isRetryingProfile: boolean;
  finishPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    // INITIAL_SESSION fires once the stored session has been read.
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setRestoring(false);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
        // Never show one member's cached data to the next.
        queryClient.clear();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user.id;
  const profileQuery = useQuery({
    queryKey: queryKeys.myProfile(userId),
    queryFn: fetchMyProfile,
    enabled: Boolean(userId),
  });

  const profile = profileQuery.data ?? null;
  // Screens that are being unmounted after sign-out can render once more with
  // the new (empty) auth state; they keep seeing the last known profile.
  const [lastKnownProfile, setLastKnownProfile] = useState<Member | null>(null);
  if (profile && profile !== lastKnownProfile) setLastKnownProfile(profile);

  const status: AppStatus = useMemo(() => {
    if (restoring) return 'restoring';
    if (!session) return 'signedOut';
    if (passwordRecovery) return 'passwordRecovery';
    if (profileQuery.data === undefined) {
      return profileQuery.isError ? 'profileError' : 'loadingProfile';
    }
    if (!profile) return 'profileMissing';
    if (!profile.active) return 'inactive';
    return profile.role === 'admin' ? 'admin' : 'player';
  }, [restoring, session, passwordRecovery, profileQuery.data, profileQuery.isError, profile]);

  const { refetch } = profileQuery;
  const retryProfile = useCallback(() => {
    void refetch();
  }, [refetch]);
  const finishPasswordRecovery = useCallback(() => setPasswordRecovery(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      profile,
      lastKnownProfile: profile ?? lastKnownProfile,
      profileError: profileQuery.error,
      retryProfile,
      isRetryingProfile: profileQuery.isFetching,
      finishPasswordRecovery,
    }),
    [
      status,
      session,
      profile,
      lastKnownProfile,
      profileQuery.error,
      profileQuery.isFetching,
      retryProfile,
      finishPasswordRecovery,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

/** The signed-in member's profile. Only use below the role-guarded routes. */
export function useCurrentMember(): Member {
  const { lastKnownProfile } = useAuth();
  if (!lastKnownProfile) throw new Error('useCurrentMember requires a loaded profile');
  return lastKnownProfile;
}
