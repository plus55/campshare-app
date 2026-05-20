# 05 — Current State

> Snapshot as of **2026-05-20 (Sprints 1–5 deployed)**. Verify with `git log` and the Cloudflare dashboard before acting on anything load-bearing here.

## Headline

**Sprints 1–5 are deployed and live at https://app.campshare.co.nz** (Cloudflare Worker, version `79bcc460`).

The app supports: auth, host onboarding, van listings, photo upload to R2, availability calendars, a public search page with Mapbox map, 16 location landing pages, and booking requests with booking-scoped messaging. At least one van listing is published and visible in `/vans`. Sprint 6 (Stripe Connect + payments) is next.

---

## What is deployed and working

| Sprint | Scope | Status |
|---|---|---|
| S1 | Auth — email+password, Google OAuth, magic link, reset | ✅ Deployed |
| S2 | Host application form, admin approval/rejection, transactional email | ✅ Deployed |
| S3 | Host profile, van listing CRUD, R2 photo upload, availability calendar, public `/vans/[slug]` page, admin moderation queue | ✅ Deployed |
| S4 | Search page `/vans` with filters, Mapbox map, `/hire/[region]` SEO landing pages, homepage redirect | ✅ Deployed |
| S5 | Booking requests, accept/decline/cancel, availability block integration, booking-scoped messaging, transactional emails | ✅ Deployed |

---

## Sprint 4 — what was built (deployed 2026-05-20)

### New files

| File | Purpose |
|---|---|
| `src/app/vans/page.tsx` | Search + filter page (split-view list + map) |
| `src/app/vans/SearchFilters.tsx` | Filter panel (region, type, sleeps, price, dates, pets, instant-book) |
| `src/app/vans/ListingCard.tsx` | Listing card component |
| `src/app/vans/MapView.tsx` | Server-side map wrapper |
| `src/app/vans/MapViewClient.tsx` | Mapbox GL client component (dynamic, ssr:false) |
| `src/app/hire/[region]/page.tsx` | SEO location landing pages (16 NZ regions) |
| `src/lib/constants.ts` | Added `REGION_COORDS` (lat/lng for all 16 regions) |
| `src/lib/regionSlug.ts` | Region ↔ slug conversion helpers |

### Modified files

| File | Change |
|---|---|
| `src/app/page.tsx` | Redirects unauthenticated visitors to `/vans` instead of `/login` |
| `src/app/api/listings/route.ts` | Added `pickupLocationText`, `pickupLat`, `pickupLng` to POST |
| `src/app/api/listings/[id]/route.ts` | Added location fields to PATCH |
| `src/app/dashboard/listings/ListingForm.tsx` | Added location inputs |
| `src/app/sitemap.ts` | Added `/hire/[region]` entries |
| `src/lib/photos.ts` | Renamed `R2_PUBLIC_URL` → `NEXT_PUBLIC_R2_PUBLIC_URL` |
| `wrangler.jsonc` | Uncommented R2 binding, added `NEXT_PUBLIC_R2_PUBLIC_URL` var |

---

## Infrastructure state (2026-05-20)

| Resource | Status | Detail |
|---|---|---|
| GitHub repo | Sprint 5 | Latest commit `48f523a` |
| Cloudflare Worker | S1–S5 live | `app.campshare.co.nz`, version `79bcc460` |
| D1 remote | Sprint 5 schema | 10 tables (+ booking, booking_message) |
| Worker secrets | All set | BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, RESEND_API_KEY, EMAIL_FROM, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY |
| wrangler.jsonc vars | All set | BETTER_AUTH_URL, ADMIN_EMAIL, NEXT_PUBLIC_R2_PUBLIC_URL |
| R2 bucket | ✅ Created + public | `campshare-photos`, public URL `https://pub-4433449fb7ff44d2b0ecb6d7e21faafa.r2.dev` |
| Google OAuth (prod) | ✅ Working | GOOGLE_CLIENT_ID set correctly via Bash; redirect URI verified |
| Resend email | ✅ Working | campshare.co.nz domain verified |
| Mapbox map | ⚠️ Token missing | Map panel blank until `NEXT_PUBLIC_MAPBOX_TOKEN` is added |

### Mapbox token — Jonty action needed

The `/vans` map panel is blank because `NEXT_PUBLIC_MAPBOX_TOKEN` is not set. The list view works fine without it. To fix:
1. Create a free token at mapbox.com (starts with `pk.`)
2. Add `NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx` to `.env.local`
3. Add `NEXT_PUBLIC_MAPBOX_TOKEN` as a Cloudflare Worker **variable** (not secret) in the Cloudflare dashboard → Workers → campshare-app → Settings → Variables

---

## What's next — Sprint 6

**Stripe Connect + payments.** Guests pay when a booking is accepted. Hosts receive payouts. Platform takes a commission. Includes security deposit hold, NZ GST handling, refund flow, and Stripe webhook handling.

Sprint 6 scope is in `docs/context/06-roadmap.md` under "Payments (S6-ish)".

---

## Critical gotchas (do not undo)

1. **Cloudflare Worker secrets must be read from `getCloudflareContext().env`** — not `process.env`. Vars (wrangler.jsonc `vars`) ARE available via `process.env`. Secrets are not.
2. **Never use PowerShell to pipe secrets to wrangler** — use Bash `printf '...' | npx wrangler secret put NAME`. PowerShell adds a UTF-8 BOM that silently corrupts the value.
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
13. **`availability_block` dates are unix ms via `Date.UTC(year, month, day)`** — UTC midnight, not NZ midnight (despite the schema comment). The code is authoritative.
