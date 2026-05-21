CREATE TABLE date_change_request (
  id               TEXT    PRIMARY KEY,
  bookingId        TEXT    NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  requestedByUserId TEXT   NOT NULL,
  newStartDate     INTEGER NOT NULL,  -- unix ms
  newEndDate       INTEGER NOT NULL,  -- unix ms
  newNights        INTEGER NOT NULL,
  priceDiffCents   INTEGER NOT NULL,  -- positive = guest owes more, negative = refund
  status           TEXT    NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'declined' | 'cancelled'
  createdAt        INTEGER NOT NULL,
  respondedAt      INTEGER
);
