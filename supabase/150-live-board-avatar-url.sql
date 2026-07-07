-- Live Arena: store public profile photo URL on each feed row for realtime personalization.

ALTER TABLE public.live_board_events
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.live_board_events.avatar_url IS
  'user_settings.avatar_url snapshot at insert time. Public profile pic for Arena feed.';
