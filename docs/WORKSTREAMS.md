# Active Workstreams

This file is the shared handoff point for parallel application work. Update it
at task boundaries when ownership or blocked paths change.

## Codex

- Branch: `codex/audit-remediation`
- Completed checkpoint: `a51581c` secures Turnstile enforcement, public
  location handling, map popup rendering, and iCal imports.
- Current checkpoint: booking/payment integrity guards, including overlap
  protection, transition locking, cancellation failure behavior, date-change
  restrictions, and payout idempotency.
- Follow-on checkpoint: authorization ownership validation, expired-request
  authorization release, authenticated cron execution, retryable Stripe
  webhook processing, and consistent Stripe payout-readiness checks.
- Avoid concurrent edits in:
  - `src/app/api/bookings/**`
  - `src/app/api/cron/**`
  - `src/db/migrations/**`
  - `src/lib/money.ts`
  - `src/lib/cancellation.ts`

## Claude

- Branch: `claude/current-work`
- Saved WIP checkpoint: `caf56f3` preserves the interrupted multistage
  Tailwind/shadcn UI migration through partial Stage 5 work.
- Work assignment: UI/readiness improvements outside Codex-owned payment paths.
- Known overlap with Codex correctness changes: trips, dashboard bookings, and
  dashboard payouts pages were edited in both branches. Preserve Codex payment
  behavior while resolving the UI migration.
- Before editing files listed under Codex ownership, coordinate here and rebase
  from `main` after the relevant remediation merge.

## Decisions Pending

- Security deposit / damage-claim payment model.
- Cancellation policy treatment of guest service fees and GST.
- Lawyer approval and publication of Terms, Privacy, and related agreements.
- Stripe live-mode, Identity, webhook, and real-payment verification actions.
- Physical iOS Safari and Android Chrome booking-flow QA.
