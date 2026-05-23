# CampShare Legal Pages — Drafts

**Status:** First-pass drafts, NOT yet reviewed by a NZ lawyer. Do not publish to `campshare.co.nz/legal/*` until redlined and approved.

Drafted 2026-05-23 as part of [[02-Legal-Compliance]] sub-project of the CampShare public launch roadmap.

## Files

| File | Published path | Audience |
|---|---|---|
| `terms.md` | `/legal/terms` | All users — master platform terms |
| `privacy.md` | `/legal/privacy` | All users — NZ Privacy Act 2020 + IPP 3A (in force 1 May 2026) |
| `host-agreement.md` | `/legal/host-agreement` | Hosts only — separately accepted at host application |
| `guest-agreement.md` | `/legal/guest-agreement` | Guests only — separately accepted at first booking |
| `cancellation.md` | `/legal/cancellation` | All users — referenced from checkout and booking thread |
| `acceptable-use.md` | `/legal/acceptable-use` | All users — basis for account suspension/ban |

## Source material

- Modelled on Camplify NZ T&Cs (publicly available), Goboony EU terms, Outdoorsy US terms
- Specifically NZ-flavoured: Privacy Act 2020 (incl. IPP 3A from 1 May 2026), Fair Trading Act 1986, Consumer Guarantees Act 1993
- Stripe Connect disclosures per Stripe's own connected-account requirements
- Cancellation policy verbatim from CampShare codebase: `standard_v1` (>7d 100% / 2–7d 50% / <48h 0%)

## Lawyer review brief (give to NZ lawyer alongside these drafts)

CampShare is a peer-to-peer campervan rental marketplace incorporated as a NZ Ltd company. We facilitate bookings between hosts (van owners) and guests (renters), take a commission, and process payments via Stripe Connect with funds flowing through to hosts after booking completion. We hold a $500 NZD security deposit, run KYC via Stripe Identity, enforce driver age tiers (18/21/25), and have a built-in dispute workflow with a 7-day post-completion window.

Please review for:
1. **NZ enforceability** — anything that wouldn't stand up in NZ District/High Court
2. **Privacy Act 2020 compliance** — especially IPP 3A (indirect collection notification, in force 1 May 2026)
3. **Fair Trading Act 1986** — pricing transparency, no hidden fees
4. **Consumer Guarantees Act 1993** — what nuance applies to a P2P platform vs. a service provider
5. **Marketplace-specific risk** — platform-vs-operator distinction, liability flow-through, when CampShare becomes a party vs. an intermediary
6. **Insurance interaction** — placeholders are marked `[INSURER]`, `[POLICY]` — these will be filled once [[03-Insurance-Risk]] closes

Specific clauses we want lawyer attention on are flagged inline as `> [!review]`.

## Versioning

When you ship a new version of any of these documents, bump the version in the YAML frontmatter at the top of the file. The app records the version + timestamp per user at signup (and at first acceptance of the per-side Agreement). Old versions are kept in `versions/` once superseded.
