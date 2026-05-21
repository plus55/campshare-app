# 05 — Current State

> Snapshot as of **2026-05-21 (Sprints 1–7B deployed)**. Verify with `git log` and the Cloudflare dashboard before acting on anything load-bearing here.

## Headline

**Sprints 1–7B are deployed and live at https://app.campshare.co.nz** (Cloudflare Worker, version `e4d9c4ab`, deployed 2026-05-21).

S7 was originally KYC + reviews + disputes, but on 2026-05-21 the founder flagged that the app's lack of shared chrome was blocking demo/test work. S7 was redirected to ship in phases: **7A** (shared chrome + nav) deployed first, then a competitor UI audit of Camplify AU+NZ + Goboony + Quirky Campers surfaced ~17 discovery/trust gaps, so **7B** (marketing homepage + listing-card facelift with owner attribution) was bundled into S7. Next up: **7C** (PDP polish + wishlist) and **7D / 8A** (reviews + host profile + audit log). Reactive S8 items (KYC, reports, disputes, badges) are explicitly deferred to a follow-up sprint.

The app supports: auth, host onboarding, van listings, photo upload to R2, availability calendars, public search with Mapbox map, 16 location landing pages, booking requests with booking-scoped messaging, Stripe Connect payments with security deposit, payouts, NZ GST, shared header/footer/avatar-menu chrome unified with the marketing site, and a 7-section marketing homepage at `/` with hero search, featured vans, how-it-works, category cards, region grid, and FAQ.

---

## What is deployed and working

| Sprint | Scope | Status |
|---|---|---|
| S1 | Auth — email+password, Google OAuth, magic link, reset | ✅ Deployed |
| S2 | Host application form, admin approval/rejection, transactional email | ✅ Deployed |
| S3 | Host profile, van listing CRUD, R2 photo upload, availability calendar, public `/vans/[slug]` page, admin moderation queue | ✅ Deployed |
| S4 | Search page `/vans` with filters, Mapbox map, `/hire/[region]` SEO landing pages, homepage redirect | ✅ Deployed |
| S5 | Booking requests, accept/decline/cancel, availability block integration, booking-scoped messaging, transactional emails | ✅ Deployed |
| S6 | Stripe Connect, payments, security deposit, payouts, NZ GST, cron lifecycle, cancellation policy | ✅ Deployed |
| S7A | Shared app chrome (header/footer/avatar menu) + nav dead-end fix + marketing-site style alignment | ✅ Deployed (version `cb1e024b`) |
| S7B | Marketing homepage at `/` (hero, trust banner, featured vans, how-it-works, categories, region grid, FAQ) + listing-card facelift (owner avatar + name + reserved rating slot) | ✅ Deployed (version `e4d9c4ab`) |

---

## Sprint 6 — what was built (deployed 2026-05-20)

### Product decisions

- Commission: 12% guest-side + 5% host-side (~17% platform take)
- Charge timing: on host accept (PaymentIntent pre-authorised at request, captured at accept)
- GST: 15% on platform fees only
- Security deposit: $500 NZD, SetupIntent → deposit hold PI at trip start
- Payout timing: trip completion + 24h holdback (cron advances state daily)
- Cancellation policy: single platform-wide — `standard_v1` (>7d = 100%, 2–7d = 50%, <48h = 0%)

### New files

| File | Purpose |
|---|---|
| `src/db/migrations/003_payments_and_payouts.sql` | Rebuilds `booking` with payment columns; adds `payment_event`, `payout`, `user_payment_profile`; adds `host_profile.stripeOnboardingCompleted` |
| `src/lib/stripe.ts` | Lazy Stripe client using `Stripe.createFetchHttpClient()` (required for Workers) |
| `src/lib/money.ts` | `calcBookingTotals()`, fee constants (`COMMISSION_GUEST_PCT=12`, `COMMISSION_HOST_PCT=5`, `GST_PCT=15`), `fmtNzd()` |
| `src/lib/cancellation.ts` | `refundPercent()`, `computeRefundCents()` — standard_v1 policy |
| `src/app/api/bookings/payment-intent/route.ts` | Creates Stripe Customer + PaymentIntent (manual capture, setup_future_usage=off_session) |
| `src/app/api/webhooks/stripe/route.ts` | Idempotent Stripe webhook handler; stores events in `payment_event` |
| `src/app/api/cron/booking-lifecycle/route.ts` | Daily cron: accepted→in_progress (deposit hold), in_progress→completed (deposit release + transfer) |
| `src/app/api/host/stripe/onboard/route.ts` | Connect Express onboarding — POST returns URL, GET returns status |
| `src/app/api/host/stripe/dashboard/route.ts` | Stripe Express dashboard login link |
| `src/app/dashboard/payouts/page.tsx` | Payout history list |
| `src/app/dashboard/payouts/onboard/page.tsx` | **Client Component** — POSTs to API then `window.location.href` (Server Components cannot redirect to external URLs) |
| `src/components/StripeDashboardButton.tsx` | Client button for Stripe Express dashboard |
| `src/components/SignOutButton.tsx` | Client sign-out button — Better Auth requires `application/json`; `<form method="post">` was rejected |

### Modified files

| File | Change |
|---|---|
| `src/app/api/bookings/route.ts` | Booking creation computes Stripe totals via `calcBookingTotals()` |
| `src/app/api/bookings/[id]/accept/route.ts` | Captures PI on accept |
| `src/app/api/bookings/[id]/decline/route.ts` | Cancels PI on decline |
| `src/app/api/bookings/[id]/cancel/route.ts` | Refund logic per cancellation policy |
| `src/app/vans/[slug]/BookingRequestForm.tsx` | Stripe Elements integration (CardElement, PaymentIntent confirmation) |
| `src/app/dashboard/bookings/[id]/page.tsx` | Shows payment status |
| `src/app/trips/[id]/page.tsx` | Shows payment status |
| `src/app/dashboard/page.tsx` | Payouts nav link + Stripe onboarding prompt |
| `src/components/BookingActions.tsx` | New states |
| `src/components/BookingStatusBadge.tsx` | New states (`in_progress`, `completed`) |
| `src/lib/email.ts` | Payment-related transactional emails |
| `src/lib/types.ts` | Extended booking types |
| `wrangler.jsonc` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` var + `triggers.crons: ["0 0 * * *"]` |

### Booking state machine (v2)

```
requested (PI confirmed, capture_method=manual; PM saved via setup_future_usage)
  ├── host accepts ── PI captured → accepted (paid)
  │       ├── cron: startDate reached → in_progress + deposit hold PI ($500)
  │       │       └── cron: endDate + 24h → completed + deposit released + Connect transfer
  │       ├── host cancels → 100% refund → cancelled_by_host
  │       └── guest cancels → per policy (>7d=100%, 2-7d=50%, <48h=0%) → cancelled_by_guest
  ├── host declines → PI cancelled → declined
  ├── guest cancels → PI cancelled → cancelled_by_guest
  └── 48h expire → PI cancelled → expired
```

### Stripe setup status (as of 2026-05-20)

| Item | Status |
|---|---|
| Stripe sandbox account | ✅ Created |
| `STRIPE_SECRET_KEY` Worker secret | ✅ Set |
| `STRIPE_WEBHOOK_SECRET` Worker secret | ✅ Set |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` wrangler var | ✅ Set |
| Webhook endpoint registered | ✅ `https://app.campshare.co.nz/api/webhooks/stripe` |
| Stripe Connect enabled on platform | ✅ Enabled |
| Jonty's Stripe Express onboarding | ✅ Complete (`stripeOnboardingCompleted = 1`, `acct_1TZ1saLvfKPKgWbz`) |
| E2E sandbox booking test | ✅ Passed (2026-05-20) — booking `1259b781`, PI `pi_3TZ7d1L0Mn9hYRhm1830mQ14` captured |

---

## Infrastructure state (2026-05-20)

| Resource | Status | Detail |
|---|---|---|
| GitHub repo | Sprint 6 + fixes | Latest commit `0d8fec3` |
| Cloudflare Worker | S1–S6 live | `app.campshare.co.nz`, version `d49d8bd7` |
| D1 remote | Sprint 6 schema | 13 tables |
| Worker secrets | All set | See table below |
| wrangler.jsonc vars | All set | See table below |
| R2 bucket | ✅ Created + public | `campshare-photos`, `https://pub-4433449fb7ff44d2b0ecb6d7e21faafa.r2.dev` |
| Google OAuth (prod) | ✅ Working | |
| Resend email | ✅ Working | campshare.co.nz domain verified |
| Mapbox map | ⚠️ Token missing | Map panel blank until `NEXT_PUBLIC_MAPBOX_TOKEN` is added |
| Stripe Connect | ✅ Connected | Sandbox — test mode only |

### Worker secrets

| Secret | Purpose |
|---|---|
| `BETTER_AUTH_SECRET` | Signs auth sessions |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `RESEND_API_KEY` | Email |
| `EMAIL_FROM` | Email from address |
| `R2_ACCOUNT_ID` | R2 SigV4 |
| `R2_ACCESS_KEY_ID` | R2 token |
| `R2_SECRET_ACCESS_KEY` | R2 token |
| `STRIPE_SECRET_KEY` | Stripe API (test key) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |

### wrangler.jsonc vars

| Var | Value |
|---|---|
| `BETTER_AUTH_URL` | `https://app.campshare.co.nz` |
| `ADMIN_EMAIL` | `jontydavies7@gmail.com` |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | `https://pub-4433449fb7ff44d2b0ecb6d7e21faafa.r2.dev` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_51TZ1CtL0Mn9...` |

---

## Sprint 7A — what was built (deployed 2026-05-21, version `cb1e024b`)

### Why the scope changed

S7 was originally planned as KYC + reviews + disputes. On 2026-05-21 Jonty flagged two UX problems that were blocking his ability to demo and test the app:
1. Visual inconsistency — the app looked nothing like the marketing site even though the brand was supposed to match.
2. Navigation dead-ends — e.g. clicking "Browse vans" from the dashboard left no way back, because each page rendered its own ad-hoc header instead of sharing a global nav.

S7 was redirected to fix both. Trust-and-safety work moved to **S8**.

### What changed

- `src/app/globals.css` — added the marketing site's full token palette (`--forest-deep`, `--cream`, `--clay`, `--ochre`, `--stone`, `--line`, etc.) from `https://github.com/plus55/campshare/blob/main/styles.css`. Existing `--sand-*`/`--ink-*`/`--clay-*`/`--moss-*` tokens were **re-pointed** onto the marketing palette so every existing `.cs-page`/`.cs-card`/`.cs-btn-primary` reskins automatically without per-page edits. Marketing chrome classes (`.site-header`, `.nav`, `.brand`, `.brand-mark`, `.nav-links`, `.btn` family, `.site-footer`, `.footer-grid`, `.wrap`) appended verbatim. The two button class families (`.cs-btn-*` for page bodies, `.btn-*` for chrome) coexist deliberately.
- New components in `src/components/`:
  - `SiteHeader.tsx` — Server Component, reads session, renders logged-in or logged-out nav
  - `SiteFooter.tsx` — Server Component, 4-column footer pointing to in-app routes where they exist, marketing site elsewhere
  - `UserMenu.tsx` — Client island, avatar circle + dropdown (Dashboard / Bookings / My trips / Payouts / Profile / Sign out)
  - `MobileMenuToggle.tsx` — Client island, toggles `.open` on `.nav-links` at the mobile breakpoint
  - `NavActive.tsx` — Client island, sets `aria-current="page"` from `usePathname()` as a progressive enhancement
- `src/app/layout.tsx` — mounts `<SiteHeader />` and `<SiteFooter />` site-wide
- `src/app/(auth)/layout.tsx` — simplified; brand link removed (global header replaces it)
- Inline `<span className="cs-brand">CampShare</span>` removed from 10 page files (dashboard, dashboard/bookings, dashboard/bookings/[id], dashboard/payouts, trips, trips/[id], vans/[slug], admin, apply/submitted, plus the auth layout)
- Redundant `← Dashboard` back-links removed from 6 page files (dashboard/profile, dashboard/bookings, dashboard/listings/new, dashboard/listings/[id], trips, hire/[region]). Kept: `← Admin` (admin sub-pages, no global nav equivalent), `← {listing.name}` (listings sub-page breadcrumbs), `← Back to dates` (BookingRequestForm wizard step — not navigation).
- `src/app/vans/page.tsx` — dropped its custom header div; outer wrapper `height: 100vh` → `calc(100vh - var(--header-h))` so the split list+map view fits below the sticky global header.

### Design decisions worth remembering

- **Token re-pointing over class rename.** Adding marketing tokens and re-pointing `--sand-50: var(--cream)` etc. shifts the visual palette across ~25 page files with zero per-page edits. Documented inline in `globals.css`.
- **Container widths intentionally split.** Chrome uses marketing's `.wrap` (max 1280px); page bodies keep `.cs-container` (max 1080px) for prose readability. Don't "fix" this — it's deliberate.
- **Two button class families.** `.cs-btn-*` (page bodies) and `.btn-*` (chrome) coexist. Don't unify.
- **Active nav link via progressive enhancement.** `NavActive` is a small client island that runs `usePathname()` after hydration and adds `aria-current="page"` to matching links. The header stays a Server Component.

### Verification status (post-deploy 2026-05-21)

- `npm run typecheck` clean.
- Post-deploy probe (Chrome UA via `Invoke-WebRequest` — `WebFetch` is blocked by Cloudflare bot protection on `app.campshare.co.nz`): `/` → 307 to `/vans`, `/vans`/`/login`/`/signup`/`/hire/auckland`/`/vans/[slug]` all 200, `/dashboard` 307 → `/login` (auth gating intact). Chrome markers `.site-header`, `.site-footer`, `.brand-mark`, `.nav`, `.footer-grid` all present; nav text "Browse / Hire / Become a host / Log in / Sign up" all in HTML.
- Visual + interactive verification by Jonty — pending.

---

## Sprint 7B — what was built (deployed 2026-05-21, version `e4d9c4ab`)

### Why the scope changed (again)

After 7A deployed, a competitor UI audit of Camplify AU+NZ, Goboony, and Quirky Campers surfaced ~17 discovery/trust gaps. The two most visible: no homepage (the root `/` was a redirect — every competitor has a marketing-style hero), and listing cards with no owner attribution + no rating slot (every competitor card shows "5.0 (16)" stars + owner avatar + first name). Founder approved bundling these into S7 as Phase B; trust-and-safety still slides further to 7D / 8A.

### What changed

- **`src/app/page.tsx`** — no longer a redirect for logged-out visitors. Logged-in still redirects to `/dashboard`; logged-out renders 7 marketing sections. `export const dynamic = "force-dynamic"` so the hero's `today` min-date stays fresh per request.
- **New dir `src/components/home/`** — each section a server component (collocated with other shared chrome components, not in `src/app/(home)/` route group):
  - `HomeHero.tsx` — pill-shaped search bar wrapped in `<form action="/vans" method="get">`. Pure HTML, works without JS. Fields: `region` (select of `NZ_REGIONS`), `startDate`, `endDate` (date inputs with `min={today}`). Mobile breakpoint at 720px stacks vertically.
  - `TrustBanner.tsx` — forest-deep strip with live D1 van count + trust copy.
  - `FeaturedVans.tsx` — 6 most-recently-published listings via `ListingCard`. Runs the same SELECT shape as `/vans` so the upgraded card renders identically.
  - `HowItWorks.tsx` — three numbered cards (Search → Book → Hit the road).
  - `CategoryCards.tsx` — 4 deep-linked filters → `/vans?petFriendly=1`, `/vans?sleeps=4`, `/vans?vanType=self-contained`, `/vans?instantBook=1`.
  - `RegionGrid.tsx` — 16 NZ regions split North/South, each linking to existing `/hire/[region]`.
  - `HomepageFaq.tsx` — `<details>` accordion, 6 Q&As (3 traveller, 3 owner).
- **`src/app/vans/ListingCard.tsx`** — `SearchResult` interface extended with `hostFirstName: string | null`, `hostImage: string | null`, `avgRating: number | null`, `reviewCount: number`. Card layout now: cover photo → host avatar (24px round, falls back to forest-deep circle + initial) + first name on left, price on right → title → region/sleeps line → **conditional** rating row (`★ 4.8 (16)`) rendered only if `reviewCount > 0` → existing pills. The hidden-until-populated rating slot means Phase 7D doesn't need to revisit any card consumer.
- **`src/app/vans/page.tsx`, `src/app/hire/[region]/page.tsx`, `src/components/home/FeaturedVans.tsx`** — all SELECTs now `LEFT JOIN host_profile hp ON hp.userId = vl.hostUserId` and `LEFT JOIN user u ON u.id = vl.hostUserId`, selecting `hp.firstName AS hostFirstName, u.image AS hostImage, NULL AS avgRating, 0 AS reviewCount`.
- **`src/app/globals.css`** — appended `.home-hero-form` media query at ≤720px to stack the pill grid vertically.

### Design decisions worth remembering

- **Server-rendered form over client component.** HomeHero was originally planned as a client component, but a pure server component with `<form action="/vans" method="get">` is simpler — no useState, no hydration, no JS budget. Works with JS disabled. `force-dynamic` keeps `today` fresh.
- **Reserved rating slot.** Rendering the star row only when `reviewCount > 0` means Phase 7D wires up reviews without touching any card consumer. Card layout doesn't shift when reviews start landing — the row just appears.
- **Sibling-to-page components in `src/components/home/`**, not a route group (`src/app/(home)/`). Matches the existing pattern (`SiteHeader`/`SiteFooter` live in `src/components/`).
- **Live counts in trust banner.** The "N vans listed across Aotearoa" copy queries D1 on each request rather than hardcoding. Cheap query, no caching headaches when listings grow.

### Verification status (post-deploy 2026-05-21)

- `npm run typecheck` clean.
- Post-deploy probe: `/` now 200 (was 307); all 7 section markers present in rendered HTML; `/dashboard` still 307 → `/login`; hero deeplink `/vans?region=Auckland&startDate=2026-06-01&endDate=2026-06-07` returns 200 with content; one published van renders host avatar (Google profile photo) + name "Jonty" + price + region in the upgraded card.
- Visual + interactive verification by Jonty — pending.

---

## What's next — Sprint 7C, then 7D / 8A

**7C — PDP polish + wishlist (~3d)**: two-column `/vans/[slug]` (left: gallery + about + features + map + similar listings; right: sticky booking widget desktop / sticky-bottom CTA mobile); new components `PhotoGalleryLightbox`, `PickupMap` (1km blurred circle), `SimilarListings`, `ShareButton`, `StickyBookCta`. Migration 004 = `wishlist` table; new `/api/wishlist`, `/dashboard/saved`, `WishlistHeart` client island on cards + PDP.

**7D / 8A — reviews + host profile + admin audit log (~5d)**: migration 005 = `review` (double-blind, 14-day window) + `audit_log` + `booking.reviewPromptSentAt`. New `/api/reviews`, `ReviewForm`, `ReviewsBlock`. Cron extended with review-prompt email pass + 14d-publish pass. New public `/hosts/[userId]/page.tsx`. SELECTs feeding `ListingCard` updated to populate `avgRating`/`reviewCount` from a subquery on `review`. `src/lib/audit.ts` helper retrofitted into admin endpoints.

**Deferred to next sprint (8B)**: Stripe Identity KYC for guests, report/block, dispute workflow, computed host badges (Super host / Responds reliably). Reactive features — most valuable after first incident, not before.

Plan: `C:\Users\Jonty\.claude\plans\i-d-like-you-to-purring-nova.md`.
Backlog: `docs/context/06-roadmap.md`.

---

## Critical gotchas (do not undo)

1. **Cloudflare Worker secrets must be read from `getCloudflareContext().env`** — not `process.env`. Vars (wrangler.jsonc `vars`) ARE available via `process.env`. Secrets are not.
2. **Never use PowerShell to pipe secrets to wrangler** — use Bash `printf '...' | npx wrangler secret put NAME`. PowerShell adds a UTF-16 BOM that silently corrupts the value.
3. **Better Auth uses raw D1 binding** — `src/lib/auth.ts` passes `database: d1` directly.
4. **Auth route lazy-initialises per request** — don't hoist `auth()` to module level.
5. **All source files must be UTF-8, no null bytes.**
6. **`@opennextjs/cloudflare` v1.x** requires `next >= 15.5.18`, `wrangler >= 4.86.0`, `open-next.config.ts`.
7. **Local D1 must be initialized** before first `npm run dev` — apply any new migration files; don't re-run `schema.sql`.
8. **Zod `.issues` not `.errors`** — all API routes use `.issues[0]?.message`.
9. **DB queries are raw D1** — `db().prepare(...).bind(...).run()` pattern. No Kysely.
10. **`van_listing.nightlyRate` is NZD cents** — UI divides by 100; DB stores cents.
11. **Slug is permanent** — set on create, never updated. Protects public URLs.
12. **`NEXT_PUBLIC_` prefix required for client-side env vars** — vars used in `"use client"` components must be prefixed `NEXT_PUBLIC_` or they are `undefined` in the browser.
13. **`availability_block` dates are unix ms via `Date.UTC(year, month, day)`** — UTC midnight, not NZ midnight.
14. **Booking expiry is lazy** — checked on read, not via a cron job.
15. **Stripe client uses `Stripe.createFetchHttpClient()`** — required for Workers; standard Node.js HTTP client is not available.
16. **`setup_future_usage: 'off_session'` on booking PI** saves PM to Customer for deposit charges.
17. **Cron trigger** calls `GET /api/cron/booking-lifecycle` on the `0 0 * * *` schedule (daily at midnight UTC).
18. **`onboard/page.tsx` must be a Client Component** — Server Components cannot redirect to external URLs; use API route + `window.location.href` pattern.
19. **Stripe Connect must be explicitly enabled** at dashboard.stripe.com/connect — not automatic on new accounts.
20. **Deploy fails with EBUSY** if `workerd` process is running — kill with `Stop-Process -Name "workerd" -Force` first.
21. **`NEXT_PUBLIC_*` vars must be in `.env.local`** — Next.js inlines them at build time. Having them only in `wrangler.jsonc` vars means the browser bundle gets `undefined`. Publishable keys (Stripe, R2 URL, Mapbox) must be in both places.
