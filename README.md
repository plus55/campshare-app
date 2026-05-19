# CampShare App

Authenticated layer of CampShare, served at **app.campshare.co.nz**. The marketing site at www.campshare.co.nz lives in a separate repo.

Built with **Next.js 15** (App Router) on **Cloudflare Workers** via OpenNext, with **Better Auth** on **Cloudflare D1** and transactional email through **Resend**.

## Stack

- Next.js 15 (App Router, Server Components)
- Better Auth (email/password, Google OAuth, magic link)
- Cloudflare D1 (SQLite) for users, sessions, host applications
- Cloudflare R2 for van photos (Sprint 3)
- Resend for transactional email
- Deployed via `@opennextjs/cloudflare`

## Local development

```bash
cp .env.local.example .env.local
# fill in RESEND_API_KEY (all other vars are pre-filled)

npm install
npm run dev
```

App runs at http://localhost:3000.

## Deploy

```bash
npm run deploy
# then point app.campshare.co.nz (CNAME) at the deployed Worker
```

## Routes

| Path | Purpose |
|---|---|
| `/login` | Sign in (email + password, Google, magic link) |
| `/signup` | Create account |
| `/verify-email` | Post-signup verification screen |
| `/forgot-password` | Password reset request |
| `/dashboard` | Authenticated home (adaptive host application card) |
| `/apply` | 4-step host application form |
| `/apply/submitted` | Confirmation screen |
| `/admin` | Admin table (gated to ADMIN_EMAIL) |
| `/admin/applications/[id]` | Application detail + approve/reject |
| `/api/auth/[...all]` | Better Auth catch-all |
| `/api/apply` | POST a host application |
| `/api/admin/applications/[id]` | PATCH approve/reject |

## Context and roadmap

See [`docs/context/`](docs/context/) for full product, architecture, database, and sprint docs.
