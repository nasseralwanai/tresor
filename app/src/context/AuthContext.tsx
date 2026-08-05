/**
 * AuthContext — Supabase Auth provider for Trésor.
 *
 * Uses email/password auth (phone OTP requires Twilio, skipped for local dev).
 * Listens to onAuthStateChange, exposes session/user/profile, and provides
 * signIn, signUp, signOut functions.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getProfile } from '@/lib/profile';
import type { Profile } from '@/types';

export interface AuthContextValue {
  /** True while the initial session check is in flight. */
  loading: boolean;
  /** Current Supabase auth session, or null if unauthenticated. */
  session: Session | null;
  /** Current auth user, or null. */
  user: User | null;
  /** Current user's profile, or null if not loaded / no profile. */
  profile: Profile | null;
  /** Refresh the profile from the DB. */
  refreshProfile: () => Promise<void>;
  /** Sign in with email + password. */
  signIn: (email: string, password: string) => Promise<void>;
  /** Sign up with email + password. */
  signUp: (email: string, password: string) => Promise<void>;
  /** Sign out. */
  signOut: () => Promise<void>;
  /**
   * Initiate phone OTP sign-in.
   * NOTE: Phone OTP requires Twilio configured in Supabase. For local dev,
   * this is a no-op stub. Use signIn with email/password instead.
   */
  signInWithPhone: (phone: string) => Promise<void>;
  /**
   * Verify an OTP code.
   * NOTE: Stub for local dev — always returns true.
   */
  verifyOtp: (phone: string, token: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const user = session?.user ?? null;

  // Fetch the profile for a given user ID
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const p = await getProfile(userId);
      setProfile(p);
    } catch (e) {
      console.warn('[auth] Failed to load profile:', e);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await loadProfile(user.id);
    }
  }, [user?.id, loadProfile]);

  // Listen to auth state changes
  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      if (initialSession?.user?.id) {
        loadProfile(initialSession.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // If email confirmation is disabled (local dev), session is set immediately
    if (data.session) {
      setSession(data.session);
    }
  }, []);

  const signOut = useCallback(async () => {
    setProfile(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  // Phone OTP — sends a 6-digit code via Twilio SMS (configured in Supabase).
  const signInWithPhone = useCallback(async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      console.error('[auth] signInWithPhone error:', error);
      throw error;
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    if (error) {
      console.error('[auth] verifyOtp error:', error);
      throw error;
    }
    // On success, onAuthStateChange will fire and update the session.
    return Boolean(data.session || data.user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user,
      profile,
      refreshProfile,
      signIn,
      signUp,
      signOut,
      signInWithPhone,
      verifyOtp,
    }),
    [loading, session, user, profile, refreshProfile, signIn, signUp, signOut, signInWithPhone, verifyOtp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook to access the auth context. Must be used within an AuthProvider. */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
}
