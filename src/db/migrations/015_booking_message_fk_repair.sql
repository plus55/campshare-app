-- Repair the booking_message foreign key rewritten by migration 003 when
-- booking was renamed to booking_old for its state/payment schema rebuild.
-- Apply:
--   wrangler d1 execute campshare-db --local  --file=src/db/migrations/015_booking_message_fk_repair.sql
--   wrangler d1 execute campshare-db --remote --file=src/db/migrations/015_booking_message_fk_repair.sql

CREATE TABLE booking_message_repaired (
  id           TEXT    PRIMARY KEY,
  bookingId    TEXT    NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  senderUserId TEXT    NOT NULL REFERENCES user(id)    ON DELETE CASCADE,
  body         TEXT    NOT NULL,
  readAt       INTEGER,
  createdAt    INTEGER NOT NULL
);

INSERT INTO booking_message_repaired
  (id, bookingId, senderUserId, body, readAt, createdAt)
SELECT
  id, bookingId, senderUserId, body, readAt, createdAt
FROM booking_message;

DROP TABLE booking_message;
ALTER TABLE booking_message_repaired RENAME TO booking_message;

CREATE INDEX idx_booking_message_booking ON booking_message(bookingId);
