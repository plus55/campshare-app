# Sprint State

## Done — S10 Host Tools + Hardening (fully deployed 2026-05-23)

Hardening `89d599bb` (2026-05-22). Drag-to-reorder `5b6e6697`. Templates `388f0a3e`. IB gating consistency `1ff40555`. Booking atomicity `ea989d43`.

- [x] iCal export / import
- [x] Sort by rating / newest on `/vans`
- [x] Drag-to-reorder van photos (touch + long-press + batched `/api/photos/reorder`)
- [x] Message templates (per-host CRUD at `/dashboard/templates`, picker in host booking thread, 20-template cap, migration 012)
- [x] Instant-book eligibility gating (badges.ts logic + bookings API + PDP CTA + 4 surface pages: FeaturedVans, /hire/[region], /hosts/[userId], /dashboard/saved)
- [x] Booking atomicity (D1 batch writes — insert-first/capture-second/finalise-third for IB; batched accept + cancel; migration 013 payment_reconciliation table)
- [x] Turnstile bot protection on `/signup` + `/apply`
- [x] Cloudflare rate limits on `/api/auth` + `/api/bookings`

## Current: S11 — Public Launch Prep + Pillar Framework

### Track A — Tech-Readiness (critical path to Phase A Closed Beta)

- [ ] Live Stripe keys — flip from test to production; rotate `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` via Wrangler Bash printf
- [ ] Enable Stripe Identity in dashboard.stripe.com — **Jonty action** (standing blocker from S9)
- [x] Sentry SDK on app — `@sentry/nextjs` installed; `src/instrumentation-client.ts` (browser init); `src/app/error.tsx` + `src/app/global-error.tsx` (error boundaries). Needs `NEXT_PUBLIC_SENTRY_DSN` in wrangler.jsonc once Jonty creates free Sentry project.
- [x] Cloudflare Web Analytics on `app.campshare.co.nz` — `CookieConsent` component conditionally loads beacon on accept. Needs `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` in wrangler.jsonc once token from CF dashboard. Marketing site (`campshare.co.nz`) needs same in its own repo.
- [ ] Funnel analytics: PostHog free tier OR defer — **Jonty decision needed**
- [x] SEO basics (app domain): sitemap.ts already existed; improved (homepage priority 1.0, added host pages); robots.ts correct; OG + Twitter Card meta added to root layout + homepage. Marketing site sitemap/robots needs separate session in its own repo.
- [ ] Accessibility pass: keyboard nav + screen-reader on hero, search, PDP, booking widget (axe-core in dev + VoiceOver on iOS Safari)
- [ ] Mobile QA: full booking flow on physical iOS Safari + Android Chrome
- [x] Cookie consent banner — `src/components/CookieConsent.tsx` built (localStorage persistence, accept/decline, consent-gated analytics loading)
- [ ] Production smoke test: real $5 NZD booking end-to-end on live Stripe, then refund

### Track B — Pillar Framework (non-code, parallel, zero-spend)

- [x] Update `CampShare-Public-Launch.md`: Pillar 3 promoted from "future" to active planning track; Pillar 3 wedge rationale added; sequencing updated to include S11 planning
- [x] Update `12-Pillar2-Fleet.md`: bootstrap-scaled (2-3 vans, Auckland-only, Hiace 2-berth, founder capital only, outright purchase confirmed)
- [x] Draft `13-Pillar3-Buyback-Commercial-Spec.md`: commercial spec created covering target customer, pricing model, guarantee tier structure, ownership window, inspection/dispute format, legal posture choice, unit economics
- [x] Draft `13-Pillar3-Buyback-Legal-DIY.md` — complete. Key findings: MVT registration required from first commercial sale ($1,234 apply + $1,164/yr, no bond); NZTA transfers free online; CGA applies to every sale ("as is" void); FTA biggest advertising risk (guarantee % must be substantiated + conditions prominent); AML not applicable (cash >$10k banned for dealers since 2023). Travellers Autobarn model (% of purchase price locked at sale) confirmed as best structure.
- [x] Buy-back guarantee woven into `06-Brand-Marketing` (copy library), `08-SEO-Content` (Pillar 4 cluster + buy-back keywords), `10-Guest-Acquisition` (long-stay tourist segment)

### Standing blockers

- Stripe Identity dashboard toggle — Jonty action: `dashboard.stripe.com → Identity`
- Funnel analytics pick — Jonty decision: PostHog free tier vs defer to [[14-Analytics-KPIs]]

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
