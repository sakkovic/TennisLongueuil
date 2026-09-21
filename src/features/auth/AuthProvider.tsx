import type { Session, User } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { fetchMyProfile } from '@/features/profile/api';
import { queryKeys } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import type { Member } from '@/types/models';
import { getErrorMessage, logError } from '@/utils/errors';

import { parseRecoveryLink } from './recoveryLink';

/**
 * Where the member is in the app lifecycle. The root navigator maps each
 * status to exactly one accessible route group.
 */
export type AppStatus =
  | 'restoring' // reading the stored session
  | 'signedOut'
  | 'passwordRecovery' // signed in from a reset link or code; must choose a new password
  | 'loadingProfile'
  | 'profileError'
  | 'profileMissing'
  | 'pendingApproval' // signed up, waiting for the coach to approve the account
  | 'inactive' // approved once, then deactivated by the coach
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
  /** Problem with a password-reset link (e.g. expired), shown on the login screen. */
  recoveryError: string | null;
  clearRecoveryError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [initialLinkChecked, setInitialLinkChecked] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const handledLinks = useRef(new Set<string>());

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

  // Password-reset emails link back into the app with a recovery session in the URL.
  useEffect(() => {
    let active = true;
    const handleLink = async (url: string | null) => {
      if (!url || handledLinks.current.has(url)) return;
      const result = parseRecoveryLink(url);
      if (!result) return;
      handledLinks.current.add(url);
      if (result.kind === 'error') {
        setRecoveryError(result.message);
        return;
      }
      setRecoveryError(null);
      setPasswordRecovery(true);
      const { error } = await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
      if (error) {
        logError('recoveryLink', error);
        setPasswordRecovery(false);
        setRecoveryError(getErrorMessage(error));
      }
    };

    void Linking.getInitialURL()
      .then(handleLink)
      .finally(() => {
        if (active) setInitialLinkChecked(true);
      });
    const subscription = Linking.addEventListener('url', ({ url }) => void handleLink(url));
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

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
    if (restoring || !initialLinkChecked) return 'restoring';
    if (!session) return 'signedOut';
    if (passwordRecovery) return 'passwordRecovery';
    if (profileQuery.data === undefined) {
      return profileQuery.isError ? 'profileError' : 'loadingProfile';
    }
    if (!profile) return 'profileMissing';
    if (!profile.active) return profile.approved_at ? 'inactive' : 'pendingApproval';
    return profile.role === 'admin' ? 'admin' : 'player';
  }, [
    restoring,
    initialLinkChecked,
    session,
    passwordRecovery,
    profileQuery.data,
    profileQuery.isError,
    profile,
  ]);

  const { refetch } = profileQuery;
  const retryProfile = useCallback(() => {
    void refetch();
  }, [refetch]);
  const finishPasswordRecovery = useCallback(() => setPasswordRecovery(false), []);
  const clearRecoveryError = useCallback(() => setRecoveryError(null), []);

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
      recoveryError,
      clearRecoveryError,
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
      recoveryError,
      clearRecoveryError,
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
