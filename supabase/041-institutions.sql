-- Institution / B2B Foundation
-- Supports auto-domain matching, member management, credits, custom branding

create type institution_plan as enum ('free', 'basic', 'pro');

create table if not exists institutions (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  domain              text not null unique,          -- e.g. "uottawa.ca" (lowercase, no @)
  admin_user_id       uuid references auth.users(id) on delete set null,
  plan                institution_plan not null default 'free',
  session_credits     integer not null default 0,    -- prepaid sessions remaining
  logo_url            text,                           -- uploaded branding asset
  negotiated_rate_pct integer,                        -- tutor payout % override (null = platform default)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists institution_members (
  institution_id  uuid not null references institutions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'student' check (role in ('student', 'admin')),
  added_at        timestamptz not null default now(),
  primary key (institution_id, user_id)
);

-- Quick lookup: is a user a member of any institution?
create index if not exists institution_members_user_idx
  on institution_members(user_id);

-- Trigger: keep institutions.updated_at fresh
create or replace function touch_institution_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger institutions_updated_at
  before update on institutions
  for each row execute function touch_institution_updated_at();

-- RLS: institution members (student/admin) can read their own institution row
alter table institutions enable row level security;
alter table institution_members enable row level security;

-- Institutions: readable by members, writable only by service role
create policy "institution_members_can_read_their_institution"
  on institutions for select
  using (
    id in (
      select institution_id from institution_members
      where user_id = auth.uid()
    )
  );

-- institution_members: users can see members of their own institution
create policy "members_can_read_their_institution_members"
  on institution_members for select
  using (
    institution_id in (
      select institution_id from institution_members
      where user_id = auth.uid()
    )
  );
