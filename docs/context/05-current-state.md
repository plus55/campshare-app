# 05 — Current State

> Snapshot as of **2026-05-19**. Verify with `git log` and the Cloudflare dashboard before acting on anything load-bearing here.

## Headline

**Sprint 2 smoke test passed locally (2026-05-19).** One blocker before full sign-off: `GOOGLE_CLIENT_SECRET` in `.env.local` is stale — Google returns `invalid_client`. All other auth flows verified.

## What was built in Sprint 2

| Feature | Where | Status |
|---|---|---|
| Email + password signup with verification | `(auth)/signup`, `api/auth/[...all]` | ✅ Smoke tested |
| Email + password login | `(auth)/login` | ✅ Smoke tested |
| Forgot password / reset password | `(auth)/forgot-password`, `(auth)/reset-password` | ✅ Smoke tested |
| Email verification page | `(auth)/verify-email` | ✅ Code complete |
| Google OAuth | `(auth)/login`, `(auth)/signup` | ⚠️ Config fix needed (see below) |
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

## Google OAuth fix needed

**Error**: `invalid_client: The provided client secret is invalid.`

The `GOOGLE_CLIENT_SECRET` in `.env.local` is stale. Fix:

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Open your OAuth 2.0 Client ID
3. Copy the client secret (or generate a new one)
4. Update `GOOGLE_CLIENT_SECRET=...` in `.env.local`
5. Restart `npm run dev`, retry Google sign-in

No code changes needed — the OAuth callback URL, client ID, and redirect URI are all correct.

## Infrastructure state

| Resource | Status | Detail |
|---|---|---|
| GitHub repo | ⚠️ Needs push | `github.com/plus55/campshare-app` — today's fixes not yet pushed |
| Cloudflare D1 (remote) | ✅ Created | `campshare-db`, ID `a1a0059a-fdac-4f2b-858f-b8d563728d67` |
| Cloudflare D1 (local) | ✅ Initialized | `.wrangler/state/v3/d1/miniflare-D1DatabaseObject` |
| D1 schema applied | ✅ Applied | Remote (5 tables) + local |
| `wrangler.jsonc` | ✅ Configured | Real database_id wired in |
| Google OAuth client | ✅ Created | Secret needs refreshing in `.env.local` |
| R2 bucket `campshare-photos` | ❌ Not created | Binding declared in `wrangler.jsonc`; bucket needs to be created via Cloudflare dashboard before Sprint 3 deploy |
| Cloudflare DNS for `app.campshare.co.nz` | ❌ Not created | CNAME `app` → deployed Worker URL needed after first deploy |
| Worker deployment | ❌ Never deployed | `npm run deploy` not yet attempted |

## `.env.local` state

| Variable | Status | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET` | ✅ Set | |
| `BETTER_AUTH_URL` | ✅ Set | `http://localhost:3000` — change to `https://app.campshare.co.nz` before deploy |
| `GOOGLE_CLIENT_ID` | ✅ Set | |
| `GOOGLE_CLIENT_SECRET` | ⚠️ Stale | Copy fresh value from Google Cloud Console |
| `RESEND_API_KEY` | ✅ Set | Emails sending without errors |
| `ADMIN_EMAIL` | ✅ Set | `jontydavies7@gmail.com` |
| `EMAIL_FROM` | ✅ Set | `CampShare <hello@campshare.co.nz>` |

## Deploy checklist (once Google OAuth confirmed working)

1. Fix `GOOGLE_CLIENT_SECRET` and verify Google sign-in locally
2. Confirm emails arrived in jontydavies7@gmail.com inbox
3. Push today's code to GitHub
4. Create R2 bucket `campshare-photos` in Cloudflare dashboard, OR temporarily remove the R2 block from `wrangler.jsonc`
5. Change `BETTER_AUTH_URL` in `.env.local` to `https://app.campshare.co.nz`
6. Set Worker secrets: `npx wrangler secret put BETTER_AUTH_SECRET` (and same for GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, RESEND_API_KEY)
7. `npm run deploy`
8. Add `https://app.campshare.co.nz/api/auth/callback/google` to Google OAuth authorized redirect URIs
9. Cloudflare DNS: CNAME `app` → deployed Worker URL (may auto-configure via `wrangler.jsonc` routes)
10. Run smoke test on https://app.campshare.co.nz

## Better Auth v1.6.x notes (don't undo)

1. **`database: d1`** in `src/lib/auth.ts` — pass the raw D1 binding directly. `@better-auth/kysely-adapter` wraps it via its built-in `D1SqliteDialect`.
2. **Auth route lazy-initialises per request** in `src/app/api/auth/[...all]/route.ts` — do not hoist `auth()` to module level.
3. **All source files UTF-8, no null bytes.**
4. **`@opennextjs/cloudflare` v1.x** requires `next >= 15.5.18` and `wrangler >= 4.86.0`.
5. **Better Auth v1.6.x email verification** uses JWT tokens in the URL, not DB-stored tokens. The `verification` table is only used for password reset tokens.
