CREATE TABLE review (
  id            TEXT    PRIMARY KEY,
  bookingId     TEXT    NOT NULL REFERENCES booking(id)     ON DELETE CASCADE,
  authorUserId  TEXT    NOT NULL REFERENCES user(id)        ON DELETE CASCADE,
  subjectUserId TEXT    NOT NULL REFERENCES user(id)        ON DELETE CASCADE,
  vanListingId  TEXT    NOT NULL REFERENCES van_listing(id) ON DELETE CASCADE,
  role          TEXT    NOT NULL CHECK (role IN ('guest','host')),
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text          TEXT    NOT NULL,
  createdAt     INTEGER NOT NULL,
  UNIQUE (bookingId, role)
);
CREATE INDEX idx_review_subject ON review(subjectUserId);
CREATE INDEX idx_review_listing ON review(vanListingId);
CREATE INDEX idx_review_booking ON review(bookingId);

CREATE TABLE audit_log (
  id          TEXT    PRIMARY KEY,
  actorUserId TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  action      TEXT    NOT NULL,
  targetType  TEXT    NOT NULL,
  targetId    TEXT    NOT NULL,
  metadata    TEXT    NOT NULL DEFAULT '{}',
  createdAt   INTEGER NOT NULL
);
CREATE INDEX idx_audit_actor_time ON audit_log(actorUserId, createdAt);

ALTER TABLE booking ADD COLUMN reviewPromptSentAt INTEGER;
