-- Offloaded recording transcription queue for long session videos.
-- Supports single-key throttling by processing one job at a time in cron workers.

create table if not exists public.session_recording_transcription_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  recording_id uuid not null references public.video_recordings(id) on delete cascade,
  tutor_id uuid not null references public.users(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  file_size bigint null,
  status text not null default 'queued' check (status in ('queued', 'retry', 'processing', 'completed', 'failed')),
  attempt_count integer not null default 0,
  max_attempts integer not null default 4,
  not_before timestamptz not null default now(),
  locked_at timestamptz null,
  locked_by text null,
  gemini_file_name text null,
  gemini_file_uri text null,
  transcript_excerpt text null,
  screen_share_summary text null,
  key_topics jsonb not null default '[]'::jsonb,
  learner_questions jsonb not null default '[]'::jsonb,
  last_error text null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recording_id)
);

create index if not exists idx_recording_transcription_jobs_status_not_before
  on public.session_recording_transcription_jobs (status, not_before asc, created_at asc);

create index if not exists idx_recording_transcription_jobs_session
  on public.session_recording_transcription_jobs (session_id);

create trigger set_recording_transcription_jobs_updated_at
before update on public.session_recording_transcription_jobs
for each row execute procedure public.update_updated_at_column();

alter table public.session_recording_transcription_jobs enable row level security;

drop policy if exists "recording_transcription_jobs_select_participants" on public.session_recording_transcription_jobs;
create policy "recording_transcription_jobs_select_participants"
  on public.session_recording_transcription_jobs
  for select
  using (
    exists (
      select 1
      from public.sessions s
      where s.id = session_recording_transcription_jobs.session_id
        and (s.student_id = auth.uid() or s.tutor_id = auth.uid())
    )
    or public.is_admin(auth.uid())
  );

revoke all on table public.session_recording_transcription_jobs from public;
grant select on table public.session_recording_transcription_jobs to authenticated;
grant all on table public.session_recording_transcription_jobs to service_role;
