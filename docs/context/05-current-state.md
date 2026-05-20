# 05 — Current State

> Snapshot as of **2026-05-20 (Sprints 1–6 deployed)**. Verify with `git log` and the Cloudflare dashboard before acting on anything load-bearing here.

## Headline

**Sprints 1–6 are deployed and live at https://app.campshare.co.nz** (Cloudflare Worker, version `de9e9a5a`).

The app supports: auth, host onboarding, van listings, photo upload to R2, availability calendars, public search with Mapbox map, 16 location landing pages, booking requests with booking-scoped messaging, and Stripe Connect payments with security deposit, payouts, and NZ GST. Sprint 7 (KYC + reviews + disputes) is next.

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

## What's next — Sprint 7

**KYC + reviews + disputes + report/block + admin audit log.** S6 e2e test passed — unblocked. S7 scope covers all four areas (Jonty confirmed scope 2026-05-20).

Sprint 7 scope is in `docs/context/06-roadmap.md` under "Trust & safety (S7 — next)".

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
