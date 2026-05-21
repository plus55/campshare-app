ALTER TABLE review ADD COLUMN hostResponse TEXT;
ALTER TABLE review ADD COLUMN hostRespondedAt INTEGER;

CREATE TABLE notification (
  id        TEXT    PRIMARY KEY,
  userId    TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  type      TEXT    NOT NULL,
  payload   TEXT    NOT NULL DEFAULT '{}',
  readAt    INTEGER,
  createdAt INTEGER NOT NULL
);
CREATE INDEX idx_notification_user_created ON notification(userId, createdAt);
CREATE INDEX idx_notification_unread ON notification(userId, readAt);
