# CLAUDE.md — CampShare App

> Instructions for Claude (and Claude Code) working in this repo.

## What this repo is

**CampShare** is a peer-to-peer camper van rental marketplace for **New Zealand** (campshare.co.nz). Van owners (hosts) list their vehicles; travellers (guests) book them by the night. Think Camplify / Outdoorsy / Camptoo, scoped to NZ. This repo is `app.campshare.co.nz` — the authenticated app surface. A separate marketing site lives at the apex domain.

The founder is **Jonty** (jontydavies7@gmail.com), the sole owner and platform admin. Treat product/business reasoning as part of the job, not just engineering execution.

## North-star scope

Jonty's stated goal: a **fully fleshed, scalable peer-to-peer camper rental marketplace** at competitor parity, not an MVP. When making design decisions, prefer shapes that scale to the full marketplace (bookings, payments, messaging, reviews, KYC, insurance, dispute resolution) even if a given sprint only ships one slice. Call out trade-offs rather than presenting a single path as inevitable.

The full backlog and gap analysis is in [`docs/context/06-roadmap.md`](docs/context/06-roadmap.md).

## Where to find context

Everything you need to orient is in [`docs/context/`](docs/context/). Read these in order on first session:

1. [`01-product.md`](docs/context/01-product.md) — what CampShare is, target users, business model
2. [`02-architecture.md`](docs/context/02-architecture.md) — stack, hosting, key gotchas
3. [`03-repo-structure.md`](docs/context/03-repo-structure.md) — code layout
4. [`04-database.md`](docs/context/04-database.md) — D1 schema (current + planned)
5. [`05-current-state.md`](docs/context/05-current-state.md) — Sprint 2 status, smoke test, blockers
6. [`06-roadmap.md`](docs/context/06-roadmap.md) — Sprint 3 + marketplace-complete backlog
7. [`07-dev-setup.md`](docs/context/07-dev-setup.md) — install, run, deploy
8. [`08-resources.md`](docs/context/08-resources.md) — external URLs, IDs, dashboards
9. [`09-conventions.md`](docs/context/09-conventions.md) — code patterns and anti-patterns

Prior session handoffs live alongside these in [`docs/`](docs/) (e.g. `HANDOFF-2026-05-19.md`, `SPRINT2-STATUS.md`).

## Non-negotiable gotchas

These patterns were established through debugging. **Do not undo them.**

1. **Better Auth uses the raw D1 binding** in `src/lib/auth.ts` — `database: d1` (the raw `D1Database` from `getCloudflareContext`). `@better-auth/kysely-adapter` handles D1 natively via its built-in `D1SqliteDialect`. Do NOT wrap in `new Kysely({...})` — `createKyselyAdapter` doesn't accept a bare Kysely instance and will throw `Failed to initialize database adapter`.
2. **The auth route lazy-initialises per request** in `src/app/api/auth/[...all]/route.ts`. `auth()` calls `getCloudflareContext()`, which only works inside a Worker request — not at module load. Do not move `auth()` to the top level of any module.
3. **No null bytes in source files.** A UTF-16 encoding artifact in `src/lib/auth.ts` broke `npm run build` earlier. If you regenerate code, write UTF-8.
4. **Local D1 must be initialized before first `npm run dev`** — run `npx wrangler d1 execute campshare-db --local --file=src/db/schema.sql` first. Without this, Better Auth throws `Failed to initialize database adapter` on every request.

## Current state (snapshot — verify with `git log` before acting on this)

As of **2026-05-19**, Sprint 2 smoke test has passed locally. One remaining step: fix `GOOGLE_CLIENT_SECRET` in `.env.local` (stale — copy fresh value from Google Cloud Console). Full details in [`docs/context/05-current-state.md`](docs/context/05-current-state.md).

## How to run

```bash
npm install
# First time only — initialise the local D1 database:
npx wrangler d1 execute campshare-db --local --file=src/db/schema.sql
npm run dev             # local dev (http://localhost:3000)
npm run deploy          # opennextjs-cloudflare build && deploy
```

Schema apply (remote):

```bash
wrangler d1 execute campshare-db --remote --file=src/db/schema.sql
```

Full setup in [`docs/context/07-dev-setup.md`](docs/context/07-dev-setup.md).

## Style and conventions

- TypeScript strict, App Router (Next.js), server components by default.
- Auth-protected routes use `requireSession()` / `requireAdmin()` from `src/lib/session.ts`. Don't roll your own.
- All DB access goes through the D1 binding helper in `src/lib/db.ts`.
- Transactional email goes through `src/lib/email.ts` (Resend). Failures are caught and logged, never thrown to the user.
- Canonical lists (NZ regions, van types, features) live in `src/lib/constants.ts`. Don't duplicate them in routes.
- Don't commit `.env.local` or anything containing `BETTER_AUTH_SECRET`, OAuth secrets, or Resend keys.

More in [`docs/context/09-conventions.md`](docs/context/09-conventions.md).

## Working with Jonty

Jonty is the founder/PM, not the implementing engineer. Frame recommendations in product terms as well as code terms ("this unlocks instant-book", not just "this adds a column"). When scope is ambiguous between MVP-shape and marketplace-complete, surface the trade-off rather than silently choosing.
