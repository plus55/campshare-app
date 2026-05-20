# 06 — Roadmap

## Reading this doc

Sprints 1–6 are deployed and live. Sprint 7 is the next scheduled chunk. Everything below Sprint 7 is the **marketplace-complete backlog** — the full set of features a "standard" P2P camper rental site needs to be at competitor parity. Per Jonty's directive (2026-05-19), the backlog is the real target, not Sprint 7 alone.

Use this doc to plan the next sprint, not as a fixed delivery schedule.

## Sprint 1 — Auth foundations (done, deployed)

- Project skeleton (Next.js 15 App Router on Cloudflare Workers via OpenNext).
- Better Auth integration with D1.
- Email + password signup, login, verification, forgot-password.
- Google OAuth.
- Session helpers (`getSession` / `requireSession` / `requireAdmin`).
- Resend wired up for transactional email.

## Sprint 2 — Host onboarding + admin approval (done, deployed)

- 4-step host application form (about you → van → pricing → features/rules).
- Application stored in `host_application` table (now replaced by Sprint 3 schema).
- Admin list view at `/admin`.
- Admin single-application view with approve/reject buttons.
- Approval/rejection emails sent via Resend.
- Branded HTML email template.

## Sprint 3 — Listings, photos, calendar, public profile (done, deployed)

1. Split `host_application` into `host_profile` + `van_listing` (migration `001_split_host_application.sql`).
2. Van listing CRUD from the host dashboard. Multiple listings per host.
3. Photo upload direct to R2 via signed PUT URLs. `van_photo` table.
4. Availability calendar. `availability_block` table + calendar UI.
5. Public van profile page `/vans/[slug]` — server-rendered, indexable.
6. Listing moderation queue for admin. Status machine: `draft → pending_review → published / paused / archived`.

## Sprint 4 — Search, map, location landing pages (done, deployed)

1. Full-text + filter search at `/vans`: region, dates, price, sleeps, van type, pet-friendly, instant-book.
2. Mapbox map view with price-bubble markers. (Map is blank until `NEXT_PUBLIC_MAPBOX_TOKEN` is set — Jonty action.)
3. SEO location landing pages `/hire/[region]` for all 16 NZ regions.
4. Homepage redirects unauthenticated visitors to `/vans`.

## Sprint 5 — Bookings + minimal messaging (done, deployed)

Booking requests, accept/decline/cancel, availability block integration, booking-scoped messaging, transactional emails. State machine: `requested → accepted`, plus `declined`, `cancelled_by_*`, `expired` (lazy 48h).

## Sprint 6 — Stripe Connect + payments (done, deployed)

Stripe Connect (Express), guest payment via PaymentIntent (manual capture at accept), security deposit ($500 hold SetupIntent), host payouts via Connect transfer at trip completion + 24h, NZ GST on platform fees, cancellation refund policy, daily cron lifecycle, idempotent webhook handler.

Key product decisions frozen on the booking row:
- Commission: 12% guest / 5% host / 15% GST on fees
- Cancellation: `standard_v1` (>7d=100%, 2–7d=50%, <48h=0%)
- Deposit: $500 NZD

## Marketplace-complete backlog

These are the features a P2P camper rental site is generally expected to have. Order is rough — adjust based on what unlocks revenue, what unblocks the next thing, and what's painful to retrofit.

### Discovery & search (done in S4)

- Full-text + filter search: region, dates available, price range, sleeps, van type, features, pet-friendly, instant-book.
- Sort: price, rating, distance from a pickup point.
- Map view (Mapbox or Cloudflare's mapping partnership when available).
- Saved searches and email alerts when new vans match.
- SEO-friendly listing URLs, sitemap.xml, structured data (`Vehicle`, `Offer`).
- Location landing pages: `/queenstown-campervan-hire`, `/auckland-motorhome-rental`, etc. These rank well and convert.

### Bookings (S5-ish, the big one)

- Multi-day booking with date-range validation against `availability_block`.
- Instant-book vs. request-to-book per listing.
- Booking state machine: `requested → accepted → paid → confirmed → in_progress → completed`, plus `cancelled_by_*`, `declined`, `refunded`, `disputed`.
- Pickup / dropoff time scheduling.
- Extras / add-ons (bedding, BBQ, child seats, off-road insurance, generator, etc.) — host or platform-defined.
- Booking detail page (guest + host views of the same booking).

### Payments (done in S6)

- **Stripe Connect** (or equivalent — Adyen for Platforms, Stripe is the default) for marketplace payouts.
- Platform commission / service fee — guest-side and host-side splits.
- Security deposit hold (Stripe SetupIntent + manual capture or a hold pattern).
- Payout schedule (daily / weekly / on-completion + holdback window).
- Refunds, partial refunds.
- NZ GST handling — registration threshold, tax invoices, GST line items on receipts.
- Currency: NZD only initially.
- Webhooks: payment_intent.succeeded, charge.refunded, account.updated. Idempotent handlers stored in a `payment_event` table.

### Trust & safety (S7 — next)

- Guest identity / driver's licence verification (Stripe Identity, Onfido, or a NZ-specific KYC provider).
- Host KYC for payouts (Stripe Connect handles most of this).
- Age requirements (drivers ≥ 21, etc.) — configurable per listing.
- Two-way reviews + 1–5 star ratings, double-blind (both reviews hidden until both submitted or 14-day window closes).
- Report / block a user.
- Dispute workflow with admin queue.
- Audit log of admin actions on user-facing data.

### Insurance & condition reports (S7/8)

- Pre- and post-rental vehicle condition reports with photos, signed by both parties.
- Damage claim workflow tied to the security deposit.
- Insurance: either pass-through to a NZ third-party insurer (Cove, NZI, etc.) or build platform-provided cover. Regulatory + capital decision — talk to a broker before committing.
- Required documents per booking: licence photo, age confirmation, sometimes proof of overseas licence.

### Messaging (S8-ish)

- In-app messaging tied to a booking — not free-form host↔guest chat (prevents off-platform booking).
- Notifications on new message (email + in-app).
- Attachments (PDF pickup instructions, location maps).
- Template responses ("Pickup instructions", "Late return policy").

### Host tools (S9-ish, retention)

- Earnings dashboard — gross, fees, payouts, time-period filters.
- Occupancy rate per listing.
- Upcoming bookings calendar across all listings.
- iCal export / import for syncing with other channels (Camplify, Airbnb if cross-listing).
- Dynamic pricing: weekend / peak / seasonal multipliers, length-of-stay discounts (LOS).
- Cancellation policy selection (flexible / moderate / strict — frozen on the booking at time of booking).
- Auto-decline rules (e.g., minimum advance notice, blackout periods).
- Multi-photo upload with drag-to-reorder.

### Guest tools

- Trips dashboard (upcoming / past).
- Wishlists / favourites.
- Profile + verification status badge.
- Referral codes ("Get $50 off your first booking").

### Cancellations & changes

- Policy enforcement on the booking timeline (full refund > 7 days out, 50% > 48 hours, etc. for "flexible").
- Date change request flow (guest requests, host accepts, price diff settled).
- Host-initiated cancellation penalties to discourage churn.

### Admin / ops

- Listings moderation queue (Sprint 3 starts this).
- User moderation queue.
- Payout reconciliation view.
- Dispute queue.
- Fraud signals: rapid signup + immediate booking, mismatched billing/shipping country, etc.
- Analytics: GMV, take rate, conversion funnel (search → view → request → book → complete), host churn.
- Impersonation / "support mode" — act as a user for diagnosis. Always audit-logged.

### Cross-cutting

- Mobile-responsive UI (and eventually native apps via React Native or Expo).
- Accessibility (WCAG 2.1 AA at minimum — keyboard nav, screen-reader labels, color contrast).
- i18n hooks: English-first, but structure for te reo Māori and tourist-market languages (Mandarin, German).
- Legal pages: Terms, Privacy, Host Agreement, Guest Agreement, Insurance Terms, Cancellation Policy summary.
- Cookie consent banner (NZ Privacy Act + general best practice).
- Audit log of admin actions.
- Rate limiting on auth endpoints, booking endpoints (Cloudflare's built-in rate limit + a per-user counter in D1 for the slow path).
- Bot protection on signup (Cloudflare Turnstile is free and same-vendor).
- Error monitoring (Sentry or Cloudflare's Workers Observability) and uptime alerts.

## Suggested high-level ordering

```
Sprint 3   Listings + photos + calendar + public profile        ✅ done
Sprint 4   Search + filters + map + location landing pages      ✅ done
Sprint 5   Bookings (request flow only, no payments)            ✅ done
Sprint 6   Stripe Connect + payments + deposits + payouts + GST ✅ done
Sprint 7   KYC + reviews + dispute workflow + report/audit log  ← next
Sprint 8   Messaging + notifications  (Q3 2026)
Sprint 9   Host earnings + dynamic pricing + iCal sync  (Q3 2026)
Sprint 10  Insurance + condition reports  (Q4 2026)
Sprint 11  Admin moderation + analytics + audit log  (Q4 2026)
```

Quarter labels are guesses, not commitments. The point is the dependencies: payments need a working booking flow; reviews need completed bookings; dynamic pricing needs payment data; analytics need everything.

## Anti-goals (things to defer or skip)

- **Native apps before mobile-web works well.** Don't build two clients before validating one.
- **Multi-currency.** NZD-only. Tourists pay in NZD; their bank handles conversion.
- **Multi-country expansion.** NZ-first. Aussie expansion is a separate strategic conversation.
- **A separate "pro host" tier UI** until there are enough hosts that the lowest 80% would benefit from a simpler view.
- **A blog CMS in the app.** Put marketing content on the marketing site, not here.
