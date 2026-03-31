-- App allows tutor slots of 15–480 minutes (see createAvailability in tutor.ts).
-- Original schema fixed every row at 30 minutes, which broke inserts for other lengths.

ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_duration_check;
ALTER TABLE availability ADD CONSTRAINT availability_duration_check CHECK (
  end_time > start_time
  AND (end_time - start_time) >= INTERVAL '15 minutes'
  AND (end_time - start_time) <= INTERVAL '480 minutes'
);

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_duration_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_duration_check CHECK (
  end_time > start_time
  AND (end_time - start_time) >= INTERVAL '15 minutes'
  AND (end_time - start_time) <= INTERVAL '480 minutes'
);
