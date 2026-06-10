-- Unified background job queue for async work (emails, AI, payouts, analytics).
-- Pattern mirrors session_recording_transcription_jobs with idempotency.

create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'retry', 'processing', 'completed', 'failed')),
  priority integer not null default 0,
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  not_before timestamptz not null default now(),
  locked_at timestamptz null,
  locked_by text null,
  last_error text null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_type, idempotency_key)
);

create index if not exists idx_background_jobs_claim
  on public.background_jobs (status, priority desc, not_before asc, created_at asc);

create index if not exists idx_background_jobs_type_status
  on public.background_jobs (job_type, status);

create trigger set_background_jobs_updated_at
before update on public.background_jobs
for each row execute procedure public.update_updated_at_column();

alter table public.background_jobs enable row level security;

revoke all on table public.background_jobs from public;
grant all on table public.background_jobs to service_role;
