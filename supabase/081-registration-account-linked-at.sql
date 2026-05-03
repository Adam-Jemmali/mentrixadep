-- Track when a waitlist row was tied to a real auth account (signup or approve-while-user-exists).
-- Admin list hides approved rows where account_linked_at IS NOT NULL but auth user no longer exists (deleted account).

alter table public.registration_requests
  add column if not exists account_linked_at timestamptz;

comment on column public.registration_requests.account_linked_at is
  'Set when this email has been linked to an auth account (completed signup or approved while user exists). Used to omit stale approved rows after self-service account deletion.';

-- Backfill existing approved rows that still match a row in auth.users (identity email match).
update public.registration_requests rr
set account_linked_at = coalesce(rr.account_linked_at, rr.updated_at)
from auth.users au
where rr.status = 'approved'
  and rr.account_linked_at is null
  and lower(trim(both from au.email::text)) = lower(trim(both from rr.email));
