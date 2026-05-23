-- iCal export / import support
ALTER TABLE van_listing ADD COLUMN icalFeedUrl TEXT;

-- icalUid: non-null on blocks that came from an imported iCal feed (dedup key)
ALTER TABLE availability_block ADD COLUMN icalUid TEXT;
