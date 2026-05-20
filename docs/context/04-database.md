# 04 — Database

## D1 instance

- Binding: `DB` (declared in `wrangler.jsonc`)
- DB name: `campshare-db`
- DB ID: `a1a0059a-fdac-4f2b-858f-b8d563728d67`
- Driver: D1 (SQLite-compatible, async)
- ORM: raw D1 — `db().prepare(...).bind(...).run()` (no Kysely in route files)
- Source of truth for schema: `src/db/schema.sql` (initial) + `src/db/migrations/00*.sql`

## Current schema (as of 2026-05-20, post-Sprint-6)

13 tables — 4 Better Auth tables + 9 application tables. Applied via `schema.sql` then migrations 001, 002, 003 in order.

### Better Auth tables (managed by Better Auth, don't edit directly)

**`user`** — one row per person (host, guest, admin).
```sql
id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, emailVerified INTEGER, image TEXT, createdAt INTEGER, updatedAt INTEGER
```
Admin is `email === ADMIN_EMAIL`. Host status derived from `host_profile` existence.

**`session`** — cookie-based sessions signed with `BETTER_AUTH_SECRET`.
```sql
id TEXT PRIMARY KEY, userId FK user, token TEXT UNIQUE, expiresAt INTEGER, ipAddress TEXT, userAgent TEXT, createdAt INTEGER, updatedAt INTEGER
INDEX idx_session_user(userId)
```

**`account`** — one row per auth method per user (`email-password` or `google`).
```sql
id TEXT PRIMARY KEY, userId FK user, providerId TEXT, accountId TEXT, accessToken TEXT, refreshToken TEXT, password TEXT, createdAt INTEGER, updatedAt INTEGER
UNIQUE(providerId, accountId)
```

**`verification`** — email verification + password reset tokens.
```sql
id TEXT PRIMARY KEY, identifier TEXT, value TEXT, expiresAt INTEGER, createdAt INTEGER, updatedAt INTEGER
```

---

### `host_profile` (migration 001)

Created when admin approves a host application. Holds the person, not the van.

```sql
userId                    TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE
firstName                 TEXT NOT NULL
lastName                  TEXT NOT NULL
phone                     TEXT NOT NULL
region                    TEXT NOT NULL
island                    TEXT NOT NULL CHECK (island IN ('North', 'South'))
bio                       TEXT
verifiedIdentity          INTEGER NOT NULL DEFAULT 0   -- KYC flag (S7)
stripeAccountId           TEXT                          -- Stripe Connect account ID
stripeOnboardingCompleted INTEGER NOT NULL DEFAULT 0   -- 1 once Express onboarding done
createdAt                 INTEGER NOT NULL
updatedAt                 INTEGER NOT NULL
```

### `van_listing` (migration 001)

One listing per van (host may have multiple).

```sql
id                TEXT PRIMARY KEY
hostUserId        TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
slug              TEXT NOT NULL UNIQUE       -- permanent, set on create
name              TEXT NOT NULL
vanType           TEXT NOT NULL
year              INTEGER NOT NULL
sleeps            INTEGER NOT NULL
seats             INTEGER NOT NULL
fixedToilet       INTEGER NOT NULL DEFAULT 0
petFriendly       INTEGER NOT NULL DEFAULT 0
description       TEXT NOT NULL
nightlyRate       INTEGER NOT NULL           -- NZD cents
minimumNights     INTEGER NOT NULL
instantBook       INTEGER NOT NULL DEFAULT 0
status            TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','pending_review','published','paused','archived'))
adminNote         TEXT
region            TEXT NOT NULL
island            TEXT NOT NULL CHECK (island IN ('North', 'South'))
pickupLocationText TEXT
pickupLat         REAL
pickupLng         REAL
features          TEXT NOT NULL DEFAULT '[]'  -- JSON array
houseRules        TEXT NOT NULL DEFAULT ''
publishedAt       INTEGER
createdAt         INTEGER NOT NULL
updatedAt         INTEGER NOT NULL

INDEX idx_van_listing_host(hostUserId)
INDEX idx_van_listing_status(status)
INDEX idx_van_listing_slug(slug)
```

### `van_photo` (migration 001)

```sql
id            TEXT PRIMARY KEY
vanListingId  TEXT NOT NULL REFERENCES van_listing(id) ON DELETE CASCADE
r2Key         TEXT NOT NULL         -- path in R2 bucket
position      INTEGER NOT NULL DEFAULT 0
caption       TEXT
createdAt     INTEGER NOT NULL
```

### `availability_block` (migration 001)

Calendar is union of all blocks. Inserted/deleted by booking accept/cancel.

```sql
id           TEXT PRIMARY KEY
vanListingId TEXT NOT NULL REFERENCES van_listing(id) ON DELETE CASCADE
startDate    INTEGER NOT NULL   -- unix ms, Date.UTC midnight
endDate      INTEGER NOT NULL   -- unix ms, Date.UTC midnight
reason       TEXT NOT NULL CHECK (reason IN ('booking','host-blocked','maintenance'))
bookingId    TEXT               -- FK booking (nullable)
createdAt    INTEGER NOT NULL
```

### `booking` (migration 002, rebuilt in 003)

```sql
id                      TEXT PRIMARY KEY
vanListingId            TEXT NOT NULL REFERENCES van_listing(id) ON DELETE CASCADE
guestUserId             TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
hostUserId              TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
startDate               INTEGER NOT NULL   -- unix ms UTC midnight
endDate                 INTEGER NOT NULL   -- unix ms UTC midnight
nights                  INTEGER NOT NULL
guestCount              INTEGER NOT NULL
nightlyRateCents        INTEGER NOT NULL   -- frozen at request time
subtotalCents           INTEGER
serviceFeeCents         INTEGER
gstOnFeeCents           INTEGER
hostPayoutCents         INTEGER
totalCents              INTEGER NOT NULL
depositCents            INTEGER NOT NULL DEFAULT 50000   -- $500 NZD
cancellationPolicy      TEXT NOT NULL DEFAULT 'standard_v1'
guestMessage            TEXT
status                  TEXT NOT NULL DEFAULT 'requested'
                        CHECK (status IN (
                          'requested','accepted','in_progress','completed',
                          'declined','cancelled_by_guest','cancelled_by_host','expired'
                        ))
statusReason            TEXT
paymentIntentId         TEXT   -- Stripe PI for the booking amount
depositPaymentIntentId  TEXT   -- Stripe PI for $500 deposit hold
depositPaymentMethodId  TEXT   -- saved PM for deposit charge
customerStripeId        TEXT   -- Stripe Customer ID
requestedAt             INTEGER NOT NULL
respondedAt             INTEGER
paidAt                  INTEGER
startedAt               INTEGER
completedAt             INTEGER
cancelledAt             INTEGER
expiresAt               INTEGER NOT NULL   -- requestedAt + 48h
createdAt               INTEGER NOT NULL
updatedAt               INTEGER NOT NULL

INDEX idx_booking_listing(vanListingId)
INDEX idx_booking_guest(guestUserId)
INDEX idx_booking_host(hostUserId)
INDEX idx_booking_status(status)
```

### `booking_message` (migration 002)

```sql
id           TEXT PRIMARY KEY
bookingId    TEXT NOT NULL REFERENCES booking(id) ON DELETE CASCADE
senderUserId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
body         TEXT NOT NULL
readAt       INTEGER
createdAt    INTEGER NOT NULL
```

### `user_payment_profile` (migration 003)

Stripe Customer ID per user.

```sql
userId           TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE
stripeCustomerId TEXT NOT NULL
createdAt        INTEGER NOT NULL
```

### `payment_event` (migration 003)

Idempotent webhook handler — one row per Stripe event received.

```sql
id            TEXT PRIMARY KEY
stripeEventId TEXT NOT NULL UNIQUE
eventType     TEXT NOT NULL
bookingId     TEXT REFERENCES booking(id)
payload       TEXT NOT NULL   -- raw JSON
status        TEXT NOT NULL DEFAULT 'pending'
processedAt   INTEGER
createdAt     INTEGER NOT NULL

INDEX idx_payment_event_stripe(stripeEventId)
INDEX idx_payment_event_booking(bookingId)
```

### `payout` (migration 003)

One row per Connect transfer to a host.

```sql
id               TEXT PRIMARY KEY
bookingId        TEXT NOT NULL REFERENCES booking(id)
hostUserId       TEXT NOT NULL REFERENCES user(id)
amountCents      INTEGER NOT NULL
stripeTransferId TEXT
status           TEXT NOT NULL DEFAULT 'pending'
createdAt        INTEGER NOT NULL
updatedAt        INTEGER NOT NULL

INDEX idx_payout_booking(bookingId)
INDEX idx_payout_host(hostUserId)
```

---

## Planned tables (not yet built)

These are sketched for future sprints — refine when each slice is built.

### `review` (S7)

```
bookingId      FK booking
authorUserId   FK user      -- guest reviewing host, or host reviewing guest
subjectUserId  FK user
direction      TEXT         -- guest_to_host | host_to_guest
rating         INTEGER      -- 1–5
body           TEXT
publishedAt    INTEGER      -- double-blind: hidden until both submitted or 14-day window closes
```

### `dispute` (S7)

```
bookingId       FK booking
openedByUserId  FK user
reason          TEXT
status          TEXT    -- open | investigating | resolved | escalated
resolution      TEXT
adminUserId     FK user
```

### `audit_log` (S7)

```
adminUserId  FK user
action       TEXT
targetTable  TEXT
targetId     TEXT
detail       TEXT  -- JSON
```

### Suggested additions for later sprints

- `notification` — in-app notification queue (S8)
- `wishlist` — guest-saved listings
- `feature_flag` — runtime flags for staged rollouts
- `coupon` / `referral` — promotional codes

## Schema apply commands

```bash
# Apply initial schema (first-time only)
npx wrangler d1 execute campshare-db --remote --file=src/db/schema.sql
npx wrangler d1 execute campshare-db --local  --file=src/db/schema.sql

# Apply a numbered migration
npx wrangler d1 execute campshare-db --remote --file=src/db/migrations/003_payments_and_payouts.sql
npx wrangler d1 execute campshare-db --local  --file=src/db/migrations/003_payments_and_payouts.sql

# Ad-hoc query
npx wrangler d1 execute campshare-db --remote --command="SELECT count(*) FROM user"
```

## Query patterns

All application DB calls use raw D1 — not Kysely. Better Auth still uses Kysely internally via its adapter.

```ts
import { db } from '@/lib/db';

const booking = await db()
  .prepare('SELECT * FROM booking WHERE id = ?')
  .bind(id)
  .first();

const results = await db()
  .prepare('SELECT * FROM booking WHERE hostUserId = ? AND status = ?')
  .bind(userId, 'requested')
  .all();
```

`db()` is a helper in `src/lib/db.ts` that calls `getCloudflareContext().env.DB` and returns the D1 binding. Never call `getCloudflareContext()` at module level — it must be called inside a request handler.
