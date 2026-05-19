# CampShare Context Pack

This folder is the long-form context for anyone (human or AI) joining the CampShare project. Read it in order on first session; refer back by file as needed.

The repo-root [`CLAUDE.md`](../../CLAUDE.md) is the short version — these files are the depth behind it.

## Files

| # | File | What's in it |
|---|------|--------------|
| 01 | [`01-product.md`](01-product.md) | What CampShare is, target market, users, business model, north-star scope |
| 02 | [`02-architecture.md`](02-architecture.md) | Stack (Next.js + Cloudflare Workers + D1 + R2 + Better Auth + Resend), hosting model, key gotchas |
| 03 | [`03-repo-structure.md`](03-repo-structure.md) | File and folder layout, what lives where |
| 04 | [`04-database.md`](04-database.md) | Current D1 schema (5 tables) + planned tables for marketplace-complete |
| 05 | [`05-current-state.md`](05-current-state.md) | Sprint 2 status, fixes applied, smoke test plan, deploy blockers |
| 06 | [`06-roadmap.md`](06-roadmap.md) | Sprint 3 scope + the marketplace-complete backlog (the gap list) |
| 07 | [`07-dev-setup.md`](07-dev-setup.md) | Install, run locally, env vars, deploy steps, DNS |
| 08 | [`08-resources.md`](08-resources.md) | External URLs, account IDs, dashboards (no secrets) |
| 09 | [`09-conventions.md`](09-conventions.md) | Code patterns to follow, anti-patterns to avoid |

## Sibling docs (outside `context/`)

- [`../HANDOFF-2026-05-19.md`](../HANDOFF-2026-05-19.md) — handoff note from the session that fixed the auth build bugs and provisioned infra.
- [`../SPRINT2-STATUS.md`](../SPRINT2-STATUS.md) — Sprint 2 close-out status.

When a new session ends with meaningful changes, drop another `HANDOFF-YYYY-MM-DD.md` next to those.

## How to keep this current

These files describe the project *as of* the dates they cite. The repo itself is the source of truth for code; these docs are the source of truth for *intent and history*.

- If you change the stack, update `02-architecture.md`.
- If you ship a sprint, update `05-current-state.md` and `06-roadmap.md` together.
- If you add a new external dependency or dashboard, update `08-resources.md`.
- If a convention changes, update `09-conventions.md` *and* the root `CLAUDE.md`.

If a doc and the code disagree, the code wins — but treat the disagreement as a bug in the doc and fix it.
