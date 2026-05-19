# 07 — Dev Setup

## Prerequisites

- **Node.js ≥ 20** (Next.js 15 requires it; OpenNext is fine on 20 and 22).
- **npm** (ships with Node — pnpm/yarn untested with the current lockfile).
- **Wrangler** (`npm i -g wrangler`, or use `npx wrangler ...`). Logged in as the Cloudflare account that owns `campshare-db` and the `app.campshare.co.nz` route.
- **Git** + access to `github.com/plus55/campshare-app`.
- A code editor — VS Code is the default working environment.

## First-time local setup

```bash
# 1. Clone (or pull, if already on disk)
git clone git@github.com:plus55/campshare-app.git
cd campshare-app

# 2. Install dependencies
npm install

# 3. Create .env.local from the template
cp .env.local.example .env.local
# Fill in the missing values (see "Environment variables" below)

# 4. Apply schema to local D1 (optional — happens on first dev request anyway)
npx wrangler d1 execute campshare-db --local --file=src/db/schema.sql

# 5. Run the dev server
npm run dev
# → http://localhost:3000
```

If `npm install` is slow or fails, check that `kysely` and `kysely-d1` are present in `package.json` and that the lockfile resolves them.

## Environment variables

All seven live in `.env.local` (gitignored). The example template is `.env.local.example`.

| Variable | What it's for | Where to get it |
|---|---|---|
| `BETTER_AUTH_SECRET` | Signs session cookies. **Must be ≥ 32 bytes** | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Public URL of the app. Dev: `http://localhost:3000`. Prod: `https://app.campshare.co.nz` | Self |
| `GOOGLE_CLIENT_ID` | Google OAuth | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Same screen as above |
| `RESEND_API_KEY` | Transactional email | Cloudflare → Workers & Pages → marketing-site Worker → Settings → Variables and Secrets → copy `RESEND_API_KEY` |
| `ADMIN_EMAIL` | Email that gets admin access. Default: `jontydavies7@gmail.com` | Self |
| `EMAIL_FROM` | Sender on outbound email. Default: `CampShare <hello@campshare.co.nz>` | Self — must be a verified sender in Resend |

**Never commit `.env.local`.** It's already in `.gitignore`. If you ever rotate `BETTER_AUTH_SECRET`, all existing sessions are invalidated.

For Google OAuth in dev: the OAuth client's redirect URI must include `http://localhost:3000/api/auth/callback/google` *exactly*. Trailing slash matters. The consent screen is in test-user mode, so add your own email under "Test users" before signing in.

## Scripts (from `package.json`)

```bash
npm run dev          # next dev — local server on :3000
npm run build        # next build — local compile (rarely needed by hand)
npm run start        # next start — serve a built app locally (rarely needed)
npm run lint         # next lint
npm run typecheck    # tsc --noEmit
npm run deploy       # opennextjs-cloudflare build && opennextjs-cloudflare deploy
npm run preview      # opennextjs-cloudflare build && opennextjs-cloudflare preview
npm run cf-typegen   # regenerate cloudflare-env.d.ts from wrangler config
```

When wrangler bindings change (e.g. you add a new D1 table binding or R2 bucket), run `npm run cf-typegen` to regenerate types so the TS compiler sees them.

## D1 schema commands

```bash
# Apply schema to LOCAL D1 (used by `npm run dev`)
npx wrangler d1 execute campshare-db --local --file=src/db/schema.sql

# Apply schema to REMOTE D1 (production)
npx wrangler d1 execute campshare-db --remote --file=src/db/schema.sql

# Ad-hoc query (remote)
npx wrangler d1 execute campshare-db --remote --command="SELECT count(*) FROM user"

# Ad-hoc query (local)
npx wrangler d1 execute campshare-db --local --command="SELECT id, email FROM user"

# Backup remote → local file
npx wrangler d1 export campshare-db --remote --output=backup.sql
```

The current `schema.sql` uses `CREATE TABLE IF NOT EXISTS`, so re-running it is idempotent. When migrations are introduced (Sprint 3), switch to numbered files and a runner.

## Deploying

Pre-flight check before deploy:

1. **`BETTER_AUTH_URL` in `.env.local`** — change to `https://app.campshare.co.nz`, *or* leave it as `http://localhost:3000` for dev and set the prod URL as a Worker secret separately. `wrangler.jsonc` already has it as a Worker `var` for prod, so the secret/var combination works as long as the Worker reads from `env` in prod and `process.env` in dev.
2. **Secrets must be set in the Worker**, not just `.env.local`. Local-only secrets won't reach production. Set them with:
   ```bash
   npx wrangler secret put BETTER_AUTH_SECRET
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put RESEND_API_KEY
   ```
3. **R2 bucket** `campshare-photos` must exist (Cloudflare → R2 → Create bucket), or remove the R2 block from `wrangler.jsonc` until Sprint 3.

Then:

```bash
npm run deploy
```

Behind the scenes: `opennextjs-cloudflare build` produces `.open-next/worker.js` and `.open-next/assets/`. `opennextjs-cloudflare deploy` uploads them and applies `wrangler.jsonc`.

### DNS

`wrangler.jsonc` already declares:

```jsonc
"routes": [{ "pattern": "app.campshare.co.nz", "custom_domain": true }]
```

So once the Worker is deployed and the domain is added to the Cloudflare account (apex `campshare.co.nz` already is), the route should attach automatically. If not, add it manually via Cloudflare dashboard → Workers & Pages → your Worker → Settings → Domains & Routes.

If the DNS doesn't resolve after deploy, check that the Cloudflare zone for `campshare.co.nz` has a CNAME `app` (the custom-domain route should add this automatically, but it sometimes needs a manual nudge).

### After deploying

1. Run the smoke test from [`05-current-state.md`](05-current-state.md) on the live URL.
2. Add `https://app.campshare.co.nz/api/auth/callback/google` to the Google OAuth client's authorized redirect URIs (Google Cloud Console).
3. If you haven't already, publish the OAuth consent screen so Google sign-in works for users not on the test-user list.
4. Verify Resend sender domain is configured for `campshare.co.nz` (or `hello@campshare.co.nz` specifically).

## Local D1 inspection

D1 local data lives under `.wrangler/state/d1/`. The simplest way to poke at it is the `wrangler d1 execute --local --command="..."` pattern above. For graphical inspection, a SQLite browser (DB Browser for SQLite) can open the underlying `.sqlite` file directly — but read-only, and don't edit it while the dev server is running.

## Common dev tasks

```bash
# Reset local D1 entirely (wipe + reapply schema)
rm -rf .wrangler
npx wrangler d1 execute campshare-db --local --file=src/db/schema.sql

# Tail production logs
npx wrangler tail campshare-app

# Open the deployed Worker in browser
npx wrangler dev --remote   # rare — usually `npm run dev` is what you want
```

## Things that bite

- **Edge runtime gotchas.** No Node `fs`, no `crypto.randomBytes` (use `crypto.getRandomValues`). Stick to Web APIs. OpenNext patches some of these but not all.
- **Cookies in dev.** `BETTER_AUTH_URL=http://localhost:3000` matters for cookie domain. Setting it to `https://...` while running on `http://localhost` breaks session cookies silently.
- **`getCloudflareContext()` outside a request.** Throws. Don't call it at module top level — see gotcha #2 in [`02-architecture.md`](02-architecture.md).
- **Wrangler config drift.** If `wrangler.jsonc` and a deployed Worker disagree (e.g. bindings differ), the deployed version wins until the next `npm run deploy`. Always treat `wrangler.jsonc` as the source of truth and re-deploy after editing it.
