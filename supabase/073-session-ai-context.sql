-- Session AI context captured at call end (chat, whiteboard, screen-share timeline, recording hints)
-- Used to personalize post-session Studio package generation.

create table if not exists public.session_ai_context (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  tutor_id uuid not null references public.users(id) on delete cascade,
  chat_transcript jsonb not null default '[]'::jsonb,
  whiteboard_summary jsonb not null default '{}'::jsonb,
  whiteboard_snapshot_data_url text null,
  screen_share_timeline jsonb not null default '[]'::jsonb,
  recording_hints jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_session_ai_context_tutor_updated
  on public.session_ai_context (tutor_id, updated_at desc);

create trigger set_session_ai_context_updated_at
before update on public.session_ai_context
for each row execute procedure public.update_updated_at_column();

alter table public.session_ai_context enable row level security;

-- Session participants can read their own context rows.
drop policy if exists "session_ai_context_select_participants" on public.session_ai_context;
create policy "session_ai_context_select_participants"
  on public.session_ai_context
  for select
  using (
    exists (
      select 1
      from public.sessions s
      where s.id = session_ai_context.session_id
        and (s.student_id = auth.uid() or s.tutor_id = auth.uid())
    )
    or public.is_admin(auth.uid())
  );

-- Only service role writes from trusted server actions.
revoke all on table public.session_ai_context from public;
grant select on table public.session_ai_context to authenticated;
grant all on table public.session_ai_context to service_role;
