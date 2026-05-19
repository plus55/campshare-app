-- Migration 001: split host_application into host_profile + van_listing
-- Idempotent: safe to re-run against an already-migrated database.

-- 1. Create new tables (IF NOT EXISTS makes re-runs safe) ---------

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
    nightlyRate       INTEGER NOT NULL,
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
    features          TEXT NOT NULL DEFAULT '[]',
    houseRules        TEXT NOT NULL DEFAULT '',
    publishedAt       INTEGER,
    createdAt         INTEGER NOT NULL,
    updatedAt         INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_van_listing_host   ON van_listing(hostUserId);
CREATE INDEX IF NOT EXISTS idx_van_listing_status ON van_listing(status);
CREATE INDEX IF NOT EXISTS idx_van_listing_slug   ON van_listing(slug);

CREATE TABLE IF NOT EXISTS van_photo (
    id            TEXT PRIMARY KEY,
    vanListingId  TEXT NOT NULL REFERENCES van_listing(id) ON DELETE CASCADE,
    r2Key         TEXT NOT NULL,
    position      INTEGER NOT NULL DEFAULT 0,
    caption       TEXT,
    createdAt     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_van_photo_listing ON van_photo(vanListingId);

CREATE TABLE IF NOT EXISTS availability_block (
    id            TEXT PRIMARY KEY,
    vanListingId  TEXT NOT NULL REFERENCES van_listing(id) ON DELETE CASCADE,
    startDate     INTEGER NOT NULL,
    endDate       INTEGER NOT NULL,
    reason        TEXT NOT NULL CHECK (reason IN ('booking','host-blocked','maintenance')),
    bookingId     TEXT,
    createdAt     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_availability_listing ON availability_block(vanListingId);

-- 2. Backfill host_profile from approved applications --------------
--    INSERT OR IGNORE: if userId already exists (re-run), skip.

INSERT OR IGNORE INTO host_profile
    (userId, firstName, lastName, phone, region, island, createdAt, updatedAt)
SELECT
    ha.userId,
    ha.firstName,
    ha.lastName,
    ha.phone,
    ha.region,
    ha.island,
    ha.submittedAt,
    ha.submittedAt
FROM host_application ha
WHERE ha.status = 'approved';

-- 3. Backfill van_listing from approved applications ---------------
--    Slug: sanitised lower-case name + first 6 chars of the application ID.

INSERT OR IGNORE INTO van_listing
    (id, hostUserId, slug, name, vanType, year, sleeps, seats,
     fixedToilet, petFriendly, description, nightlyRate, minimumNights,
     instantBook, status, adminNote, region, island, features, houseRules,
     publishedAt, createdAt, updatedAt)
SELECT
    ha.id,
    ha.userId,
    lower(
        replace(replace(replace(replace(replace(
            ha.vanName,
        ' ', '-'), '.', ''), '''', ''), '"', ''), '/', '-')
    ) || '-' || lower(substr(ha.id, 1, 6)),
    ha.vanName,
    ha.vanType,
    ha.vanYear,
    ha.sleeps,
    ha.seats,
    ha.fixedToilet,
    ha.petFriendly,
    ha.description,
    ha.nightlyRate,
    ha.minimumNights,
    ha.instantBook,
    'published',
    ha.adminNote,
    ha.region,
    ha.island,
    ha.features,
    ha.houseRules,
    ha.reviewedAt,
    ha.submittedAt,
    ha.submittedAt
FROM host_application ha
WHERE ha.status = 'approved';

-- 4. Drop the old table -------------------------------------------
--    IF EXISTS makes this safe to re-run after the table is already gone.

DROP TABLE IF EXISTS host_application;
