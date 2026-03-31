-- Code and triggers expect availability.price_per_session (cents). Base schema may omit it.
ALTER TABLE availability ADD COLUMN IF NOT EXISTS price_per_session INTEGER NOT NULL DEFAULT 2500;
