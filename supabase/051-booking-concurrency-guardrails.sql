-- Additional DB guardrails against concurrent booking/approval races.

-- At most one active request can exist for the same availability.
create unique index if not exists idx_session_requests_active_availability_unique
  on public.session_requests (availability_id)
  where status in ('pending', 'approved');

-- A reusable availability slot can have many historical cancelled sessions,
-- but must not have more than one non-cancelled session at a time.
create unique index if not exists idx_sessions_active_availability_unique
  on public.sessions (availability_id)
  where availability_id is not null and status <> 'cancelled';
