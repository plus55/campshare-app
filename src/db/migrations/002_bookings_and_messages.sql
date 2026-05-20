-- Migration 002 — bookings and booking messages
-- Apply:
--   wrangler d1 execute campshare-db --local  --file=src/db/migrations/002_bookings_and_messages.sql
--   wrangler d1 execute campshare-db --remote --file=src/db/migrations/002_bookings_and_messages.sql

CREATE TABLE IF NOT EXISTS booking (
  id                TEXT    PRIMARY KEY,
  vanListingId      TEXT    NOT NULL REFERENCES van_listing(id) ON DELETE CASCADE,
  guestUserId       TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  hostUserId        TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  startDate         INTEGER NOT NULL,  -- unix ms UTC midnight (Date.UTC)
  endDate           INTEGER NOT NULL,  -- unix ms UTC midnight (Date.UTC)
  nights            INTEGER NOT NULL,
  guestCount        INTEGER NOT NULL,
  nightlyRateCents  INTEGER NOT NULL,  -- frozen at request time
  totalCents        INTEGER NOT NULL,  -- nights * nightlyRateCents
  guestMessage      TEXT,
  status            TEXT    NOT NULL DEFAULT 'requested'
                            CHECK (status IN (
                              'requested','accepted','declined',
                              'cancelled_by_guest','cancelled_by_host','expired'
                            )),
  statusReason      TEXT,
  requestedAt       INTEGER NOT NULL,
  respondedAt       INTEGER,
  cancelledAt       INTEGER,
  expiresAt         INTEGER NOT NULL,  -- requestedAt + 48h (unix seconds)
  createdAt         INTEGER NOT NULL,
  updatedAt         INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_listing ON booking(vanListingId);
CREATE INDEX IF NOT EXISTS idx_booking_guest   ON booking(guestUserId);
CREATE INDEX IF NOT EXISTS idx_booking_host    ON booking(hostUserId);
CREATE INDEX IF NOT EXISTS idx_booking_status  ON booking(status);

CREATE TABLE IF NOT EXISTS booking_message (
  id           TEXT    PRIMARY KEY,
  bookingId    TEXT    NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  senderUserId TEXT    NOT NULL REFERENCES user(id)    ON DELETE CASCADE,
  body         TEXT    NOT NULL,
  readAt       INTEGER,
  createdAt    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_message_booking ON booking_message(bookingId);
