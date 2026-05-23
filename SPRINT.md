# Sprint State

## Current: S10 — Host Tools + Hardening
In progress. Hardening deployed 2026-05-22 version `89d599bb`. Drag-to-reorder deployed 2026-05-23 version `5b6e6697`.

- [x] iCal export / import
- [x] Sort by rating / newest on `/vans`
- [x] Drag-to-reorder van photos (touch + long-press + batched `/api/photos/reorder`)
- [ ] Message templates
- [ ] Instant-book eligibility gating
- [ ] Booking atomicity (D1 batch writes)
- [x] Turnstile bot protection on `/signup` + `/apply`
- [x] Cloudflare rate limits on `/api/auth` + `/api/bookings`

## Done — S9 Trust & Safety (deployed 2026-05-21, version `607508a9`)

- KYC — Stripe Identity mandatory for all guests before first booking
- Report / block — guest ↔ host; enforced in booking creation
- Dispute workflow — admin queue + per-booking dispute form (7d window post-completion)
- Host badges — Super Host, Responds Reliably, Verified (src/lib/badges.ts)
- Min driver age — per-listing (18/21/25); enforced server-side against KYC DOB

**Standing blocker:** Stripe Identity must be enabled at dashboard.stripe.com → Identity before KYC works end-to-end. Code is live, waiting on dashboard toggle.

## Done — S8 (deployed 2026-05-21, version `2cf4465c`)

- Instant-book fix
- Add-ons catalogue (migration 007)
- Date change requests (migration 008)
- Payouts gross/fee breakdown
- Saved searches + email alerts (migration 009)

## Don't touch yet

- Live Stripe keys (S11)
- Legal pages / Terms / Privacy (S11)
- CampShare Fleet (Pillar 2 — not scoped)
- Buy-Back Program (Pillar 3 — not scoped)
