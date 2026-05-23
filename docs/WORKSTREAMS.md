# Active Workstreams

This file is the shared handoff point for parallel application work. Update it
at task boundaries when ownership or blocked paths change.

## Codex

- Branch: `codex/audit-remediation`
- Proposed work: launch-critical application audit remediation, beginning with
  booking/payment integrity and security blockers.
- Avoid concurrent edits in:
  - `src/app/api/bookings/**`
  - `src/app/api/cron/**`
  - `src/db/migrations/**`
  - `src/lib/money.ts`
  - `src/lib/cancellation.ts`

## Claude

- Branch: `claude/current-work`
- Work assignment: Full UI migration — Tailwind v4 + shadcn/ui, Refresh visual treatment,
  dark mode, Storybook. See plan at `.claude/plans/snazzy-crunching-donut.md`.
- Owned paths:
  - `src/components/**` (all)
  - `src/app/**` (UI pages only — excludes Codex-reserved API routes below)
  - `src/app/globals.css`
  - `src/lib/utils.ts`
  - `tailwind.config.ts`
  - `postcss.config.js`
  - `public/**`
  - `.storybook/**`
- Avoid concurrent edits in (reserved for Codex):
  - `src/app/api/bookings/**`
  - `src/app/api/cron/**`
  - `src/db/migrations/**`
  - `src/lib/money.ts`
  - `src/lib/cancellation.ts`
- Before editing files listed under Codex ownership, coordinate here and rebase
  from `main` after the relevant remediation merge.

## Decisions Pending

- Security deposit / damage-claim payment model.
- Cancellation policy treatment of guest service fees and GST.
- Lawyer approval and publication of Terms, Privacy, and related agreements.
- Stripe live-mode, Identity, webhook, and real-payment verification actions.
- Physical iOS Safari and Android Chrome booking-flow QA.
