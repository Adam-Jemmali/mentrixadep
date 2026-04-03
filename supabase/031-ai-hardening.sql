-- AI hardening tables: per-user daily rate limits + session package cache.
-- Run after 030-clan-system.sql

-- ─── 1. Per-user daily AI rate limits ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_rate_limits (
  user_id   uuid  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action    text  NOT NULL,
  date      date  NOT NULL DEFAULT current_date,
  count     int   NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, action, date)
);

-- Clean up old rows automatically (keep 7 days for auditing)
CREATE INDEX IF NOT EXISTS ai_rate_limits_date_idx ON ai_rate_limits (date);

-- RLS: users can read their own limits; service role writes
ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_limits"
  ON ai_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Service role bypasses RLS for upserts from server actions.

-- ─── 2. Session package 24hr cache ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_package_cache (
  cache_key  text        NOT NULL PRIMARY KEY,
  payload    jsonb       NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_package_cache_created_idx ON ai_package_cache (created_at);

-- RLS: no direct client access — server-side only via service role
ALTER TABLE ai_package_cache ENABLE ROW LEVEL SECURITY;

-- No public read policy — service role only.

-- ─── 3. Auto-purge cache entries older than 25 hours ─────────────────────────
-- Optional: run via cron or pg_cron. Shown here for documentation.
-- DELETE FROM ai_package_cache WHERE created_at < now() - interval '25 hours';
