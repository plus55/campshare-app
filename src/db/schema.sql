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

-- Host application -----------------------------------------------

CREATE TABLE IF NOT EXISTS host_application (
    id                TEXT PRIMARY KEY,
    userId            TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,

    -- Step 1: about you
    firstName         TEXT NOT NULL,
    lastName          TEXT NOT NULL,
    phone             TEXT NOT NULL,
    region            TEXT NOT NULL,
    island            TEXT NOT NULL CHECK (island IN ('North', 'South')),

    -- Step 2: van
    vanName           TEXT NOT NULL,
    vanType           TEXT NOT NULL,
    vanYear           INTEGER NOT NULL,
    sleeps            INTEGER NOT NULL,
    seats             INTEGER NOT NULL,
    fixedToilet       INTEGER NOT NULL DEFAULT 0,
    description       TEXT NOT NULL,

    -- Step 3: pricing & availability
    nightlyRate       INTEGER NOT NULL,
    minimumNights     INTEGER NOT NULL,
    availableFrom     INTEGER,
    availableTo       INTEGER,
    instantBook       INTEGER NOT NULL DEFAULT 0,

    -- Step 4: features & rules
    features          TEXT NOT NULL DEFAULT '[]',   -- JSON array
    houseRules        TEXT NOT NULL DEFAULT '',
    petFriendly       INTEGER NOT NULL DEFAULT 0,

    -- Review workflow
    status            TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
    adminNote         TEXT,
    submittedAt       INTEGER NOT NULL,
    reviewedAt        INTEGER
);

CREATE INDEX IF NOT EXISTS idx_host_application_user   ON host_application(userId);
CREATE INDEX IF NOT EXISTS idx_host_application_status ON host_application(status);
