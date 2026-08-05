/**
 * useAuth — authentication context hook.
 *
 * TODO(backend): Sonny is implementing the real auth context using
 * Supabase Auth (phone OTP). This placeholder returns loading=true
 * so the root layout defaults to showing the (auth) group.
 *
 * Real implementation will:
 *   1. Listen to supabase.auth.onAuthStateChange
 *   2. Expose session, user, profile, loading, signInWithPhone, verifyOtp, signOut
 *   3. Persist session via AsyncStorage (already configured in supabase.ts)
 *
 * Replace this entire file with the real implementation when ready.
 * The exported interface (AuthContextValue) is the contract the UI depends on.
 */

import { useState, useCallback, useEffect } from 'react';
import type { AuthSession, Profile } from '@/types';

export interface AuthContextValue {
  /** True while the initial session check is in flight. */
  loading: boolean;
  /** Current auth session, or null if unauthenticated. */
  session: AuthSession | null;
  /** Current user's profile, or null if not yet loaded / no profile. */
  profile: Profile | null;
  /** Initiate phone OTP sign-in. TODO(backend): wire to supabase.auth.signInWithOtp */
  signInWithPhone: (phone: string) => Promise<void>;
  /** Verify the OTP code. TODO(backend): wire to supabase.auth.verifyOtp */
  verifyOtp: (phone: string, token: string) => Promise<boolean>;
  /** Sign out. TODO(backend): wire to supabase.auth.signOut */
  signOut: () => Promise<void>;
}

/**
 * Placeholder auth hook.
 *
 * TODO(backend): Replace with a real React Context + Provider that
 * wraps the app in the root layout. For now, returns loading=true
 * so the UI defaults to the auth flow.
 */
export function useAuth(): AuthContextValue {
  const [loading] = useState(true);

  // TODO(backend): Listen to supabase.auth.onAuthStateChange
  useEffect(() => {
    // Real implementation will:
    //   const { data: { subscription } } = supabase.auth.onAuthStateChange(...)
    //   return () => subscription.unsubscribe();
  }, []);

  const signInWithPhone = useCallback(async (_phone: string) => {
    // TODO(backend): const { error } = await supabase.auth.signInWithOtp({ phone })
    // if (error) throw error;
    await new Promise((resolve) => setTimeout(resolve, 600));
  }, []);

  const verifyOtp = useCallback(async (_phone: string, _token: string) => {
    // TODO(backend): const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
    // if (error) throw error;
    // return !!data.session;
    await new Promise((resolve) => setTimeout(resolve, 600));
    return true; // placeholder: always succeeds
  }, []);

  const signOut = useCallback(async () => {
    // TODO(backend): await supabase.auth.signOut()
  }, []);

  return {
    loading,
    session: null,
    profile: null,
    signInWithPhone,
    verifyOtp,
    signOut,
  };
}
