-- Generic short-lived app response cache (matchmaker, hub snippets, etc.).
-- Run after 111-session-node-targets.sql

CREATE TABLE IF NOT EXISTS public.app_cache (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_cache_created
  ON public.app_cache (created_at);

ALTER TABLE public.app_cache ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.app_cache IS
  'Server-side JSON cache with TTL enforced in application code.';
