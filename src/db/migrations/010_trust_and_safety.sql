-- Migration 010 — Sprint 9: trust & safety
-- KYC, report/block, disputes, min driver age
-- Apply:
--   wrangler d1 execute campshare-db --local  --file=src/db/migrations/010_trust_and_safety.sql
--   wrangler d1 execute campshare-db --remote --file=src/db/migrations/010_trust_and_safety.sql

-- 9A — KYC fields on user
ALTER TABLE user ADD COLUMN kycStatus TEXT NOT NULL DEFAULT 'unverified';
  -- 'unverified' | 'pending' | 'verified' | 'failed'
ALTER TABLE user ADD COLUMN stripeIdentitySessionId TEXT;
ALTER TABLE user ADD COLUMN dateOfBirth INTEGER;  -- unix seconds, set from Stripe Identity verified output
ALTER TABLE user ADD COLUMN kycVerifiedAt INTEGER;

-- 9B — Reports
CREATE TABLE user_report (
  id              TEXT    PRIMARY KEY,
  reporterUserId  TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  reportedUserId  TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  reason          TEXT    NOT NULL,
    -- 'inappropriate_behaviour' | 'fraud' | 'no_show' | 'property_damage' | 'other'
  details         TEXT,
  bookingId       TEXT    REFERENCES booking(id) ON DELETE SET NULL,
  status          TEXT    NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','reviewed','actioned','dismissed')),
  adminNote       TEXT,
  resolvedAt      INTEGER,
  createdAt       INTEGER NOT NULL
);

CREATE INDEX idx_user_report_reported ON user_report(reportedUserId);
CREATE INDEX idx_user_report_reporter ON user_report(reporterUserId);
CREATE INDEX idx_user_report_status   ON user_report(status);

-- 9B — Blocks
CREATE TABLE user_block (
  id              TEXT    PRIMARY KEY,
  blockerUserId   TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  blockedUserId   TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  createdAt       INTEGER NOT NULL,
  UNIQUE(blockerUserId, blockedUserId)
);

CREATE INDEX idx_user_block_blocker ON user_block(blockerUserId);
CREATE INDEX idx_user_block_blocked ON user_block(blockedUserId);

-- 9C — Disputes
CREATE TABLE dispute (
  id                TEXT    PRIMARY KEY,
  bookingId         TEXT    NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  initiatorUserId   TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  reason            TEXT    NOT NULL,
    -- 'damage' | 'cleanliness' | 'misrepresentation' | 'no_show_host' | 'no_show_guest' | 'other'
  details           TEXT    NOT NULL,
  evidenceUrls      TEXT,                       -- JSON array of R2 URLs
  status            TEXT    NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','under_review','resolved_host','resolved_guest','resolved_split','dismissed')),
  adminNote         TEXT,
  depositAction     TEXT,
    -- 'released_to_host' | 'returned_to_guest' | 'split' | NULL
  depositSplitToHostCents INTEGER,              -- only used when depositAction = 'split'
  createdAt         INTEGER NOT NULL,
  resolvedAt        INTEGER
);

CREATE INDEX idx_dispute_booking   ON dispute(bookingId);
CREATE INDEX idx_dispute_initiator ON dispute(initiatorUserId);
CREATE INDEX idx_dispute_status    ON dispute(status);

-- 9E — Min driver age per listing
ALTER TABLE van_listing ADD COLUMN minDriverAge INTEGER NOT NULL DEFAULT 18;
