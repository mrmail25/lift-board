-- ApeChit on-device schema v1. Forward-only: never edit this file after it ships; add 00N_*.sql.
-- user_version is set by the migration runner, not here.

CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE routines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0, 1)),
  next_day INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'user',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  extras_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE routine_days (
  id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  weekday TEXT,
  label TEXT NOT NULL DEFAULT '',
  UNIQUE (routine_id, idx)
);

CREATE TABLE routine_exercises (
  id TEXT PRIMARY KEY,
  day_id TEXT NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  exercise_id TEXT NOT NULL,
  sets INTEGER NOT NULL CHECK (sets >= 0),
  reps TEXT,
  extras_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  schema INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'discarded', 'skipped')),
  date TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  unit TEXT NOT NULL,
  label TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  routine_id TEXT,
  routine_version INTEGER,
  day_idx INTEGER,
  paused_at TEXT,
  paused_ms INTEGER NOT NULL DEFAULT 0,
  adj_ms INTEGER NOT NULL DEFAULT 0,
  empty INTEGER NOT NULL DEFAULT 0 CHECK (empty IN (0, 1)),
  extras_json TEXT NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX sessions_one_active ON sessions(status) WHERE status = 'active';
CREATE INDEX sessions_date ON sessions(date);

CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  order_idx INTEGER NOT NULL,
  exercise_id TEXT NOT NULL,
  name_snapshot TEXT NOT NULL,
  skipped INTEGER NOT NULL DEFAULT 0 CHECK (skipped IN (0, 1)),
  notes TEXT NOT NULL DEFAULT '',
  extras_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX entries_session ON entries(session_id);

CREATE TABLE sets (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'working',
  load REAL,
  reps REAL,
  rir REAL,
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  done_at TEXT,
  note TEXT NOT NULL DEFAULT '',
  extras_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX sets_entry ON sets(entry_id);
CREATE INDEX sets_session ON sets(session_id);

CREATE TABLE prs (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  set_id TEXT,
  exercise_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  value REAL,
  extras_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

CREATE TABLE bodyweights (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  extras_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE notes (
  exercise_id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  extras_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE custom_exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  record_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE media_refs (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  local_uri TEXT,
  byte_size INTEGER,
  mime TEXT,
  extras_json TEXT NOT NULL DEFAULT '{}'
);

-- Photo and video bytes live here and are intentionally absent from backup JSON.
CREATE TABLE media_blobs (
  id TEXT PRIMARY KEY,
  media_ref_id TEXT NOT NULL REFERENCES media_refs(id) ON DELETE CASCADE,
  data TEXT NOT NULL
);

CREATE TABLE preserved (
  bucket TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL
);
