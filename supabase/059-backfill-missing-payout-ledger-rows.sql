-- Backfill payout ledger rows for historical sessions that were created/approved
-- before payout-ledger insertion was enabled.
-- Safe to run multiple times.

WITH source_sessions AS (
  SELECT
    s.id AS session_id,
    s.tutor_id,
    s.student_id,
    s.course,
    s.start_time,
    COALESCE(s.price_per_session, 2500) AS gross_cents
  FROM sessions s
  LEFT JOIN tutor_payout_ledger l
    ON l.session_id = s.id
  WHERE l.id IS NULL
    AND s.status IN ('scheduled', 'completed')
), inserted AS (
  INSERT INTO tutor_payout_ledger (
    tutor_id,
    session_id,
    session_date,
    student_id,
    course,
    gross_cents,
    platform_fee_cents,
    net_cents,
    status,
    hold_until
  )
  SELECT
    ss.tutor_id,
    ss.session_id,
    ss.start_time,
    ss.student_id,
    ss.course,
    ss.gross_cents,
    ROUND((ss.gross_cents * 1500) / 10000.0)::integer AS platform_fee_cents,
    ss.gross_cents - ROUND((ss.gross_cents * 1500) / 10000.0)::integer AS net_cents,
    'pending',
    now()
  FROM source_sessions ss
  RETURNING session_id
)
UPDATE sessions s
SET payout_status = 'pending'
WHERE s.id IN (SELECT session_id FROM inserted)
  AND s.payout_status IS NULL;
