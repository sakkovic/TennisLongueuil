-- =============================================================================
-- Tennis Longueuil: avatar storage + realtime
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Avatars bucket
--
-- Public read: avatars appear in participant lists, and a public bucket lets
-- images be cached by URL. Object paths contain the member's UUID and the
-- bucket cannot be listed. Uploads are limited to 2 MB JPEG/PNG/WebP (the app
-- uploads a resized ~512px JPEG).
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Each member may only write the single object "<their user id>/profile.jpg".
create policy "Members can read their own avatar object"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and name = (select auth.uid())::text || '/profile.jpg'
  );

create policy "Active members can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name = (select auth.uid())::text || '/profile.jpg'
    and (select private.is_active_member())
  );

create policy "Active members can replace their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and name = (select auth.uid())::text || '/profile.jpg'
  )
  with check (
    bucket_id = 'avatars'
    and name = (select auth.uid())::text || '/profile.jpg'
    and (select private.is_active_member())
  );

create policy "Members can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and name = (select auth.uid())::text || '/profile.jpg'
  );

-- -----------------------------------------------------------------------------
-- Realtime
--
-- Only "lessons" is published. join_lesson / cancel_registration update
-- lessons.registered_count, so every change in participation produces a
-- lessons UPDATE event. Realtime applies RLS, so only active members receive
-- it, and the payload never contains registration details or private reasons.
-- -----------------------------------------------------------------------------

alter publication supabase_realtime add table public.lessons;
