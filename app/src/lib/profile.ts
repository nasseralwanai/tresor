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
 * `phone` is optional — null for email/password users, unique when present.
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
        phone: params.phone ?? null,
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

/**
 * Get the current user's profile info for UI display.
 * Returns a simplified object with display_name, avatar_url, phone, and created_at.
 */
export async function getCurrentUserInfo(userId: string): Promise<{
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
} | null> {
  const profile = await getProfile(userId);
  if (!profile) return null;
  return {
    id: profile.id,
    full_name: profile.display_name ?? 'Unknown',
    avatar_url: profile.avatar_url,
    phone: profile.phone ?? null,
    created_at: profile.created_at,
  };
}

/**
 * Get collection insights for the home screen.
 * Returns total value, item count, most valuable item, least used item, and items lent.
 */
export async function getCollectionInsights(userId: string): Promise<{
  totalValue: number;
  totalItems: number;
  currency: string;
  mostValuableItem: { brand: string; estimated_value: number | null; currency: string } | null;
  leastUsedItem: { brand: string; category: string | null } | null;
  itemsLent: number;
}> {
  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .eq('owner_id', userId);

  if (error) throw error;

  const myItems = items ?? [];
  const totalValue = myItems.reduce((sum, item) => sum + (item.estimated_value ?? 0), 0);
  const itemsLent = myItems.filter((item) => item.status === 'borrowed').length;

  const mostValuable =
    myItems.reduce(
      (max, item) =>
        (item.estimated_value ?? 0) > (max?.estimated_value ?? 0) ? item : max,
      null as (typeof myItems)[number] | null
    ) ?? null;

  // Query borrow counts per item for items owned by this user
  const { data: borrowCounts } = await supabase
    .from('borrow_transactions')
    .select('item_id')
    .eq('lender_id', userId);

  const borrowCountMap = new Map<string, number>();
  for (const bt of borrowCounts ?? []) {
    borrowCountMap.set(bt.item_id, (borrowCountMap.get(bt.item_id) ?? 0) + 1);
  }

  const leastUsed =
    myItems
      .filter((item) => item.status === 'available')
      .sort((a, b) => (borrowCountMap.get(a.id) ?? 0) - (borrowCountMap.get(b.id) ?? 0))[0] ?? null;

  return {
    totalValue,
    totalItems: myItems.length,
    currency: 'AED',
    mostValuableItem: mostValuable
      ? {
          brand: mostValuable.brand,
          estimated_value: mostValuable.estimated_value,
          currency: mostValuable.currency,
        }
      : null,
    leastUsedItem: leastUsed
      ? { brand: leastUsed.brand, category: leastUsed.category }
      : null,
    itemsLent,
  };
}
