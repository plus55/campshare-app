# Active Workstreams

This file is the shared handoff point for parallel application work. Update it
at task boundaries when ownership or blocked paths change.

## Codex

- Branch: `codex/audit-remediation`
- Completed checkpoint: `a51581c` secures Turnstile enforcement, public
  location handling, map popup rendering, and iCal imports.
- Completed checkpoint: booking/payment integrity guards, including overlap
  protection, transition locking, cancellation failure behavior, date-change
  restrictions, and payout idempotency.
- Completed checkpoint: authorization ownership validation, expired-request
  authorization release, authenticated cron execution, retryable Stripe
  webhook processing, and consistent Stripe payout-readiness checks.

## Claude

- Branch: `claude/current-work`
- Saved checkpoint: `6920e71` preserves the Tailwind/shadcn migration through
  the Stage 6 and theme work completed before integration.
- Known overlap with Codex correctness changes: trips, dashboard bookings, and
  dashboard payouts pages were edited in both branches. Preserve Codex payment
  behavior while resolving the UI migration.

## Integration

- Branch: `codex/ui-remediation`
- Scope: reconcile the completed audit remediation with Claude's latest UI
  checkpoint, complete light-theme launch cleanup, and retain correctness-side
  behavior for booking, payment, location, Turnstile, iCal, webhook, and
  payout flows.
- Launch theme decision: light theme only; do not expose the incomplete theme
  toggle in navigation.

## Decisions Pending

- Security deposit / damage-claim payment model.
- Cancellation policy treatment of guest service fees and GST.
- Lawyer approval and publication of Terms, Privacy, and related agreements.
- Stripe live-mode, Identity, webhook, and real-payment verification actions.
- Physical iOS Safari and Android Chrome booking-flow QA.
