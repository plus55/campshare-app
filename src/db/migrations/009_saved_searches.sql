CREATE TABLE saved_search (
  id              TEXT    PRIMARY KEY,
  userId          TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  label           TEXT,
  filters         TEXT    NOT NULL,        -- JSON of /vans search params
  lastAlertedAt   INTEGER,                 -- unix seconds; null = never
  createdAt       INTEGER NOT NULL
);

CREATE INDEX idx_saved_search_user ON saved_search(userId);
