-- =============================================================================
-- Tennis Longueuil: waitlist status
--
-- A new enum value cannot be used in the transaction that adds it, so it gets
-- its own migration. The waitlist itself is in 20260922000200_waitlist.sql.
-- Capacity logic only ever counts 'joined' rows, so nothing changes yet.
-- =============================================================================

alter type public.registration_status add value if not exists 'waitlisted';
