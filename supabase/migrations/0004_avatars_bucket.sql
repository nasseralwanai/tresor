-- ============================================================================
-- Trésor — Avatars storage bucket
-- Public bucket for user profile avatars.
-- RLS: users can upload to their own path (avatars/<uid>/...), anyone can read.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- RLS: users can upload to their own path
-- Path convention: <user_id>/avatar.<ext>
create policy "avatars_storage_owner_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: users can update their own avatar
create policy "avatars_storage_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: users can delete their own avatar
create policy "avatars_storage_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: anyone can read (public bucket)
create policy "avatars_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');
