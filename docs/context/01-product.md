# 01 — Product

## What CampShare is

CampShare is a **peer-to-peer marketplace for camper van and motorhome rentals in New Zealand**. Van owners list their vehicles; travellers book them by the night. The platform sits between the two sides, takes a commission, handles trust/safety, and runs the transactional plumbing (payments, messaging, reviews).

Domain: `campshare.co.nz` (marketing) + `app.campshare.co.nz` (this repo — authenticated app).

## Why NZ-first

New Zealand is a campervan-heavy tourism market with a long-tail of private owners whose vans sit idle 9–10 months a year. The Auckland/Christchurch fly-in-drive-out tourist loop and the well-established freedom-camping infrastructure mean demand is real and concentrated. Existing P2P platforms (Camplify is the dominant AU/NZ player) have national reach but generic UX; a NZ-native product can win on regional copy, NZ-specific van types (self-contained certified, school bus conversions), DOC/freedom-camping integrations, and te reo Māori friendliness.

## Users

**Hosts** — van owners. They:
1. Sign up.
2. Submit a 4-step host application (about you → van → pricing/availability → features/rules).
3. Wait for admin approval.
4. Once approved, manage their listing(s), availability, bookings, messages, and earnings from a dashboard.

**Guests** — travellers. They:
1. Browse and search vans (by region, dates, type, features).
2. View public van profiles.
3. Book dates (instant-book or request-to-book).
4. Pay through the platform (Stripe Connect or similar — not yet built).
5. Message the host, pick up the van, return it.
6. Leave a review; receive a review from the host.

**Admin** — Jonty, for now. The admin:
1. Approves/rejects host applications (built).
2. Will eventually moderate listings, handle disputes, reconcile payouts, see analytics, and impersonate users for support.

A single user can be both a host and a guest. The schema should not lock these into separate user pools.

## Two-sided dynamics

The marketplace classic chicken-and-egg: guests show up if vans are listed, hosts list if guests show up. Strategy implications:

- **Seed the host side first.** Sprint 2 covered onboarding and approval. Sprint 3 needs to give early hosts something real to manage (listing + photos + calendar) so they don't churn out before the demand side ships.
- **Public van profiles before bookings.** A listing that's discoverable on Google, even without an instant-book button, creates a top-of-funnel for SEO and lets guests warm up before payments are wired.
- **Bookings can be request-only initially.** "Request to book → host accepts → manual payment instructions" is a viable v1 path that punts Stripe Connect to v2 if needed, but introduces ops cost.

## Business model

Standard marketplace shape:

- **Commission / service fee** taken from each booking. Splits typically 10–15% guest-side and 3–10% host-side in this category; exact numbers TBD.
- **Security deposit** held during the rental period and released after return + post-rental check.
- **Optional add-ons** marked up (bedding, BBQ, child seats, etc.) — host or platform-provided.
- **Premium host placement** is a possible long-tail revenue stream once supply is dense enough that listings compete for visibility.
- **Insurance** is either passed through to a third party (revenue share) or built as a platform-provided cover with a premium baked into the booking — this is a regulatory + capital decision, not a quick build.

Currency is NZD. NZ GST handling is a real concern for the booking flow — see [`06-roadmap.md`](06-roadmap.md) under Payments.

## North-star scope

> "A scalable marketplace that is fully fleshed out with all features a standard peer to peer camper rental site would have."  
> — Jonty, 2026-05-19

That phrase is load-bearing. Decisions should anticipate competitor parity (Camplify, Outdoorsy, Camptoo) and not MVP-shape. Concretely this means: search + map + filters, bookings with a real state machine, marketplace payments (Stripe Connect or similar) with deposits and platform fees, two-way reviews, in-app messaging tied to bookings, identity verification, host/guest KYC, insurance + condition reports, dispute resolution, cancellation policies, multi-listing per host, iCal sync, dynamic pricing, mobile-responsive UI, SEO-friendly public listing pages, and admin tooling for moderation and reconciliation.

The full gap list is in [`06-roadmap.md`](06-roadmap.md). Treat it as the real backlog, not a wish list.

## What the brand should feel like

Friendly, NZ-flavoured, outdoorsy but not crunchy-granola. The marketing copy and onboarding tone should sound like a knowledgeable local, not corporate travel. Practical specifics over aspirational lifestyle imagery — show the dump-point capability, the diesel heater, the realistic price per night.
