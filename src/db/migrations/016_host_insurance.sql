-- Migration 016 — host insurance verification (host-carries-cover model)
-- Hosts must hold a policy permitting paid hire; CampShare verifies proof,
-- never underwrites. A verified, in-date policy is required before a listing
-- can be published and before a booking can be accepted.
-- Apply:
--   wrangler d1 execute campshare-db --local  --file=src/db/migrations/016_host_insurance.sql
--   wrangler d1 execute campshare-db --remote --file=src/db/migrations/016_host_insurance.sql

ALTER TABLE host_profile ADD COLUMN insuranceStatus TEXT NOT NULL DEFAULT 'none';
  -- 'none' | 'pending' | 'verified' | 'rejected' | 'expired'
ALTER TABLE host_profile ADD COLUMN insuranceProvider TEXT;
ALTER TABLE host_profile ADD COLUMN insurancePolicyNumber TEXT;
ALTER TABLE host_profile ADD COLUMN insuranceCoverType TEXT;
  -- 'p2p_rental' | 'commercial_fleet' | 'self_attested'
ALTER TABLE host_profile ADD COLUMN insuranceDocR2Key TEXT;   -- key in the PRIVATE campshare-host-docs bucket
ALTER TABLE host_profile ADD COLUMN insuranceExpiryDate INTEGER;  -- unix seconds; policies renew annually
ALTER TABLE host_profile ADD COLUMN insuranceAttestedAt INTEGER;  -- when host confirmed cover permits paid hire
ALTER TABLE host_profile ADD COLUMN insuranceVerifiedAt INTEGER;
ALTER TABLE host_profile ADD COLUMN insuranceAdminNote TEXT;

-- Damage-claim execution ledger.
-- The $500 deposit hold is released at trip completion, but disputes can be
-- filed for 7 days after. Approved damage claims are therefore recovered by an
-- OFF-SESSION charge to the guest's saved payment method, then transferred to
-- the host. One claim per dispute (id = disputeId) gives natural idempotency.
CREATE TABLE IF NOT EXISTS deposit_claim (
  id                    TEXT    PRIMARY KEY,   -- = dispute.id
  disputeId             TEXT    NOT NULL REFERENCES dispute(id) ON DELETE CASCADE,
  bookingId             TEXT    NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  hostUserId            TEXT    NOT NULL REFERENCES user(id),
  amountCents           INTEGER NOT NULL,       -- charged to guest + transferred to host (<= deposit)
  chargePaymentIntentId TEXT,
  stripeTransferId      TEXT,
  status                TEXT    NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','charged','transferred','failed')),
  createdAt             INTEGER NOT NULL,
  updatedAt             INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deposit_claim_booking ON deposit_claim(bookingId);
