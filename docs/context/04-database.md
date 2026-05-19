# 04 — Database

## D1 instance

- Binding: `DB` (declared in `wrangler.jsonc`)
- DB name: `campshare-db`
- DB ID: `a1a0059a-fdac-4f2b-858f-b8d563728d67`
- Driver: D1 (SQLite-compatible, async)
- ORM: Kysely with `kysely-d1`'s `D1Dialect`
- Source of truth for schema: `src/db/schema.sql`

## Current schema (as of 2026-05-19)

Five tables — four for Better Auth, one for the host onboarding flow.

### `user`

```sql
id            TEXT PRIMARY KEY
name          TEXT NOT NULL
email         TEXT NOT NULL UNIQUE
emailVerified INTEGER NOT NULL DEFAULT 0   -- 0/1 boolean
image         TEXT
createdAt     INTEGER NOT NULL              -- unix ms
updatedAt     INTEGER NOT NULL
```

A user is a person — host, guest, or admin. Roles are not stored on this table; admin is determined by `email === ADMIN_EMAIL`, host status is derived from `host_application.status = 'approved'`. This will need to grow into a proper roles model when there are more than one admin.

### `session`

```sql
id        TEXT PRIMARY KEY
userId    TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
token     TEXT NOT NULL UNIQUE
expiresAt INTEGER NOT NULL
ipAddress TEXT
userAgent TEXT
createdAt INTEGER NOT NULL
updatedAt INTEGER NOT NULL

INDEX idx_session_user ON session(userId)
```

Better Auth stores its session tokens here. Cookie-based, signed with `BETTER_AUTH_SECRET`.

### `account`

```sql
id                    TEXT PRIMARY KEY
userId                TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
providerId            TEXT NOT NULL                   -- 'email-password' | 'google'
accountId             TEXT NOT NULL                   -- provider's user ID
accessToken           TEXT
refreshToken          TEXT
accessTokenExpiresAt  INTEGER
refreshTokenExpiresAt INTEGER
scope                 TEXT
idToken               TEXT
password              TEXT                            -- bcrypt-hashed for email-password
createdAt             INTEGER NOT NULL
updatedAt             INTEGER NOT NULL

UNIQUE(providerId, accountId)
INDEX idx_account_user ON account(userId)
```

One row per auth method per user. A user with both email+password and Google linked has two rows.

### `verification`

```sql
id         TEXT PRIMARY KEY
identifier TEXT NOT NULL          -- usually the email
value      TEXT NOT NULL          -- the token
expiresAt  INTEGER NOT NULL
createdAt  INTEGER NOT NULL
updatedAt  INTEGER NOT NULL

INDEX idx_verification_identifier ON verification(identifier)
```

Used for email verification and password reset.

### `host_application`

```sql
id                TEXT PRIMARY KEY
userId            TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE

-- Step 1: about you
firstName         TEXT NOT NULL
lastName          TEXT NOT NULL
phone             TEXT NOT NULL
region            TEXT NOT NULL                       -- one of NZ_REGIONS
island            TEXT NOT NULL CHECK (island IN ('North', 'South'))

-- Step 2: van
vanName           TEXT NOT NULL
vanType           TEXT NOT NULL                       -- one of VAN_TYPES.value
vanYear           INTEGER NOT NULL
sleeps            INTEGER NOT NULL
seats             INTEGER NOT NULL
fixedToilet       INTEGER NOT NULL DEFAULT 0
description      TEXT NOT NULL

-- Step 3: pricing & availability
nightlyRate       INTEGER NOT NULL                    -- NZD cents
minimumNights     INTEGER NOT NULL                    -- one of MINIMUM_NIGHTS
availableFrom     INTEGER                             -- unix ms
availableTo       INTEGER
instantBook       INTEGER NOT NULL DEFAULT 0

-- Step 4: features & rules
features          TEXT NOT NULL DEFAULT '[]'          -- JSON array of strings
houseRules        TEXT NOT NULL DEFAULT ''
petFriendly       INTEGER NOT NULL DEFAULT 0

-- Review workflow
status            TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected'))
adminNote         TEXT
submittedAt       INTEGER NOT NULL
reviewedAt        INTEGER

INDEX idx_host_application_user   ON host_application(userId)
INDEX idx_host_application_status ON host_application(status)
```

**Important: this table is doing two things and will need to split.** It holds the *application* (about the host and their first van) and the *first van's listing data*. In Sprint 3, the van fields move into a new `van_listing` table, and `host_application` shrinks to just the personal/approval data. The current shape is a deliberate shortcut to ship onboarding before listings — don't model new flows on top of it.

## Planned schema (marketplace-complete)

This is a rough sketch, not a migration plan. Refine when each slice is being built. All columns assume `id TEXT PRIMARY KEY`, `createdAt INTEGER NOT NULL`, `updatedAt INTEGER NOT NULL` unless noted.

### `host_profile`

Stripped-down version of the current `host_application`, holding only the *person*. The application form populates this on approval.

```
userId                FK user
firstName, lastName, phone, region, island
verifiedIdentity      INTEGER (KYC status)
stripeAccountId       TEXT  (Stripe Connect)
bio                   TEXT
```

### `van_listing`

```
hostUserId            FK user
slug                  TEXT UNIQUE          (for /vans/<slug> public URL)
name, vanType, year
sleeps, seats, fixedToilet, petFriendly
description
nightlyRate           INTEGER (NZD cents)
minimumNights
instantBook           INTEGER
status                TEXT  (draft | published | paused | archived)
region, island, pickupLocationText, pickupLat, pickupLng
features              TEXT  (JSON array)
houseRules            TEXT
```

### `van_photo`

```
vanListingId          FK van_listing
r2Key                 TEXT  (path in R2 bucket)
position              INTEGER  (sort order)
caption               TEXT
```

### `availability_block`

```
vanListingId          FK van_listing
startDate             INTEGER (unix day)
endDate               INTEGER
reason                TEXT  (booking | host-blocked | maintenance)
bookingId             FK booking NULLABLE
```

Calendar is the union of all blocks. iCal import/export feeds this table.

### `booking`

```
vanListingId          FK van_listing
guestUserId           FK user
hostUserId            FK user (denormalised for queries)
startDate             INTEGER (unix day)
endDate               INTEGER
nightCount            INTEGER
nightlyRate           INTEGER  (frozen at booking time)
subtotal, serviceFee, hostPayout, securityDeposit, total  (all NZD cents)
gstAmount             INTEGER  (NZ GST)
status                TEXT
                      (requested | accepted | declined | paid | confirmed |
                       in_progress | completed | cancelled_by_guest |
                       cancelled_by_host | refunded | disputed)
paymentIntentId       TEXT  (Stripe)
depositChargeId       TEXT
cancellationPolicy    TEXT  (flexible | moderate | strict — frozen at booking)
acceptedAt, paidAt, startedAt, completedAt, cancelledAt   INTEGER
```

### `message`

```
bookingId             FK booking
senderUserId          FK user
body                  TEXT
attachments           TEXT  (JSON)
readAt                INTEGER NULLABLE
```

Messaging is per-booking, not per-user-pair, so dispute records have a clean conversation thread.

### `review`

```
bookingId             FK booking
authorUserId          FK user      (guest reviewing host, or host reviewing guest)
subjectUserId         FK user
direction             TEXT  (guest_to_host | host_to_guest)
rating                INTEGER  (1–5)
body                  TEXT
publishedAt           INTEGER  (both reviews hidden until both are submitted or window closes)
```

### `payout`

```
hostUserId            FK user
stripeTransferId      TEXT
amount                INTEGER (NZD cents)
bookingId             FK booking
status                TEXT  (pending | paid | failed | reversed)
```

### `dispute`

```
bookingId             FK booking
openedByUserId        FK user
reason                TEXT
status                TEXT  (open | investigating | resolved | escalated)
resolution            TEXT
adminUserId           FK user
```

### `audit_log` (admin)

```
adminUserId           FK user
action                TEXT
targetTable           TEXT
targetId              TEXT
detail                TEXT (JSON)
```

### Suggested additions for completeness

- `notification` — in-app notification queue.
- `wishlist` — guest-saved listings.
- `feature_flag` — runtime flags for staged rollouts.
- `coupon` / `referral` — promotional codes.

## Schema apply commands

```bash
# Remote (production D1)
wrangler d1 execute campshare-db --remote --file=src/db/schema.sql

# Local (development D1, used by `npm run dev`)
wrangler d1 execute campshare-db --local --file=src/db/schema.sql

# Ad-hoc query
wrangler d1 execute campshare-db --remote --command="SELECT count(*) FROM user"
```

The current `schema.sql` uses `CREATE TABLE IF NOT EXISTS`, so re-running it is safe. Once migrations are introduced, switch to numbered, idempotent migration files and a small runner.

## Query patterns

All DB calls go through Kysely (configured in `src/lib/db.ts` + `src/lib/auth.ts`):

```ts
const db = await getDB();
const apps = await db
  .selectFrom("host_application")
  .selectAll()
  .where("status", "=", "pending")
  .orderBy("submittedAt", "desc")
  .execute();
```

Avoid raw SQL strings in route files. If a query is awkward in Kysely, isolate it in `src/lib/` with a typed function signature, so the route stays clean.
