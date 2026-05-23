-- Host message templates (per-user, plain text, no variable substitution).
CREATE TABLE IF NOT EXISTS message_template (
  id        TEXT    PRIMARY KEY,
  userId    TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  title     TEXT    NOT NULL,
  body      TEXT    NOT NULL,
  position  INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_message_template_user ON message_template(userId, position);
