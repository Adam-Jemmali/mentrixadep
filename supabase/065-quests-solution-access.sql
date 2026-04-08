-- Limit direct quest-solution exposure for regular authenticated users.
-- Keep broad quest discovery while withholding the `solution` column unless elevated.

-- Ensure baseline select on safe columns for authenticated users.
grant select (id, creator_user_id, prompt, metadata, created_at) on public.quests to authenticated;
grant select (id, creator_user_id, prompt, metadata, created_at) on public.quests to anon;

-- Remove direct read access to solution for non-service roles.
revoke select (solution) on public.quests from authenticated;
revoke select (solution) on public.quests from anon;

-- Service role paths keep full access (used by trusted backend actions).
grant select (solution) on public.quests to service_role;
grant select (solution) on public.quests to postgres;

