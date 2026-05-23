-- Orphan / inconsistency tracking for the booking → Stripe capture flow.
-- A row is written whenever the worker can't reconcile a captured PaymentIntent
-- with the booking row (e.g. capture succeeded but finalise batch failed).
-- Admin sweep reads from this table.
CREATE TABLE IF NOT EXISTS payment_reconciliation (
  id              TEXT    PRIMARY KEY,
  bookingId       TEXT    NOT NULL,
  paymentIntentId TEXT    NOT NULL,
  kind            TEXT    NOT NULL,           -- 'capture_orphan' | 'finalise_failed'
  detail          TEXT,
  createdAt       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_booking ON payment_reconciliation(bookingId);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_created ON payment_reconciliation(createdAt);
