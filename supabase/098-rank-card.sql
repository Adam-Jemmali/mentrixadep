-- Rank Card — public competitive performance proof at /rank/[username]
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS rank_card_username text,
  ADD COLUMN IF NOT EXISTS rank_card_public boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_settings_rank_card_username
  ON user_settings (lower(rank_card_username))
  WHERE rank_card_username IS NOT NULL;

COMMENT ON COLUMN user_settings.rank_card_username IS
  'Public slug for mentrixa.one/rank/[username]. Lowercase, unique.';

COMMENT ON COLUMN user_settings.rank_card_public IS
  'When false, /rank/[username] shows a private notice (default public).';
