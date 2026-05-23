# CLAUDE.md — CampShare App

CampShare is a P2P campervan rental marketplace for NZ (app.campshare.co.nz). Jonty Davies is the founder/PM — frame answers in product terms as well as engineering terms. North-star is full competitor parity with Camplify, not an MVP.

## Context — load on demand, not all at once

| Need | Read |
|---|---|
| Product / business / schema / sprint history | `D:\programs\SecondBrain\9-Wiki\entities\products\CampShare.md` |
| Current sprint + what not to touch | `SPRINT.md` (workspace root) |
| Architecture detail + CF Workers gotchas | `docs/context/02-architecture.md` |
| DB schema detail | `docs/context/04-database.md` |
| Code conventions / anti-patterns | `docs/context/09-conventions.md` |
| Dev setup / deploy commands | `docs/context/07-dev-setup.md` |

## Non-negotiable gotchas

1. **Secrets via Bash `printf`, never PowerShell** — PowerShell adds a UTF-16 BOM that corrupts Wrangler secrets silently.
2. **Worker secrets → `getCloudflareContext().env`**, not `process.env`. Vars (wrangler.jsonc) work with `process.env`.
3. **Client components need `NEXT_PUBLIC_` prefix** or the var is undefined in the browser.
4. **Better Auth uses the raw D1 binding** in `src/lib/auth.ts` — do not wrap in `new Kysely({...})`.
5. **`auth()` lazy-initialises per request** in the `[...all]/route.ts` — do not hoist to module level.
6. **No UTF-16 in source files** — write UTF-8 only; null bytes break `npm run build`.

## Key patterns

- Auth-protected routes: `requireSession()` / `requireAdmin()` from `src/lib/session.ts`
- DB access: D1 binding helper in `src/lib/db.ts`
- Email: `src/lib/email.ts` (Resend) — failures caught and logged, never thrown
- Constants (regions, van types, features): `src/lib/constants.ts` — don't duplicate
- Never commit `.env.local` or any secret keys

## Run / deploy

```bash
npm run dev          # localhost:3000
npm run deploy       # build + deploy to Cloudflare
```
