# 03 — Repo Structure

## Top level

```
CAMPSHARE.CO.NZ/
├── CLAUDE.md                  # Entry point for AI assistants (short)
├── README.md                  # Human-facing readme
├── package.json               # Dependencies and scripts
├── next.config.ts             # Next.js config + OpenNext dev init
├── wrangler.jsonc             # Cloudflare Worker bindings (D1, R2, vars, routes)
├── tsconfig.json              # TypeScript strict config
├── push-to-github.sh          # One-off helper for the initial repo push
├── .env.local                 # Local secrets (NOT committed)
├── .env.local.example         # Template for collaborators
├── .gitignore
├── docs/
│   ├── HANDOFF-2026-05-19.md  # Latest session handoff
│   ├── SPRINT2-STATUS.md      # Sprint 2 close-out
│   └── context/               # Long-form context pack (this folder)
└── src/
    ├── app/                   # Next.js App Router
    ├── db/
    │   └── schema.sql         # D1 schema (5 tables)
    └── lib/                   # Shared server-side helpers
```

## `src/app/` — App Router

```
src/app/
├── layout.tsx                 # Root layout (wraps every page)
├── page.tsx                   # / — landing page
├── globals.css                # Tailwind + base styles
│
├── (auth)/                    # Route group — shared auth layout
│   ├── layout.tsx             # Centered card layout for auth pages
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── forgot-password/page.tsx
│   └── verify-email/page.tsx
│
├── apply/                     # Host application flow
│   ├── page.tsx               # 4-step form
│   └── submitted/page.tsx     # "Thanks, we'll review" landing
│
├── dashboard/
│   └── page.tsx               # Authenticated user dashboard (session-gated)
│
├── admin/                     # Admin-only (requireAdmin)
│   ├── page.tsx               # List of all host applications
│   └── applications/[id]/
│       ├── page.tsx           # Single application detail view
│       └── ApproveRejectButtons.tsx   # Client component
│
└── api/                       # Route handlers
    ├── auth/[...all]/route.ts # Better Auth catch-all (lazy per-request — gotcha #2)
    ├── apply/route.ts         # POST — saves a host application to D1
    └── admin/applications/[id]/route.ts  # PATCH — approve/reject + send email
```

Server components by default. Client components are explicitly marked with `"use client"` — currently only `ApproveRejectButtons.tsx` and the multi-step form parts that need state.

The `(auth)` parentheses make a **route group** — it shares a layout (`layout.tsx`) but doesn't add a URL segment. So `/(auth)/login/page.tsx` is reachable at `/login`, not `/auth/login`.

## `src/lib/` — Server helpers

```
src/lib/
├── auth.ts          # Better Auth config — Kysely + D1Dialect (gotcha #1)
├── auth-client.ts   # Browser-side client (`createAuthClient`)
├── db.ts            # D1 binding helper — getDB() returns env.DB inside a request
├── email.ts         # Resend wrapper + branded HTML templates
├── session.ts       # getSession / requireSession / requireAdmin
└── constants.ts     # NZ_REGIONS, NORTH_ISLAND_REGIONS, VAN_TYPES, VAN_FEATURES, MINIMUM_NIGHTS
```

These are the load-bearing utilities. **Every protected route uses `requireSession()` or `requireAdmin()`** — don't roll your own gate. **Every DB call goes through `db.ts`** — don't reach into `getCloudflareContext().env.DB` directly from a route.

## `src/db/`

```
src/db/
└── schema.sql       # 5 tables: user, session, account, verification, host_application
```

The schema is applied to remote D1 with:

```bash
wrangler d1 execute campshare-db --remote --file=src/db/schema.sql
```

Local D1 (for `npm run dev`) is automatic — OpenNext spins it up on first request. To apply schema locally:

```bash
wrangler d1 execute campshare-db --local --file=src/db/schema.sql
```

When the schema grows beyond hand-edited `.sql`, introduce a migrations folder (e.g. `src/db/migrations/0001_initial.sql`, `0002_van_listings.sql`) and a small runner. Don't reach for an ORM-bundled migration framework yet — D1's migration story is still evolving.

## Where things go (decision tree)

- **A new page users can navigate to** → `src/app/<route>/page.tsx`.
- **A new API endpoint** → `src/app/api/<route>/route.ts`.
- **A reusable server helper** → `src/lib/<name>.ts`.
- **A client component** → next to the page that uses it (`MyButton.tsx`) with `"use client"` at the top. Only promote to a shared `components/` folder when reused in ≥2 places.
- **A new D1 table** → add to `src/db/schema.sql` *and* introduce a migration file under `src/db/migrations/` when that folder exists.
- **A new shared list of values** (regions, statuses, etc.) → `src/lib/constants.ts`. Never duplicate in routes.
- **Email templates** → `src/lib/email.ts` (or split out when there are >5).

## File naming

- `kebab-case.tsx` for files, `PascalCase` for component exports.
- Route handler files are always `route.ts` — that's a Next.js convention, not a choice.
- D1 columns are `camelCase` to match Better Auth's expectations (`emailVerified`, `userId`, `createdAt`). Don't switch to snake_case partway through.

## What's deliberately not here yet

- No global state library (Zustand, Redux). Server components + URL state cover everything so far.
- No component library (shadcn/ui, etc.). Tailwind utility classes only. Revisit when the design system is more than ~10 reused patterns.
- No tests. This is a gap — add Vitest for unit logic and Playwright for end-to-end before the first paid booking flow ships.
- No CI. Add a GitHub Actions workflow that runs `npm run typecheck && npm run lint` on PRs before opening up contributions beyond Jonty.
