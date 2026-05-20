-- Migration 003 — payments, payouts, and extended booking state machine
-- Apply:
--   wrangler d1 execute campshare-db --local  --file=src/db/migrations/003_payments_and_payouts.sql
--   wrangler d1 execute campshare-db --remote --file=src/db/migrations/003_payments_and_payouts.sql

-- Step 1: Recreate booking table with extended statuses + payment columns
-- (SQLite/D1 cannot ALTER a CHECK constraint, so we recreate the table)

ALTER TABLE booking RENAME TO booking_old;

CREATE TABLE booking (
  id                      TEXT    PRIMARY KEY,
  vanListingId            TEXT    NOT NULL REFERENCES van_listing(id) ON DELETE CASCADE,
  guestUserId             TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  hostUserId              TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  startDate               INTEGER NOT NULL,
  endDate                 INTEGER NOT NULL,
  nights                  INTEGER NOT NULL,
  guestCount              INTEGER NOT NULL,
  nightlyRateCents        INTEGER NOT NULL,
  subtotalCents           INTEGER,
  serviceFeeCents         INTEGER,
  gstOnFeeCents           INTEGER,
  hostPayoutCents         INTEGER,
  totalCents              INTEGER NOT NULL,
  depositCents            INTEGER NOT NULL DEFAULT 50000,
  cancellationPolicy      TEXT    NOT NULL DEFAULT 'standard_v1',
  guestMessage            TEXT,
  status                  TEXT    NOT NULL DEFAULT 'requested'
                          CHECK (status IN (
                            'requested','accepted','in_progress','completed',
                            'declined','cancelled_by_guest','cancelled_by_host','expired'
                          )),
  statusReason            TEXT,
  paymentIntentId         TEXT,
  depositPaymentIntentId  TEXT,
  depositPaymentMethodId  TEXT,
  customerStripeId        TEXT,
  requestedAt             INTEGER NOT NULL,
  respondedAt             INTEGER,
  paidAt                  INTEGER,
  startedAt               INTEGER,
  completedAt             INTEGER,
  cancelledAt             INTEGER,
  expiresAt               INTEGER NOT NULL,
  createdAt               INTEGER NOT NULL,
  updatedAt               INTEGER NOT NULL
);

INSERT INTO booking
  (id, vanListingId, guestUserId, hostUserId,
   startDate, endDate, nights, guestCount, nightlyRateCents,
   subtotalCents, serviceFeeCents, gstOnFeeCents, hostPayoutCents,
   totalCents, depositCents, cancellationPolicy,
   guestMessage, status, statusReason,
   paymentIntentId, depositPaymentIntentId, depositPaymentMethodId, customerStripeId,
   requestedAt, respondedAt, paidAt, startedAt, completedAt, cancelledAt,
   expiresAt, createdAt, updatedAt)
SELECT
  id, vanListingId, guestUserId, hostUserId,
  startDate, endDate, nights, guestCount, nightlyRateCents,
  NULL, NULL, NULL, NULL,
  totalCents, 50000, 'standard_v1',
  guestMessage, status, statusReason,
  NULL, NULL, NULL, NULL,
  requestedAt, respondedAt, NULL, NULL, NULL, cancelledAt,
  expiresAt, createdAt, updatedAt
FROM booking_old;

DROP TABLE booking_old;

CREATE INDEX IF NOT EXISTS idx_booking_listing ON booking(vanListingId);
CREATE INDEX IF NOT EXISTS idx_booking_guest   ON booking(guestUserId);
CREATE INDEX IF NOT EXISTS idx_booking_host    ON booking(hostUserId);
CREATE INDEX IF NOT EXISTS idx_booking_status  ON booking(status);

-- Step 2: Add Stripe onboarding tracking to host_profile
ALTER TABLE host_profile ADD COLUMN stripeOnboardingCompleted INTEGER NOT NULL DEFAULT 0;

-- Step 3: User payment profile (Stripe customer ID per user)
CREATE TABLE IF NOT EXISTS user_payment_profile (
  userId          TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  stripeCustomerId TEXT NOT NULL,
  createdAt       INTEGER NOT NULL
);

-- Step 4: Payment event (idempotent webhook handling)
CREATE TABLE IF NOT EXISTS payment_event (
  id             TEXT PRIMARY KEY,
  stripeEventId  TEXT NOT NULL UNIQUE,
  eventType      TEXT NOT NULL,
  bookingId      TEXT REFERENCES booking(id),
  payload        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  processedAt    INTEGER,
  createdAt      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_event_stripe  ON payment_event(stripeEventId);
CREATE INDEX IF NOT EXISTS idx_payment_event_booking ON payment_event(bookingId);

-- Step 5: Payout table
CREATE TABLE IF NOT EXISTS payout (
  id               TEXT PRIMARY KEY,
  bookingId        TEXT NOT NULL REFERENCES booking(id),
  hostUserId       TEXT NOT NULL REFERENCES user(id),
  amountCents      INTEGER NOT NULL,
  stripeTransferId TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  createdAt        INTEGER NOT NULL,
  updatedAt        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payout_booking ON payout(bookingId);
CREATE INDEX IF NOT EXISTS idx_payout_host    ON payout(hostUserId);
