-- Ensure payout ledger is one row per session and backfill missing session prices.

-- Backfill session price from availability where possible.
UPDATE sessions s
SET price_per_session = a.price_per_session
FROM availability a
WHERE s.availability_id = a.id
  AND s.price_per_session IS NULL
  AND a.price_per_session IS NOT NULL;

-- Final fallback so payout math is deterministic.
UPDATE sessions
SET price_per_session = 2500
WHERE price_per_session IS NULL;

-- Remove duplicate payout rows if they exist (keep newest by created_at/id).
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY session_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM tutor_payout_ledger
  WHERE session_id IS NOT NULL
)
DELETE FROM tutor_payout_ledger t
USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;

-- Make session_id effectively unique for non-null values.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_payout_ledger_session_unique
  ON tutor_payout_ledger (session_id)
  WHERE session_id IS NOT NULL;
