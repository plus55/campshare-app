-- Platform add-on catalogue (seeded by CampShare, not editable by hosts)
CREATE TABLE addon (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  description TEXT,
  priceType   TEXT    NOT NULL DEFAULT 'flat', -- 'flat' | 'per_night'
  sortOrder   INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1
);

-- Host-enabled add-ons per listing (host sets their own price)
CREATE TABLE listing_addon (
  id            TEXT    PRIMARY KEY,
  vanListingId  TEXT    NOT NULL REFERENCES van_listing(id) ON DELETE CASCADE,
  addonId       TEXT    NOT NULL REFERENCES addon(id),
  priceNZDCents INTEGER NOT NULL,
  UNIQUE(vanListingId, addonId)
);

-- Add-ons selected by a guest for a specific booking (snapshot at booking time)
CREATE TABLE booking_addon (
  id            TEXT    PRIMARY KEY,
  bookingId     TEXT    NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  addonId       TEXT    NOT NULL REFERENCES addon(id),
  name          TEXT    NOT NULL,
  priceNZDCents INTEGER NOT NULL
);

-- Track add-on revenue on the booking row for payout calculations
ALTER TABLE booking ADD COLUMN addonTotalCents INTEGER NOT NULL DEFAULT 0;

-- Seed the platform catalogue
INSERT INTO addon (id, name, description, priceType, sortOrder) VALUES
  ('addon_bedding',    'Bedding kit',              'Sheets, duvet, and pillows for all sleeping spots', 'flat', 1),
  ('addon_bbq',        'BBQ & gas',                'Portable gas BBQ with full gas bottle',             'flat', 2),
  ('addon_child_seat', 'Child seat',               'Age-appropriate child seat, fitted before pickup',  'flat', 3),
  ('addon_camp_table', 'Camp table & chairs',      'Folding table with two camp chairs',                'flat', 4),
  ('addon_awning',     'Awning / outdoor shelter', 'Clip-on awning for shade and light rain',           'flat', 5),
  ('addon_off_road',   'Off-road excess reduction','Reduces your damage liability on off-road tracks',  'flat', 6);
