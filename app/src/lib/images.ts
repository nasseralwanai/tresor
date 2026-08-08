/**
 * Image upload API — uploads item images to Supabase Storage.
 *
 * Uses the 'item-images' bucket (migration 0021).
 * Path convention: {userId}/{itemId}/{timestamp}-{filename}
 * Returns the public URL of the uploaded image.
 */

import { supabase } from '@/lib/supabase';

/**
 * Upload an item image to Supabase Storage.
 *
 * @param userId - The current user's ID (used for RLS folder path)
 * @param itemId - The item's ID (used for organization)
 * @param fileUri - Local file URI from expo-image-picker
 * @returns The public URL of the uploaded image
 */
export async function uploadItemImage(
  userId: string,
  itemId: string,
  fileUri: string
): Promise<string> {
  const filePath = `${userId}/${itemId}/${Date.now()}.jpg`;
  const contentType = 'image/jpeg';

  // Read the file as base64 and convert to ArrayBuffer
  // (Supabase JS client on React Native requires arrayBuffer or Blob)
  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('item-images')
    .upload(filePath, blob, {
      contentType,
      upsert: false,
    });

  if (error) throw error;

  // Get the public URL
  const { data: publicUrlData } = supabase.storage
    .from('item-images')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

/**
 * Upload multiple item images and return their public URLs.
 *
 * @param userId - The current user's ID
 * @param itemId - The item's ID
 * @param fileUris - Array of local file URIs from expo-image-picker
 * @returns Array of public URLs in the same order
 */
export async function uploadItemImages(
  userId: string,
  itemId: string,
  fileUris: string[]
): Promise<string[]> {
  const urls: string[] = [];
  for (const uri of fileUris) {
    const url = await uploadItemImage(userId, itemId, uri);
    urls.push(url);
  }
  return urls;
}

/**
 * Delete an item image from storage.
 *
 * @param userId - The current user's ID (for RLS verification)
 * @param itemId - The item's ID
 * @param fileName - The file name within the item folder
 */
export async function deleteItemImage(
  userId: string,
  itemId: string,
  fileName: string
): Promise<void> {
  const filePath = `${userId}/${itemId}/${fileName}`;
  const { error } = await supabase.storage
    .from('item-images')
    .remove([filePath]);

  if (error) throw error;
}
