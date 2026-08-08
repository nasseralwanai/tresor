-- ============================================================================
-- Migration 0021: Storage bucket 'item-images' with RLS policies
--
-- Creates a public storage bucket for item images.
-- RLS policies:
--   - Item owners can upload/update/delete their own item images
--   - Circle members can view (SELECT) item images
--   - Authenticated users can read public URLs
-- ============================================================================

-- 1. Create the storage bucket (public read so images can be loaded via URL)
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

-- 2. RLS: Owners can upload images to their item's folder
--    Path convention: {userId}/{itemId}/{filename}
create policy "item_images_owner_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. RLS: Owners can update their own item images
create policy "item_images_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. RLS: Owners can delete their own item images
create policy "item_images_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. RLS: Anyone can read (bucket is public, but we still need a SELECT policy)
create policy "item_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'item-images');
