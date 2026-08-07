/**
 * Storage API — item photo uploads to Supabase Storage.
 *
 * The migration creates a bucket named 'items' (private). We also support
 * creating an 'item-photos' bucket for convenience, but default to 'items'
 * to match the migration schema.
 */

import { supabase } from '@/lib/supabase';
import { ensureBucket } from '@/lib/profile';
import type { ItemPhoto } from '@/types';

/** The storage bucket for item photos (matches the migration). */
export const ITEM_PHOTOS_BUCKET = 'items';

/** Maximum allowed file size for uploads (5 MB). */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Allowed MIME types for image uploads. */
const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

/** Allowed file extensions (lowercase, no dot). */
const ALLOWED_EXTENSIONS: ReadonlySet<string> = new Set(['jpg', 'jpeg', 'png', 'webp']);

/**
 * Validate a file's type and size before uploading.
 * @throws Error if the file type is not allowed or the size exceeds the limit.
 */
function validateUploadFile(blob: Blob, fileUri: string): void {
  // --- File type validation ---
  // If a MIME type is present, it must be an allowed image type.
  // If MIME type is absent (some platforms return empty blob.type),
  // fall back to checking the file extension.
  const mimeType = blob.type?.toLowerCase() ?? '';
  const fileExt = (fileUri.split('.').pop()?.split('?')[0] ?? '').toLowerCase();

  const mimeValid = mimeType !== '' && ALLOWED_MIME_TYPES.has(mimeType);
  const mimeInvalid = mimeType !== '' && !ALLOWED_MIME_TYPES.has(mimeType);
  const extValid = fileExt !== '' && ALLOWED_EXTENSIONS.has(fileExt);

  if (mimeInvalid || (!mimeValid && !extValid)) {
    throw new Error(
      'Invalid file type. Only JPG, PNG, and WebP images are allowed.'
    );
  }

  // --- File size validation ---
  if (blob.size > MAX_FILE_SIZE) {
    const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `File is too large (${sizeMB} MB). Maximum allowed size is 5 MB.`
    );
  }

  if (blob.size === 0) {
    throw new Error('The selected file appears to be empty.');
  }
}

/**
 * Upload a photo for an item.
 * @param itemId  The item ID
 * @param fileUri Local file URI (e.g. from expo-image-picker)
 * @returns The storage path used (also stored in item_photos table)
 */
export async function uploadItemPhoto(
  itemId: string,
  fileUri: string,
  isPrimary: boolean = false,
  displayOrder: number = 0
): Promise<{ storagePath: string; publicUrl: string }> {
  await ensureBucket(ITEM_PHOTOS_BUCKET, false);

  // Fetch the file as a blob
  const response = await fetch(fileUri);
  const blob = await response.blob();

  // Validate file type and size before uploading
  validateUploadFile(blob, fileUri);

  const fileExt = fileUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const fileName = `${itemId}/${Date.now()}.${fileExt}`;
  const contentType = blob.type || `image/${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(ITEM_PHOTOS_BUCKET)
    .upload(fileName, blob, { contentType });

  if (uploadError) throw uploadError;

  // Create a signed URL (private bucket) or public URL
  const { data: urlData } = await supabase.storage
    .from(ITEM_PHOTOS_BUCKET)
    .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

  const publicUrl = urlData?.signedUrl ?? '';

  // Insert the item_photos row
  const { error: photoError } = await supabase.from('item_photos').insert({
    item_id: itemId,
    storage_path: fileName,
    is_primary: isPrimary,
    display_order: displayOrder,
  });

  if (photoError) throw photoError;

  // If this is the primary photo, update the item's primary_image_url
  if (isPrimary) {
    await supabase
      .from('items')
      .update({ primary_image_url: publicUrl })
      .eq('id', itemId);
  }

  return { storagePath: fileName, publicUrl };
}

/**
 * Get all photos for an item.
 * Returns signed URLs for the private bucket.
 */
export async function getItemPhotos(itemId: string): Promise<
  (ItemPhoto & { url: string })[]
> {
  const { data: photos, error } = await supabase
    .from('item_photos')
    .select('*')
    .eq('item_id', itemId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  if (!photos || photos.length === 0) return [];

  // Create signed URLs for all photos
  const paths = photos.map((p) => p.storage_path);
  const { data: urlsData, error: urlsError } = await supabase.storage
    .from(ITEM_PHOTOS_BUCKET)
    .createSignedUrls(paths, 60 * 60 * 24 * 365);

  if (urlsError) throw urlsError;

  return photos.map((photo, i) => ({
    ...photo,
    url: urlsData?.[i]?.signedUrl ?? '',
  }));
}

/**
 * Delete a photo from storage and the database.
 */
export async function deleteItemPhoto(photoId: string, storagePath: string): Promise<void> {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(ITEM_PHOTOS_BUCKET)
    .remove([storagePath]);

  if (storageError) console.warn('[storage] Failed to delete file:', storageError);

  // Delete from DB
  const { error: dbError } = await supabase
    .from('item_photos')
    .delete()
    .eq('id', photoId);

  if (dbError) throw dbError;
}
