# 05 — Current State

> Snapshot as of **2026-05-19**. Verify with `git log` and the Cloudflare dashboard before acting on anything load-bearing here.

## Headline

**Sprint 2 complete and deployed to production (2026-05-19).** All auth flows — including Google OAuth — smoke-tested locally and confirmed working. App is live at https://app.campshare.co.nz. Next: live smoke test on production, add production Google OAuth redirect URI, then begin Sprint 3.

## What was built in Sprint 2

| Feature | Where | Status |
|---|---|---|
| Email + password signup with verification | `(auth)/signup`, `api/auth/[...all]` | ✅ Smoke tested |
| Email + password login | `(auth)/login` | ✅ Smoke tested |
| Forgot password / reset password | `(auth)/forgot-password`, `(auth)/reset-password` | ✅ Smoke tested |
| Email verification page | `(auth)/verify-email` | ✅ Code complete |
| Google OAuth | `(auth)/login`, `(auth)/signup` | ✅ Confirmed working locally |
| User dashboard (session-gated) | `dashboard/page.tsx` | ✅ Redirects unauthenticated users |
| 4-step host application form | `apply/page.tsx`, `api/apply/route.ts` | ✅ Smoke tested |
| Admin: list applications | `admin/page.tsx` | ✅ Smoke tested |
| Admin: approve/reject single application | `admin/applications/[id]/...`, `api/admin/applications/[id]/route.ts` | ✅ Smoke tested |
| Approval/rejection emails | `lib/email.ts` | ✅ Sent, no errors |
| D1 schema (5 tables) | `db/schema.sql` | ✅ Applied to remote + local D1 |
| Branded transactional email templates | `lib/email.ts` | ✅ Code complete |

## Bugs fixed during smoke test (2026-05-19)

Five issues caught and fixed during the first local run:

1. **`forgetPassword` → `requestPasswordReset`** (`src/lib/auth-client.ts`, `src/app/(auth)/forgot-password/page.tsx`) — Better Auth v1.x renamed this client method.
2. **`@better-auth/kysely-adapter` missing** — Better Auth v1.6.x moved the Kysely adapter to a separate package. Added `@better-auth/kysely-adapter@^1.6.11` and upgraded `kysely` `0.27.6` → `0.28.17`.
3. **`src/lib/auth.ts` D1 adapter pattern** — `database: new Kysely({ dialect: new D1Dialect({...}) })` failed; `createKyselyAdapter` doesn't accept a bare Kysely instance. Changed to `database: d1` — the adapter's built-in `D1SqliteDialect` handles D1 natively.
4. **Local D1 not initialized** — run `npx wrangler d1 execute campshare-db --local --file=src/db/schema.sql` before first `npm run dev`.
5. **`body` typed as `unknown`** — TypeScript strict errors in `ApproveRejectButtons.tsx` and `apply/page.tsx`; fixed with `as { error?: string }` casts.

## Infrastructure state

| Resource | Status | Detail |
|---|---|---|
| GitHub repo | ✅ Up to date | `github.com/plus55/campshare-app`, latest commit `671411e` |
| Cloudflare Worker | ✅ Deployed | `app.campshare.co.nz`, version `ce38b9e5` |
| Cloudflare D1 (remote) | ✅ Schema applied | `campshare-db`, ID `a1a0059a-fdac-4f2b-858f-b8d563728d67`, 5 tables |
| Cloudflare D1 (local) | ✅ Initialized | `.wrangler/state/v3/d1/miniflare-D1DatabaseObject` |
| Worker secrets | ✅ All set | `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` |
| Google OAuth client | ✅ Working | Confirmed locally. Production redirect URI not yet added to Google Cloud Console |
| R2 bucket `campshare-photos` | ❌ Not created | R2 not enabled on account. Binding commented out in `wrangler.jsonc`. Needed before Sprint 3 deploy |
| DNS for `app.campshare.co.nz` | ✅ Configured | `custom_domain: true` in `wrangler.jsonc` routes — Cloudflare manages this automatically |

## `.env.local` state (local dev only — secrets live in Cloudflare for production)

| Variable | Status | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET` | ✅ Set | |
| `BETTER_AUTH_URL` | ✅ Set | `http://localhost:3000` for local dev; `wrangler.jsonc` vars override this in production |
| `GOOGLE_CLIENT_ID` | ✅ Set | |
| `GOOGLE_CLIENT_SECRET` | ✅ Set | Updated 2026-05-19 |
| `RESEND_API_KEY` | ✅ Set | |
| `ADMIN_EMAIL` | ✅ Set | `jontydavies7@gmail.com` |
| `EMAIL_FROM` | ✅ Set | `CampShare <hello@campshare.co.nz>` |

## Before Sprint 3 starts

1. Live smoke test on https://app.campshare.co.nz
2. Add `https://app.campshare.co.nz/api/auth/callback/google` to authorized redirect URIs in Google Cloud Console
3. Enable R2 in Cloudflare dashboard → create bucket `campshare-photos` → uncomment R2 block in `wrangler.jsonc`
4. Read `docs/context/04-database.md` (planned schema section) before touching the DB — the `host_application` → `host_profile` + `van_listing` split needs a migration plan

## Better Auth v1.6.x notes (don't undo)

1. **`database: d1`** in `src/lib/auth.ts` — pass the raw D1 binding directly. `@better-auth/kysely-adapter` wraps it via its built-in `D1SqliteDialect`.
2. **Auth route lazy-initialises per request** in `src/app/api/auth/[...all]/route.ts` — do not hoist `auth()` to module level.
3. **All source files UTF-8, no null bytes.**
4. **`@opennextjs/cloudflare` v1.x** requires `next >= 15.5.18`, `wrangler >= 4.86.0`, and an `open-next.config.ts` in the project root.
5. **Better Auth v1.6.x email verification** uses JWT tokens in the URL, not DB-stored tokens. The `verification` table is only used for password reset tokens.
