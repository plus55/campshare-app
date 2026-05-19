# 05 — Current State

> Snapshot as of **2026-05-19 (Sprint 3 in progress)**. Verify with `git log` and the Cloudflare dashboard before acting on anything load-bearing here.

## Headline

**Sprint 3 code is written but NOT yet deployed.** The migration (`001_split_host_application.sql`) has NOT been applied to local or remote D1 — do not run `npm run dev` against the existing local DB until the migration is applied. Sprint 1 + 2 remain live at https://app.campshare.co.nz.

**Two production blockers Jonty must resolve before deploy:**
1. Google OAuth `invalid_client` error — GOOGLE_CLIENT_ID Worker secret may not match Google Cloud Console.
2. R2 bucket `campshare-photos` not yet created — needed for photo upload to work.

---

## Sprint 2 — complete + deployed (2026-05-19)

| Feature | Where | Status |
|---|---|---|
| Email + password signup/login/reset | `(auth)/` routes | ✅ Deployed |
| Google OAuth | `(auth)/login`, `(auth)/signup` | ✅ Working locally; broken on prod (invalid_client) |
| User dashboard | `dashboard/page.tsx` | ✅ Deployed |
| 4-step host application form | `apply/page.tsx`, `api/apply/` | ✅ Deployed (now redirects to new flow) |
| Admin: list + approve/reject applications | `admin/page.tsx`, `admin/applications/` | ✅ Deployed (replaced in Sprint 3) |
| Transactional email | `lib/email.ts` | ✅ Deployed |

---

## Sprint 3 — code complete, migration pending

### New files added

| File | Purpose |
|---|---|
| `src/lib/types.ts` | `HostProfile`, `VanListing`, `VanPhoto`, `AvailabilityBlock` TS interfaces |
| `src/lib/photos.ts` | `photoUrl()` helper + upload constants |
| `src/db/schema.sql` | Updated: `host_application` replaced with 4 new tables |
| `src/db/migrations/001_split_host_application.sql` | Idempotent migration: create tables → backfill → DROP host_application |
| `src/components/ModerationButtons.tsx` | Parameterised approve/reject client component |
| `src/app/api/profile/route.ts` | POST upsert host_profile |
| `src/app/api/listings/route.ts` | POST create draft van_listing |
| `src/app/api/listings/[id]/route.ts` | PATCH update listing |
| `src/app/api/listings/[id]/submit/route.ts` | POST submit for review → pending_review |
| `src/app/api/admin/listings/[id]/route.ts` | PATCH approve/reject listing |
| `src/app/api/photos/sign/route.ts` | POST generate R2 presigned PUT URL (SigV4, no AWS SDK) |
| `src/app/api/photos/route.ts` | POST persist photo metadata |
| `src/app/api/photos/[id]/route.ts` | PATCH caption/position, DELETE |
| `src/app/api/listings/[id]/availability/route.ts` | GET/POST availability blocks |
| `src/app/api/listings/[id]/availability/[blockId]/route.ts` | DELETE block |
| `src/app/dashboard/profile/page.tsx` + `EditProfileForm.tsx` | Host profile create/edit |
| `src/app/dashboard/listings/ListingForm.tsx` | 3-step listing form (shared) |
| `src/app/dashboard/listings/new/page.tsx` | New listing page |
| `src/app/dashboard/listings/[id]/page.tsx` | Edit listing + nav |
| `src/app/dashboard/listings/[id]/ListingActions.tsx` | Submit/pause/archive controls |
| `src/app/dashboard/listings/[id]/photos/page.tsx` + `PhotoManager.tsx` | Photo upload UI |
| `src/app/dashboard/listings/[id]/calendar/page.tsx` + `AvailabilityCalendar.tsx` | Availability block UI |
| `src/app/admin/listings/[id]/page.tsx` | Admin listing detail + moderation |
| `src/app/vans/[slug]/page.tsx` | Public listing page (server-rendered, OG tags) |
| `src/app/sitemap.ts` | Lists all published van slugs |
| `src/app/robots.ts` | Allows `/vans/`, blocks `/dashboard/`, `/admin/`, `/api/` |

### Modified files

| File | Change |
|---|---|
| `src/app/dashboard/page.tsx` | Rewritten: profile card + listings table |
| `src/app/admin/page.tsx` | Rewritten: pending_review listings queue |
| `src/app/apply/page.tsx` | Now redirects to `/dashboard/listings/new` |
| `src/app/api/apply/route.ts` | Returns 410 Gone |
| `src/app/admin/applications/[id]/page.tsx` | Redirects to `/admin` |
| `src/app/api/admin/applications/[id]/route.ts` | Returns 410 Gone |

### Dependencies added

- `zod` — API payload validation
- `nanoid` — slug suffix generation

---

## What must happen before Sprint 3 deploys

### Jonty actions (Cloudflare + Google dashboards)

1. **Fix Google OAuth `invalid_client` on prod** — In Cloudflare Workers → campshare-app → Settings → Variables, confirm `GOOGLE_CLIENT_ID` exactly matches the OAuth client ID in Google Cloud Console. `invalid_client` means Google doesn't recognise the ID at all (not a redirect URI error).
2. **Add production redirect URI** `https://app.campshare.co.nz/api/auth/callback/google` to Google Cloud Console → APIs & Services → Credentials → OAuth client → Authorized redirect URIs.
3. **Enable R2** in Cloudflare dashboard → R2 → Create bucket `campshare-photos`.
4. **Uncomment R2 block** in `wrangler.jsonc` (lines 23–26) after bucket is created.
5. **Set R2 secrets** as Worker secrets: `R2_ACCOUNT_ID` (your Cloudflare account ID), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (from an R2 API token with `r2:write` on `campshare-photos`). Also set `R2_PUBLIC_URL` (enable public access on bucket → copy the `pub-*.r2.dev` URL).

### Code steps (Claude Code)

1. Run typecheck: `npx tsc --noEmit` — was in progress when session ended.
2. Apply migration locally: `npx wrangler d1 execute campshare-db --local --file=src/db/migrations/001_split_host_application.sql`
3. Run `npm run dev` and smoke test all Sprint 3 flows.
4. Apply migration remotely: `npx wrangler d1 execute campshare-db --remote --file=src/db/migrations/001_split_host_application.sql`
5. Deploy: `npm run deploy`

---

## Infrastructure state

| Resource | Status | Detail |
|---|---|---|
| GitHub repo | Pre-Sprint-3 | Latest deployed commit `671411e`; Sprint 3 not yet pushed |
| Cloudflare Worker | Sprint 2 | `app.campshare.co.nz`, version `ce38b9e5` |
| D1 remote | Sprint 2 schema | 5 tables (incl. `host_application`); migration not yet applied |
| D1 local | Sprint 2 schema | Must apply migration before running dev |
| Worker secrets | Sprint 2 complete | `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` |
| R2 | ❌ Not created | Bucket `campshare-photos` does not exist. Binding commented in `wrangler.jsonc` |
| Google OAuth (prod) | ❌ Broken | `invalid_client` error — GOOGLE_CLIENT_ID mismatch or deleted client |
| R2 secrets | ❌ Not set | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL` needed |

---

## Critical gotchas (do not undo)

1. **Better Auth: `database: d1`** — pass raw D1 binding to auth; do NOT wrap in Kysely constructor.
2. **Auth route lazy-init** — `auth()` must be called inside async handlers, not at module top level.
3. **UTF-8 only** — no null bytes in source files.
4. **`@opennextjs/cloudflare` v1.x** — requires `next >= 15.5.18`, `wrangler >= 4.86.0`, `open-next.config.ts`.
5. **Local D1 must be initialized** before first `npm run dev` — apply migration, don't re-run `schema.sql` (it will fail on the DROP TABLE).
6. **Zod uses `.issues` not `.errors`** — all Sprint 3 API routes use `parsed.error.issues[0]?.message`.
7. **Raw D1 queries** — all DB calls use `db().prepare(...).bind(...).run()`, not Kysely fluent API (despite what 04-database.md says).
8. **`van_listing.nightlyRate` is NZD cents** — UI inputs dollars, API receives dollars × 100 → cents.
9. **Slug is permanent** — generated once on listing creation; does not update when name changes.
