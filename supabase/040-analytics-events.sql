-- Analytics Events — comprehensive event tracking table
-- Tracks both anonymous (user_id null) and authenticated events

create table if not exists analytics_events (
  id            bigserial primary key,
  user_id       uuid references auth.users(id) on delete set null,
  session_id    text,                        -- optional browser session correlation id
  event_name    text not null,
  properties    jsonb not null default '{}',
  ip_hash       text,                        -- hashed for privacy
  created_at    timestamptz not null default now()
);

-- Partial index for user funnel queries (only non-null user_ids)
create index if not exists analytics_events_user_id_idx
  on analytics_events(user_id, event_name, created_at)
  where user_id is not null;

-- Index for time-series queries by event name
create index if not exists analytics_events_name_created_idx
  on analytics_events(event_name, created_at desc);

-- Index for properties querying (e.g. subject lookups)
create index if not exists analytics_events_properties_idx
  on analytics_events using gin(properties);

-- Index for session_id correlation
create index if not exists analytics_events_session_id_idx
  on analytics_events(session_id)
  where session_id is not null;

-- RLS: service role only writes, admins can read via service role
alter table analytics_events enable row level security;

-- No user-facing RLS policies: all reads/writes go through service role
-- (trackEvent uses createAdminClient, /api/track uses admin client)
