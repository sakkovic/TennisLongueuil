-- =============================================================================
-- SaKKa.Tennis: deleting an account frees the spot
--
-- A member can delete their own account from the app (see the delete-account
-- Edge Function). Removing the auth user cascades to their profile, and from
-- there to their registrations and invitations.
--
-- lessons.registered_count is already recomputed by the sync trigger on
-- delete. The waitlist, however, only moved when a registration was updated
-- (a cancellation), so a deleted account used to leave the freed spot empty.
-- =============================================================================

create function private.promote_after_registration_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'joined' then
    perform private.promote_waitlist(old.lesson_id);
  end if;
  return null;
end;
$$;

revoke execute on function private.promote_after_registration_deleted() from public;

-- The freed spot is counted from the registrations themselves, so this does
-- not depend on the order it runs in relative to the count trigger.
create trigger lesson_registrations_promote_after_delete
  after delete on public.lesson_registrations
  for each row execute function private.promote_after_registration_deleted();
