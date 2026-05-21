CREATE TABLE wishlist (
  userId       TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  vanListingId TEXT    NOT NULL REFERENCES van_listing(id) ON DELETE CASCADE,
  createdAt    INTEGER NOT NULL,
  PRIMARY KEY (userId, vanListingId)
);
CREATE INDEX idx_wishlist_user ON wishlist(userId);
