-- Prevent two bookings from reserving overlapping dates for one listing.
-- Existing host/iCal blocks also prevent a newly accepted booking.
CREATE TABLE IF NOT EXISTS booking_transition_lock (
  bookingId TEXT PRIMARY KEY REFERENCES booking(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TRIGGER IF NOT EXISTS availability_booking_no_overlap_insert
BEFORE INSERT ON availability_block
WHEN NEW.reason = 'booking'
BEGIN
  SELECT RAISE(ABORT, 'BOOKING_NOT_ACCEPTABLE')
  WHERE NOT EXISTS (
    SELECT 1
    FROM booking reserved
    WHERE reserved.id = NEW.bookingId
      AND reserved.status IN ('requested', 'accepted')
  );

  SELECT RAISE(ABORT, 'BOOKING_DATES_UNAVAILABLE')
  WHERE EXISTS (
    SELECT 1
    FROM availability_block existing
    WHERE existing.vanListingId = NEW.vanListingId
      AND existing.startDate <= NEW.endDate
      AND existing.endDate >= NEW.startDate
  );
END;

CREATE TRIGGER IF NOT EXISTS availability_booking_no_overlap_update
BEFORE UPDATE OF vanListingId, startDate, endDate, reason ON availability_block
WHEN NEW.reason = 'booking'
BEGIN
  SELECT RAISE(ABORT, 'BOOKING_DATES_UNAVAILABLE')
  WHERE EXISTS (
    SELECT 1
    FROM availability_block existing
    WHERE existing.id <> NEW.id
      AND existing.vanListingId = NEW.vanListingId
      AND existing.startDate <= NEW.endDate
      AND existing.endDate >= NEW.startDate
  );
END;

-- Deployment should fail if historical duplicate payouts need investigation.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_booking_unique ON payout(bookingId);
