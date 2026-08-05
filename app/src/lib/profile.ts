/**
 * Profile API interface.
 *
 * TODO(backend): Sonny is implementing the real profile CRUD via Supabase
 * RLS-protected tables (`profiles`). Replace the placeholders below with
 * real `supabase.from('profiles')` calls.
 *
 * Expected backend contract:
 *   - Table: profiles (id uuid PK, full_name text, avatar_url text, phone text, circle_id uuid)
 *   - RLS: users can read/update only their own row
 *   - Storage bucket: 'avatars' for profile image uploads
 */

import type { Profile, ProfileResult } from '@/types';

/**
 * Create or update the current user's profile.
 *
 * Placeholder: simulates a network call and returns a mock profile.
 *
 * TODO(backend): Replace with:
 *   const { data, error } = await supabase
 *     .from('profiles')
 *     .upsert({
 *       id: userId,
 *       full_name: fullName,
 *       avatar_url: avatarUrl,
 *       phone: phone,
 *     })
 *     .select()
 *     .single();
 *   if (error) throw error;
 *   return { profile: data };
 */
export async function createProfile(params: {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  phone?: string | null;
}): Promise<ProfileResult> {
  // Simulate latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  // TODO(backend): Remove mock — real upsert happens via Supabase.
  const profile: Profile = {
    id: params.userId,
    full_name: params.fullName,
    avatar_url: params.avatarUrl ?? null,
    phone: params.phone ?? null,
    circle_id: null,
    created_at: new Date().toISOString(),
  };

  return { profile };
}

/**
 * Fetch the current user's profile.
 *
 * TODO(backend): Replace with:
 *   const { data, error } = await supabase
 *     .from('profiles')
 *     .select('*')
 *     .eq('id', userId)
 *     .single();
 *   if (error) throw error;
 *   return data;
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  // TODO(backend): Remove mock.
  return null;
}

/**
 * Upload an avatar image to Supabase Storage and return the public URL.
 *
 * TODO(backend): Replace with:
 *   const fileExt = uri.split('.').pop();
 *   const fileName = `${userId}/avatar.${fileExt}`;
 *   const { error: uploadError } = await supabase.storage
 *     .from('avatars')
 *     .upload(fileName, file, { upsert: true });
 *   if (uploadError) throw uploadError;
 *   const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
 *   return data.publicUrl;
 */
export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // TODO(backend): Return real storage public URL.
  return uri;
}
