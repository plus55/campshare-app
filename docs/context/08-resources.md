# 08 — Resources

External URLs, account IDs, and dashboards for the CampShare app. **No secrets in this file** — secrets live in `.env.local` (locally) and as Cloudflare Worker secrets (in prod). If you need to know what a secret is, look in those two places, not here.

## Code & repo

| Resource | URL | Notes |
|---|---|---|
| GitHub repo | https://github.com/plus55/campshare-app | Org `plus55`. Main branch is `main`. |
| Workspace folder (local) | `D:\Campshare\CAMPSHARE.CO.NZ` | Jonty's working copy on Windows |
| Live target URL | https://app.campshare.co.nz | Not yet deployed as of 2026-05-19 |
| Marketing site | https://campshare.co.nz | Separate Worker, not in this repo |

## Cloudflare

| Resource | URL / ID | Purpose |
|---|---|---|
| Dashboard | https://dash.cloudflare.com | Top-level entry |
| Workers & Pages | dash → Workers & Pages | The `campshare-app` Worker lives here once deployed |
| D1 database | dash → Workers & Pages → D1 → `campshare-db` | Name: `campshare-db` |
| D1 database ID | `a1a0059a-fdac-4f2b-858f-b8d563728d67` | Referenced in `wrangler.jsonc` |
| R2 bucket | dash → R2 → `campshare-photos` (not yet created) | Van photos in Sprint 3 |
| DNS zone | dash → `campshare.co.nz` → DNS | Apex zone for both marketing + app |
| Worker route | `app.campshare.co.nz` (declared in `wrangler.jsonc` as a custom domain) | Auto-attaches on deploy |
| Marketing-site Worker | dash → Workers & Pages → marketing-site Worker | Holds the `RESEND_API_KEY` secret to copy across |

Wrangler config: `wrangler.jsonc` in repo root. Edits there require a redeploy to take effect.

## Google Cloud (OAuth)

| Resource | URL / ID | Purpose |
|---|---|---|
| Google Cloud Console | https://console.cloud.google.com | Project: "My First Project" |
| OAuth consent screen | console → APIs & Services → OAuth consent screen | Currently in test-user mode |
| OAuth client | console → APIs & Services → Credentials → OAuth 2.0 Client IDs | Type: Web application |
| OAuth client ID (public, not a secret) | `195293662407-ulvcvrd0ialn0gi94sqip26amafm472d.apps.googleusercontent.com` | |
| OAuth client secret | *not in this doc* | Stored in `.env.local` and Worker secret |
| Authorized redirect URI (dev) | `http://localhost:3000/api/auth/callback/google` | Must match exactly |
| Authorized redirect URI (prod) | `https://app.campshare.co.nz/api/auth/callback/google` | Add after first deploy |
| Test users | console → OAuth consent screen → Test users | Add your email here while in test mode |

To go live for the public: console → OAuth consent screen → "Publish app". Triggers a Google review for sensitive scopes; basic profile + email shouldn't.

## Resend (email)

| Resource | URL | Purpose |
|---|---|---|
| Dashboard | https://resend.com/emails | Sent log, bounce monitoring |
| Domain config | resend → Domains | Verify `campshare.co.nz` for sender `hello@campshare.co.nz` |
| API keys | resend → API Keys | The key for this app should already exist in the marketing-site Worker |

Sender: `CampShare <hello@campshare.co.nz>`. If a user reports an email not arriving, check Resend dashboard first — the app catches errors silently and only logs them.

## Documentation

| Library | Docs |
|---|---|
| Next.js (App Router) | https://nextjs.org/docs |
| Better Auth | https://www.better-auth.com |
| OpenNext (Cloudflare) | https://opennext.js.org/cloudflare |
| Cloudflare Workers | https://developers.cloudflare.com/workers |
| Cloudflare D1 | https://developers.cloudflare.com/d1 |
| Cloudflare R2 | https://developers.cloudflare.com/r2 |
| Kysely | https://kysely.dev |
| kysely-d1 | https://github.com/aidenwallis/kysely-d1 |
| Resend | https://resend.com/docs |
| Wrangler | https://developers.cloudflare.com/workers/wrangler |

## Secrets — where they live

| Secret | Local (`.env.local`) | Production (Worker secret) | Notes |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | ✅ Required | ✅ Required (`wrangler secret put`) | Same value across both is fine |
| `GOOGLE_CLIENT_ID` | ✅ Required | ✅ Required | |
| `GOOGLE_CLIENT_SECRET` | ✅ Required | ✅ Required | |
| `RESEND_API_KEY` | ❌ **Missing as of 2026-05-19** | ✅ Required | Copy from marketing-site Worker |
| `BETTER_AUTH_URL` | ✅ Required (`http://localhost:3000`) | Set in `wrangler.jsonc` as a `var` (not a secret) | Already configured |
| `ADMIN_EMAIL` | Optional (default in code) | Set in `wrangler.jsonc` as a `var` | Already configured |
| `EMAIL_FROM` | ✅ Required | ✅ Required as Worker secret | |

## Internal handoff docs (in-repo)

- [`docs/HANDOFF-2026-05-19.md`](../HANDOFF-2026-05-19.md) — last session handoff
- [`docs/SPRINT2-STATUS.md`](../SPRINT2-STATUS.md) — Sprint 2 close-out
- [`docs/context/`](.) — this folder

## Useful commands cheat-sheet

```bash
# Deploy
npm run deploy

# Apply schema to remote D1
npx wrangler d1 execute campshare-db --remote --file=src/db/schema.sql

# Tail production logs
npx wrangler tail campshare-app

# Set a Worker secret
npx wrangler secret put RESEND_API_KEY

# List bindings + status of the Worker
npx wrangler deployments list

# Inspect remote D1 directly
npx wrangler d1 execute campshare-db --remote --command="SELECT count(*) FROM user"
```
