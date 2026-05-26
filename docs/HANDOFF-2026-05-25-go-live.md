# CampShare Go-Live Handoff — 2026-05-25 (for next Codex session)

Goal of next session: **commit the current work and push CampShare live.** This
doc is the runbook. Read `docs/HANDOFF-2026-05-24.md` first for the broader
state; this file covers what's new and the exact go-live steps.

## Current state

- Branch: `codex/ui-remediation` (do NOT use `main` or `claude/current-work`).
- The working tree is **uncommitted** and contains two intermingled work streams:
  1. The prior session's "pre-push functional pass" (UI/QA fixes).
  2. This session's **host insurance verification + policy decisions + deposit-claim execution**.
- Several files contain edits from BOTH streams in the same hunks (e.g.
  `src/lib/notifications.ts`, `src/app/api/cron/booking-lifecycle/route.ts`,
  `src/app/api/bookings/[id]/accept/route.ts`, `src/app/admin/page.tsx`,
  `src/app/admin/disputes/[id]/DisputeActions.tsx`,
  `src/lib/notification-display.ts`, `docs/HANDOFF-2026-05-24.md`). They cannot
  be split cleanly at file level — **for go-live this is fine: commit the whole
  working tree as one batch**, since everything ships together.
- Verified green at the current tip: `npm run typecheck`, `npm run test:run`
  (53 tests), `npm run build`.

## What this session added (policy + insurance)

Owner decisions locked 2026-05-25: host-carries-cover insurance, founder-owned
launch supply, GST on the service fee only (no `money.ts` change), flat $500
deposit, single standard cancellation policy. Written policy at `/policies`
(noindex draft). Full design: `~/.claude/plans/i-d-like-you-to-quiet-pebble.md`.

- **Migration `016_host_insurance.sql`** — insurance columns on `host_profile`
  + `deposit_claim` ledger.
- **Insurance gate** (`src/lib/insurance.ts` → `isInsuranceCurrent`): blocks
  listing submit, admin approve/publish, and booking acceptance unless the host
  has a verified, in-date policy. Daily `booking-lifecycle` cron Pass 5 expires
  lapsed policies and auto-pauses their published listings.
- **Host upload** (`InsuranceCard` on `/dashboard/profile`,
  `api/host/insurance/*`) → private bucket `campshare-host-docs` via presigned
  PUT. **Admin review** at `/admin/insurance/[userId]` (presigned GET to view
  the doc) + `api/admin/hosts/[userId]/insurance`.
- **Deposit-claim execution** (`api/admin/disputes/[id]/route.ts`): awarding the
  deposit to the host now charges the guest's saved card off-session (≤ $500)
  and transfers to the host, tracked in `deposit_claim` (idempotent). Closes the
  gap where the hold was released before the 7-day dispute window.
- R2 SigV4 code shared in `src/lib/r2-presign.ts` (photos/sign refactored to use
  it; behaviour unchanged).

## CRITICAL gotcha — read before deploying

**Insurance is now a hard gate.** With no verified, in-date policy on a host:
- their listings cannot be submitted or published, and
- they cannot accept bookings.

Launch is founder-owned, so **the founder MUST, on production, upload their own
commercial policy and approve it** (the founder is admin) — otherwise the live
marketplace has zero bookable vans. Do this immediately after deploy + migration.

## Go-live runbook (in order)

1. **Commit.** Stage the whole working tree and commit on `codex/ui-remediation`
   (or a release branch off it). One commit is acceptable for go-live.
   - `git add -A && git commit` with a message covering both the UI/QA pass and
     the insurance/policy/deposit-claim work.

2. **Create the private R2 bucket** (hard prerequisite — `wrangler.jsonc` now
   binds `HOST_DOCS` → `campshare-host-docs`):
   - `wrangler r2 bucket create campshare-host-docs`
   - Confirm it is **NOT** public (no public r2.dev / custom domain). Insurance
     docs are sensitive; admin reads them only via short-lived presigned GET.

3. **Apply D1 migrations to remote, in order.** No auto-runner. Verify which are
   already applied, then apply `011`→`016`:
   - `wrangler d1 execute campshare-db --remote --file=src/db/migrations/016_host_insurance.sql`
   - (and any of 011–015 not yet applied remotely — see prior handoff).

4. **Verify production Worker secrets** (set via `wrangler secret put`):
   `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `RESEND_API_KEY`, `EMAIL_FROM`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `TURNSTILE_SECRET_KEY`, `STRIPE_SECRET_KEY` (LIVE),
   `STRIPE_WEBHOOK_SECRET` (live endpoint), `CRON_SECRET`.
   - The same R2 keys cover both buckets (S3 API), so no new secret is needed for
     `campshare-host-docs` — just the bucket.
   - On Windows set secrets via Bash `printf`, not PowerShell `echo` (PowerShell
     adds a UTF-16 BOM that corrupts the secret).

5. **Build + deploy.** `npm run build` then the Cloudflare deploy step
   (`opennextjs-cloudflare` / `wrangler deploy` as configured).

6. **Founder insurance bootstrap (do NOT skip).** Sign in as the founder on
   production → `/dashboard/profile` → upload the commercial policy + submit →
   approve it via `/admin/insurance/<your userId>`. Confirm a listing can now
   publish and a booking can be accepted.

7. **Stripe live verification.** Point a live webhook at
   `/api/webhooks/stripe`, run a controlled real (small) booking end-to-end,
   and **live-test the deposit-claim path** (open a dispute, resolve to host,
   confirm the off-session charge + host transfer succeed). This money-movement
   path has only been verified by typecheck/tests/build so far.

8. **Legal/policy copy.** Owner has ruled out lawyers. Decide: launch with draft
   `/terms`, `/privacy`, `/policies` as-is, and whether to drop their `noindex`.
   Recommend keeping `noindex` until the owner is comfortable.

## Owner actions outside code (free channels — no lawyers)

- **Insurance broker** (commission-paid, $0): confirm what document proves
  "hire-permitted" cover and which NZ P2P/rental product the founder's van uses;
  fold the wording into `InsuranceCard` + `/policies`.
- **Accountant / IRD guidance** (free): confirm GST registration status vs the
  $60k threshold and whether "GST on fee only" is right for founder-owned supply.
  Current code keeps GST on the fee only — change only if advised.

## Still-open QA from prior session

Authenticated guest/host/admin walkthroughs (cancellation, listings/calendar/
iCal, payouts, reports, disputes, moderation) and keyboard/automated
accessibility checks remain outstanding.
