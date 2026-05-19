# 02 — Architecture

## Stack at a glance

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 15 (App Router)** | Server components, file-based routing, mature tooling |
| Runtime | **Cloudflare Workers** via **OpenNext** (`@opennextjs/cloudflare`) | Global edge, low-cost, same vendor as DB/storage/DNS |
| Database | **Cloudflare D1** (SQLite-compatible, async) | Bound directly into the Worker, no separate hosting |
| Object storage | **Cloudflare R2** | Van photos in Sprint 3; S3-compatible, no egress fees |
| Auth | **Better Auth** (`better-auth`) + **Kysely** + `kysely-d1` | OAuth + email/password, sessions in D1 |
| Email | **Resend** (`resend`) | Transactional email with React-friendly templates |
| Language | **TypeScript strict** | Catch errors at build time |
| React | **React 19** | Latest, server components first |

The deploy target is `https://app.campshare.co.nz`. The marketing site at the apex domain (`campshare.co.nz`) is a separate Worker — not in this repo.

## Hosting model

Everything runs on a single Cloudflare Worker built by OpenNext:

```
[user browser]
     │
     ▼  Cloudflare edge
[Worker: campshare-app]   ←─ wrangler.jsonc bindings
     ├── D1 (DB)          binding: DB        → campshare-db
     ├── R2 (PHOTOS)      binding: PHOTOS    → campshare-photos (not created yet)
     ├── Static assets    binding: ASSETS    → .open-next/assets
     ├── env vars         BETTER_AUTH_URL, ADMIN_EMAIL (in wrangler.jsonc as vars)
     └── secrets          BETTER_AUTH_SECRET, GOOGLE_*, RESEND_API_KEY (set via wrangler)
```

OpenNext compiles the Next.js app into `.open-next/worker.js`, which is the Worker entrypoint declared in `wrangler.jsonc`. `npm run deploy` runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy` in one shot.

## Non-negotiable gotchas

These three things bit us before the first successful build. They are load-bearing — do not undo them.

### 1. Better Auth must use Kysely + `kysely-d1`'s `D1Dialect`

In `src/lib/auth.ts`. Better Auth ships a built-in `provider: "sqlite"` mode, but it internally uses Kysely with a `SqliteDialect` that expects a **synchronous** `better-sqlite3` interface. D1 is async-only — using the stock provider crashes on the first auth request.

The correct pattern is:

```ts
import { D1Dialect } from "kysely-d1";
import { Kysely } from "kysely";

const db = new Kysely({ dialect: new D1Dialect({ database: env.DB }) });

// pass `db` as the Better Auth database instead of the raw D1 binding
```

### 2. The auth route must lazy-init per request

In `src/app/api/auth/[...all]/route.ts`. The original code did:

```ts
// ❌ breaks on cold start
export const { GET, POST } = toNextJsHandler(auth().handler);
```

`auth()` internally calls `getCloudflareContext()`, which **only works inside a Worker request handler**. Calling it at module load time throws because there's no request context yet. The fix is async per-request:

```ts
// ✅
export async function GET(req: Request) {
  const { handler } = (await auth()).handler;
  return handler(req);
}
// same for POST
```

`auth()` itself is memoised inside `src/lib/auth.ts`, so the per-request call is cheap after the first hit.

### 3. No null bytes in source files

A UTF-16 encoding artifact in `src/lib/auth.ts` embedded null bytes that broke `npm run build`. If any tool regenerates source files, ensure UTF-8 output. The fix commit (`0f8b67d`) stripped them.

## Auth flow

```
[browser]
   │ POST /api/auth/sign-up/email
   ▼
[Next.js route handler]
   │ awaits auth() per request (gotcha #2)
   ▼
[Better Auth core]
   │ Kysely + D1Dialect (gotcha #1)
   ▼
[D1: user / session / account / verification]
   │
   ▼
[Resend] ←── on email verification request
```

Two providers are configured:

- **Email + password** (with email verification before sign-in is allowed).
- **Google OAuth** — client created in Google Cloud Console, redirect URIs registered for both `http://localhost:3000/api/auth/callback/google` (dev) and `https://app.campshare.co.nz/api/auth/callback/google` (prod). Currently restricted to test users until the consent screen is published.

Session helpers live in `src/lib/session.ts`:

- `getSession()` — returns the session or `null`. Use for optional auth UI.
- `requireSession()` — redirects to `/login` if no session. Use in protected pages.
- `requireAdmin()` — redirects unless the session's email matches `ADMIN_EMAIL`. Use in `/admin`.

## Email flow

`src/lib/email.ts` wraps Resend. Three template helpers exist for the current flow:

- Email verification (sent on signup).
- Host application approved.
- Host application rejected.

Failures are caught and logged — they never throw to the user. This is deliberate; a flaky email provider shouldn't break a successful sign-up. The trade-off is that silent failures need monitoring (Resend dashboard or a future log aggregator).

Sender: `CampShare <hello@campshare.co.nz>`. The domain is verified in Resend.

## Why this stack

- **One vendor, mostly.** Cloudflare hosts the Worker, the DB, the object storage, and the DNS. Less fan-out for ops, one bill, one dashboard.
- **Edge-first is a real cost lever** for a marketplace where most traffic is read-heavy (browse, search, profile views).
- **D1 is cheap and adequate** for the read/write volume expected in years 1–2. If we outgrow it, the abstraction through Kysely makes a swap to Postgres (Neon/Supabase) tractable.
- **OpenNext** is the practical way to keep Next.js conventions while deploying to Workers. It's still moving — keep an eye on the `@opennextjs/cloudflare` version when upgrading Next.

## Known stack-level risks

- **OpenNext maturity.** It's the integration layer between Next 15 and Workers. Most pain points are around edge runtime quirks (no Node APIs in some places). Stick to Web APIs (`fetch`, `Request`, `Response`, `crypto.subtle`).
- **D1 size and concurrency limits** are well below Postgres. Long-term marketplace scale (millions of bookings, dense write contention) will eventually hit ceilings. Design schemas now so a future migration isn't a rewrite.
- **Better Auth is young.** Stable enough, but the API surface changes between minor versions. Pin the version and read changelogs before bumping.
- **Stripe Connect on Workers** has some constraints (webhook handling, idempotency keys, Node-specific SDK calls). Verify before committing to it as the payments layer — there may be a Workers-friendlier path.
