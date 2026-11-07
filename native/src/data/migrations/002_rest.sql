-- v2: rest timer end timestamp. The countdown is derived from this clock, so it survives a restart.
ALTER TABLE sessions ADD COLUMN rest_ends_at TEXT;
