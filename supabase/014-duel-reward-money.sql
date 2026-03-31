-- Duel winner reward: fixed money credit toward next session (USD cents), not percent off.
-- Safe if columns already migrated or differ from 012.

-- ---------------------------------------------------------------------------
-- skill_duels
-- ---------------------------------------------------------------------------
ALTER TABLE skill_duels
  ADD COLUMN IF NOT EXISTS reward_amount_cents INT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'skill_duels' AND column_name = 'reward_percent_off'
  ) THEN
    UPDATE skill_duels
    SET reward_amount_cents = LEAST(2500, GREATEST(100, COALESCE(reward_percent_off, 15) * 33))
    WHERE reward_amount_cents IS NULL;
  END IF;
END $$;

UPDATE skill_duels
SET reward_amount_cents = 500
WHERE reward_amount_cents IS NULL;

ALTER TABLE skill_duels
  ALTER COLUMN reward_amount_cents SET NOT NULL,
  ALTER COLUMN reward_amount_cents SET DEFAULT 500;

ALTER TABLE skill_duels
  DROP COLUMN IF EXISTS reward_percent_off;

COMMENT ON COLUMN skill_duels.reward_amount_cents IS 'USD cents credited toward next paid session with this tutor when the learner wins.';

-- ---------------------------------------------------------------------------
-- duel_credits
-- ---------------------------------------------------------------------------
ALTER TABLE duel_credits
  ADD COLUMN IF NOT EXISTS amount_cents INT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'duel_credits' AND column_name = 'percent_off'
  ) THEN
    UPDATE duel_credits
    SET amount_cents = LEAST(2500, GREATEST(100, COALESCE(percent_off, 15) * 33))
    WHERE amount_cents IS NULL;
  END IF;
END $$;

UPDATE duel_credits
SET amount_cents = 500
WHERE amount_cents IS NULL;

ALTER TABLE duel_credits
  ALTER COLUMN amount_cents SET NOT NULL;

ALTER TABLE duel_credits
  DROP COLUMN IF EXISTS percent_off;

ALTER TABLE duel_credits
  DROP CONSTRAINT IF EXISTS duel_credits_amount_cents_positive;

ALTER TABLE duel_credits
  ADD CONSTRAINT duel_credits_amount_cents_positive CHECK (amount_cents > 0 AND amount_cents <= 1000000);
