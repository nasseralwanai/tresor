/**
 * Profile API — CRUD for the `profiles` table via Supabase.
 *
 * RLS: users can read their own profile and profiles of circle members,
 * and can insert/update only their own row.
 *
 * Note: the `profiles` table uses `display_name` (not `full_name`).
 * The `createProfile` function maps the `fullName` param → `display_name` column.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import type { Profile, ProfileResult } from '@/types';

/**
 * Create a profile for a newly authenticated user.
 * Uses upsert to handle the case where the profile already exists.
 * Maps `fullName` → `display_name` column.
 * `phone` is required by the table schema (NOT NULL) — empty string fallback.
 */
export async function createProfile(params: {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  bio?: string | null;
}): Promise<ProfileResult> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: params.userId,
        display_name: params.fullName,
        avatar_url: params.avatarUrl ?? null,
        phone: params.phone ?? '',
        bio: params.bio ?? null,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) throw error;
  return { profile: data };
}

/**
 * Fetch a user's profile by ID.
 * Returns null if not found.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Update the current user's profile.
 */
export async function updateProfile(
  userId: string,
  updates: {
    display_name?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    phone?: string;
    push_token?: string | null;
  }
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Upload an avatar image to Supabase Storage and return the public URL.
 * Compresses with expo-image-manipulator (max 512×512, JPEG 0.8).
 * Uses the 'avatars' bucket (creates it if missing).
 */
export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  await ensureBucket('avatars', true);

  // Compress + resize the image
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 512, height: 512 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  const response = await fetch(manipulated.uri);
  const blob = await response.blob();

  const fileName = `${userId}/avatar.jpeg`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
  return data.publicUrl;
}

/**
 * Ensure a storage bucket exists. Creates it if missing.
 * If public=true, the bucket is publicly readable.
 */
export async function ensureBucket(name: string, publicBucket: boolean = false): Promise<void> {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;

  const exists = buckets.some((b) => b.id === name);
  if (exists) return;

  const { error: createError } = await supabase.storage.createBucket(name, {
    public: publicBucket,
  });

  if (createError) throw createError;
}
