-- Capture authenticated product feedback from in-app widget.
create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_role text,
  message text not null,
  page_path text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.feedback_submissions enable row level security;

drop policy if exists feedback_submissions_select_own on public.feedback_submissions;
create policy feedback_submissions_select_own
  on public.feedback_submissions
  for select
  using (auth.uid() = user_id);

drop policy if exists feedback_submissions_insert_own on public.feedback_submissions;
create policy feedback_submissions_insert_own
  on public.feedback_submissions
  for insert
  with check (auth.uid() = user_id);

-- Capture demand when no guide currently matches a student's subject.
create table if not exists public.guide_waitlist_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  course_name text,
  page_path text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.guide_waitlist_requests enable row level security;

drop policy if exists guide_waitlist_requests_select_own on public.guide_waitlist_requests;
create policy guide_waitlist_requests_select_own
  on public.guide_waitlist_requests
  for select
  using (auth.uid() = user_id);

drop policy if exists guide_waitlist_requests_insert_own on public.guide_waitlist_requests;
create policy guide_waitlist_requests_insert_own
  on public.guide_waitlist_requests
  for insert
  with check (auth.uid() = user_id);

create index if not exists feedback_submissions_user_created_idx
  on public.feedback_submissions (user_id, created_at desc);

create index if not exists guide_waitlist_requests_user_created_idx
  on public.guide_waitlist_requests (user_id, created_at desc);
