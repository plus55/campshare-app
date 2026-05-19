# 09 — Conventions

## TypeScript

- **Strict mode is on.** Don't turn it off. If a third-party type is wrong, declare a narrowed type locally rather than `any`.
- Prefer `unknown` over `any` when truly unknown — forces the caller to narrow.
- Prefer `type` aliases for unions/intersections, `interface` for object shapes that will be extended.
- `import type { ... }` for type-only imports — it strips at build time.

## Server components by default

- Every file in `src/app/` is a server component unless it opens with `"use client"`.
- Promote to a client component only when state, effects, or browser APIs are needed.
- Co-locate client components next to the page that uses them (e.g. `ApproveRejectButtons.tsx` next to `page.tsx`). Don't pre-build a shared `components/` folder.

## Routing & data

- **Use `requireSession()` and `requireAdmin()`** from `src/lib/session.ts` at the top of any protected server component. They redirect on failure — you don't need to handle the null case.
- **All DB access goes through Kysely** via the helper in `src/lib/db.ts`. Don't reach into `getCloudflareContext().env.DB` from a route. Don't write raw SQL strings except in `db/schema.sql`.
- **Email sends go through `src/lib/email.ts`.** Failures are caught — they will not throw. If you need a delivery guarantee, change the helper to expose the error and decide per-caller.
- **Canonical lists** (NZ regions, van types, features, status enums) live in `src/lib/constants.ts`. Import; do not duplicate.

## Naming

- `kebab-case` for filenames.
- `PascalCase` for component exports.
- `camelCase` for DB columns to match Better Auth (`emailVerified`, `createdAt`, `userId`). Do not switch to `snake_case` mid-schema.
- Route handlers are always `route.ts` — Next.js convention.
- Page files are always `page.tsx` — Next.js convention.

## Validation

- Validate every API payload at the boundary. Currently this is done with manual checks; introducing **Zod** for `POST` / `PATCH` bodies is recommended once the second multi-field form is added.
- Don't trust client-submitted IDs. Always re-fetch the owning row and check the session user owns it before mutating.

## Errors

- Throw early at the boundary, recover late in handlers.
- API route handlers should return `Response.json({ error: "..." }, { status: 4xx | 5xx })` rather than throwing into the framework.
- For unrecoverable internal bugs, throw — Next.js will return a 500 and log it.
- Never include a stack trace in a user-visible error response.

## Forms

- Server actions are fine for simple submits. For multi-step forms (like `/apply`), use a client component with local state and call a JSON POST endpoint at the end.
- Pull selectable values from `src/lib/constants.ts` — `NZ_REGIONS`, `VAN_TYPES`, `VAN_FEATURES`, `MINIMUM_NIGHTS` already exist.

## Styling

- **Tailwind utility classes only.** No CSS Modules, no styled-components.
- Use `globals.css` for base styles only (font, color tokens, the global reset). Don't put component styles there.
- Until a design system emerges, avoid component libraries. Roll small components in Tailwind, promote to a shared file when used in 2+ places.

## Money & dates

- Store money as **integer NZD cents** in D1. Never as floats. Convert at the UI boundary.
- Store dates/times as **integer unix milliseconds**. For dates-without-time (booking start/end), still use unix ms at midnight NZ time — document the convention, don't switch to a date-only string format.
- All NZ-side timezone math is `Pacific/Auckland`. Daylight saving applies — use `Intl.DateTimeFormat` with the timezone, never `Date#toLocaleString` without one.

## Secrets

- **Never commit `.env.local`** or any file containing `BETTER_AUTH_SECRET`, OAuth secrets, Resend keys, or Stripe keys.
- Don't paste secret values into docs or commit messages. If a secret has been exposed in git history, rotate it immediately.
- Production secrets live as Cloudflare Worker secrets (`wrangler secret put`), *not* in `wrangler.jsonc` (which is committed).

## Imports

- Use the path alias `@/...` for `src/...` imports (configured in `tsconfig.json`). E.g. `import { requireSession } from "@/lib/session"`.
- Group imports: built-ins → external packages → internal aliases → relative. ESLint default ordering is fine.

## Code review checklist

When you finish a change, sanity-check against:

1. **Did you keep the three gotchas intact?** D1 dialect, lazy auth init, no null bytes. See `02-architecture.md`.
2. **Are protected routes calling `requireSession()` / `requireAdmin()`?**
3. **Are DB reads/writes going through Kysely?**
4. **Did you add a new constant list anywhere?** Move it to `src/lib/constants.ts`.
5. **Did you store money?** Confirm it's integer cents.
6. **Did you add a new dependency?** Confirm it works on the Workers runtime (no Node-only APIs).
7. **Does `npm run typecheck` pass?** (Run it locally before pushing.)
8. **Does `npm run lint` pass?**
9. **If you changed `wrangler.jsonc`, did you redeploy?** Local edits don't reach prod until deploy.

## Anti-patterns to avoid

- Calling `auth()`, `getCloudflareContext()`, or anything that needs a request context at module top level.
- Reverting `src/lib/auth.ts` to Better Auth's stock sqlite adapter.
- Duplicating the NZ regions / van types lists in route files instead of importing from `constants.ts`.
- Storing money as floats or formatted strings ("$120.50") in the DB.
- Throwing user-visible errors with stack traces.
- Letting email failures bubble up into request handlers (the wrapper in `email.ts` exists for a reason).
- Adding a global state store before there's an actual need.
- Hand-running `wrangler` commands that mutate prod without saying so in chat / in a handoff doc.
- Hardcoding URLs that should come from `BETTER_AUTH_URL`.

## Things that don't yet have a convention

Some decisions haven't been made yet — flag them when they come up rather than improvising:

- **Migration tooling.** Manual `schema.sql` works today. Sprint 3 needs a numbered-migrations approach.
- **Testing.** No tests exist. A first pass: Vitest for unit logic in `src/lib/`, Playwright for the signup → application → admin approve flow.
- **CI.** No GitHub Actions yet. First workflow: `typecheck` + `lint` on PRs.
- **Error monitoring.** Currently console-only. Cloudflare Workers Observability or Sentry — pick before the first paid booking.
- **Logging convention.** Currently `console.log` / `console.error`. Wrap in a small logger that includes request ID once log volume goes up.

When introducing any of the above, update this file *and* `CLAUDE.md` so the next session inherits the convention.
