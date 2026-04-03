-- Active toggle, capacity, optional series grouping for availability CRUD.
ALTER TABLE availability ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE availability ADD COLUMN IF NOT EXISTS max_students INTEGER NOT NULL DEFAULT 1;
ALTER TABLE availability ADD COLUMN IF NOT EXISTS series_id UUID;
ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_max_students_check;
ALTER TABLE availability ADD CONSTRAINT availability_max_students_check CHECK (max_students >= 1 AND max_students <= 50);

CREATE INDEX IF NOT EXISTS idx_availability_tutor_active_start ON availability (tutor_id, active, start_time);
