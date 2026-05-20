-- ---------------------------------------------------------------
-- CampShare D1 schema
-- Run:
--   wrangler d1 execute campshare-db --local  --file=src/db/schema.sql
--   wrangler d1 execute campshare-db --remote --file=src/db/schema.sql
-- ---------------------------------------------------------------

-- Better Auth core tables ----------------------------------------

CREATE TABLE IF NOT EXISTS user (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    emailVerified INTEGER NOT NULL DEFAULT 0,
    image         TEXT,
    createdAt     INTEGER NOT NULL,
    updatedAt     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS session (
    id        TEXT PRIMARY KEY,
    userId    TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    token     TEXT NOT NULL UNIQUE,
    expiresAt INTEGER NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_user ON session(userId);

CREATE TABLE IF NOT EXISTS account (
    id                    TEXT PRIMARY KEY,
    userId                TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    providerId            TEXT NOT NULL,
    accountId             TEXT NOT NULL,
    accessToken           TEXT,
    refreshToken          TEXT,
    accessTokenExpiresAt  INTEGER,
    refreshTokenExpiresAt INTEGER,
    scope                 TEXT,
    idToken               TEXT,
    password              TEXT,
    createdAt             INTEGER NOT NULL,
    updatedAt             INTEGER NOT NULL,
    UNIQUE(providerId, accountId)
);
CREATE INDEX IF NOT EXISTS idx_account_user ON account(userId);

CREATE TABLE IF NOT EXISTS verification (
    id         TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value      TEXT NOT NULL,
    expiresAt  INTEGER NOT NULL,
    createdAt  INTEGER NOT NULL,
    updatedAt  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);

-- Host profile (one per host user) ---------------------------------

CREATE TABLE IF NOT EXISTS host_profile (
    userId            TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
    firstName         TEXT NOT NULL,
    lastName          TEXT NOT NULL,
    phone             TEXT NOT NULL,
    region            TEXT NOT NULL,
    island            TEXT NOT NULL CHECK (island IN ('North', 'South')),
    bio               TEXT,
    verifiedIdentity  INTEGER NOT NULL DEFAULT 0,
    stripeAccountId   TEXT,
    createdAt         INTEGER NOT NULL,
    updatedAt         INTEGER NOT NULL
);

-- Van listings ---------------------------------------------------

CREATE TABLE IF NOT EXISTS van_listing (
    id                TEXT PRIMARY KEY,
    hostUserId        TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    slug              TEXT NOT NULL UNIQUE,
    name              TEXT NOT NULL,
    vanType           TEXT NOT NULL,
    year              INTEGER NOT NULL,
    sleeps            INTEGER NOT NULL,
    seats             INTEGER NOT NULL,
    fixedToilet       INTEGER NOT NULL DEFAULT 0,
    petFriendly       INTEGER NOT NULL DEFAULT 0,
    description       TEXT NOT NULL,
    nightlyRate       INTEGER NOT NULL,   -- NZD cents
    minimumNights     INTEGER NOT NULL,
    instantBook       INTEGER NOT NULL DEFAULT 0,
    status            TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','pending_review','published','paused','archived')),
    adminNote         TEXT,
    region            TEXT NOT NULL,
    island            TEXT NOT NULL CHECK (island IN ('North', 'South')),
    pickupLocationText TEXT,
    pickupLat         REAL,
    pickupLng         REAL,
    features          TEXT NOT NULL DEFAULT '[]',  -- JSON array
    houseRules        TEXT NOT NULL DEFAULT '',
    publishedAt       INTEGER,
    createdAt         INTEGER NOT NULL,
    updatedAt         INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_van_listing_host   ON van_listing(hostUserId);
CREATE INDEX IF NOT EXISTS idx_van_listing_status ON van_listing(status);
CREATE INDEX IF NOT EXISTS idx_van_listing_slug   ON van_listing(slug);

-- Van photos -----------------------------------------------------

CREATE TABLE IF NOT EXISTS van_photo (
    id            TEXT PRIMARY KEY,
    vanListingId  TEXT NOT NULL REFERENCES van_listing(id) ON DELETE CASCADE,
    r2Key         TEXT NOT NULL,
    position      INTEGER NOT NULL DEFAULT 0,
    caption       TEXT,
    createdAt     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_van_photo_listing ON van_photo(vanListingId);

-- Availability blocks --------------------------------------------

CREATE TABLE IF NOT EXISTS availability_block (
    id            TEXT PRIMARY KEY,
    vanListingId  TEXT NOT NULL REFERENCES van_listing(id) ON DELETE CASCADE,
    startDate     INTEGER NOT NULL,  -- unix ms at NZ midnight
    endDate       INTEGER NOT NULL,  -- unix ms at NZ midnight
    reason        TEXT NOT NULL CHECK (reason IN ('booking','host-blocked','maintenance')),
    bookingId     TEXT,              -- FK to future booking table
    createdAt     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_availability_listing ON availability_block(vanListingId);

-- Bookings -------------------------------------------------------

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

-- Booking messages -----------------------------------------------

CREATE TABLE IF NOT EXISTS booking_message (
  id           TEXT    PRIMARY KEY,
  bookingId    TEXT    NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  senderUserId TEXT    NOT NULL REFERENCES user(id)    ON DELETE CASCADE,
  body         TEXT    NOT NULL,
  readAt       INTEGER,
  createdAt    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_message_booking ON booking_message(bookingId);
