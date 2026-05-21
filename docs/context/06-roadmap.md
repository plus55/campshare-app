# 06 — Roadmap

## Reading this doc

Sprints 1–6 are deployed and live. Sprint 7 (app chrome + navigation) is implemented locally on 2026-05-21 and pending deploy. Sprint 8 (trust & safety) is next. Everything below Sprint 8 is the **marketplace-complete backlog** — the full set of features a "standard" P2P camper rental site needs to be at competitor parity. Per Jonty's directive (2026-05-19), the backlog is the real target, not any one sprint.

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

## Sprint 7 — App chrome + navigation + homepage facelift (deployed 2026-05-21)

**Scope change:** S7 was originally planned as KYC + reviews + disputes. On 2026-05-21 Jonty flagged that the app's lack of shared chrome (different header per page, dead-end navigation, visual mismatch with the marketing site) was blocking his ability to demo and test. S7 was redirected to fix this; trust-and-safety work moved to **S8**. Mid-sprint, after a UI audit of Camplify AU+NZ, Goboony, and Quirky Campers, an additional "Phase B" facelift was bundled into S7 to close the most visible discovery gaps (no homepage, listing cards lacked owner attribution).

### Phase A — shared chrome (deployed 2026-05-21, version `cb1e024b`)

- Marketing site palette + chrome (`.site-header`, `.nav`, `.brand-mark`, `.btn` family, `.site-footer`, `.footer-grid`, `.wrap`) ported from `https://github.com/plus55/campshare/blob/main/styles.css` into `src/app/globals.css`. Existing `.cs-*` tokens re-pointed onto the marketing palette — zero page rewrites needed.
- Shared `SiteHeader` (session-aware: logged-out shows Browse · Hire · Become a host · Log in · Sign up; logged-in shows Browse · My trips · Dashboard · avatar menu).
- `SiteFooter` with 4 columns (Hire · Own · Company · Legal), in-app routes where they exist and marketing-site links elsewhere.
- Mobile hamburger menu, user-menu dropdown (Dashboard / Bookings / My trips / Payouts / Profile / Sign out), `aria-current` active-link state via a small client island.
- Inline brand marks and redundant `← Dashboard` back-links stripped from 16 page files.
- `/vans` browse page refactored to share viewport with the sticky global header (`height: calc(100vh - var(--header-h))`).

### Phase B — marketing homepage + listing card facelift (deployed 2026-05-21, version `e4d9c4ab`)

- `src/app/page.tsx` no longer a redirect for logged-out visitors; renders a 7-section marketing homepage. Logged-in still redirects to `/dashboard`.
- New `src/components/home/` dir, each section a server component:
  - `HomeHero` — pill-shaped search form (region select, check-in date, check-out date) wrapped in `<form action="/vans" method="get">`. Pure HTML — works without JS. Mobile breakpoint at 720px stacks vertically (rule in `globals.css`, keyed off `.home-hero-form`).
  - `TrustBanner` — forest-deep strip with live van count from D1 + trust messaging.
  - `FeaturedVans` — 6 most-recently-published listings via `ListingCard`.
  - `HowItWorks` — three numbered cards (Search → Book → Hit the road).
  - `CategoryCards` — 4 deep-linked filters (Pet-friendly, Family-size, Self-contained, Instant book) → `/vans?petFriendly=1` etc.
  - `RegionGrid` — 16 regions split North/South, each linking to existing `/hire/[region]`.
  - `HomepageFaq` — `<details>` accordion, 6 Q&As (3 traveller, 3 owner).
- `ListingCard` (`src/app/vans/ListingCard.tsx`) extended with `hostFirstName`, `hostImage`, `avgRating`, `reviewCount`. Renders owner avatar (24px round, falls back to initial) + first name above the title; renders star+rating row only when `reviewCount > 0` (reserved slot for Phase D reviews — no card revisit needed when reviews ship).
- SELECTs in `src/app/vans/page.tsx`, `src/app/hire/[region]/page.tsx`, and `FeaturedVans` all LEFT JOIN `host_profile` + `user`; review fields stubbed as `NULL`/`0`.

Full detail in `docs/context/05-current-state.md` → "Sprint 7 — what was built".

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

### Trust & safety (S8 — next)

- Guest identity / driver's licence verification (Stripe Identity, Onfido, or a NZ-specific KYC provider).
- Host KYC for payouts (Stripe Connect handles most of this).
- Age requirements (drivers ≥ 21, etc.) — configurable per listing.
- Two-way reviews + 1–5 star ratings, double-blind (both reviews hidden until both submitted or 14-day window closes).
- Report / block a user.
- Dispute workflow with admin queue.
- Audit log of admin actions on user-facing data.

### Insurance & condition reports (S8/9)

- Pre- and post-rental vehicle condition reports with photos, signed by both parties.
- Damage claim workflow tied to the security deposit.
- Insurance: either pass-through to a NZ third-party insurer (Cove, NZI, etc.) or build platform-provided cover. Regulatory + capital decision — talk to a broker before committing.
- Required documents per booking: licence photo, age confirmation, sometimes proof of overseas licence.

### Messaging (S9-ish)

- In-app messaging tied to a booking — not free-form host↔guest chat (prevents off-platform booking).
- Notifications on new message (email + in-app).
- Attachments (PDF pickup instructions, location maps).
- Template responses ("Pickup instructions", "Late return policy").

### Host tools (S10-ish, retention)

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
Sprint 3      Listings + photos + calendar + public profile         ✅ done
Sprint 4      Search + filters + map + location landing pages       ✅ done
Sprint 5      Bookings (request flow only, no payments)             ✅ done
Sprint 6      Stripe Connect + payments + deposits + payouts + GST  ✅ done
Sprint 7A     App chrome + shared nav + marketing style alignment   ✅ done
Sprint 7B     Marketing homepage + listing card facelift            ✅ done
Sprint 7C     PDP polish (two-column, lightbox, sticky CTA, map,
              similar listings, share) + wishlist (migration 004)   ← next
Sprint 7D/8A  Reviews + host profile + admin audit log
              (migration 005, 14d double-blind, /hosts/[userId])
Sprint 8B     KYC (Stripe Identity) + report/block + disputes
              + computed host badges  (deferred per founder)
Sprint 9      Messaging + notifications  (Q3 2026)
Sprint 10     Host earnings + dynamic pricing + iCal sync  (Q3 2026)
Sprint 11     Insurance + condition reports  (Q4 2026)
Sprint 12     Admin moderation + analytics + audit log  (Q4 2026)
```

Note: S7 was extended mid-sprint into phases A/B/C/D to absorb the discovery + reviews scope that the competitor UI audit (2026-05-21) surfaced as higher priority than the original S8 trust-and-safety scope. Reactive S8 items (KYC, reports, disputes, badges) explicitly deferred — they're highest-leverage after first incident, not before.

Quarter labels are guesses, not commitments. The point is the dependencies: payments need a working booking flow; reviews need completed bookings; dynamic pricing needs payment data; analytics need everything.

## Anti-goals (things to defer or skip)

- **Native apps before mobile-web works well.** Don't build two clients before validating one.
- **Multi-currency.** NZD-only. Tourists pay in NZD; their bank handles conversion.
- **Multi-country expansion.** NZ-first. Aussie expansion is a separate strategic conversation.
- **A separate "pro host" tier UI** until there are enough hosts that the lowest 80% would benefit from a simpler view.
- **A blog CMS in the app.** Put marketing content on the marketing site, not here.
