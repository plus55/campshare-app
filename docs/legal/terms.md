---
title: Terms of Service
version: 0.1-draft
effective: TBD
last-updated: 2026-05-23
status: draft — pending lawyer review
---

# CampShare Terms of Service

**Important.** These Terms govern your use of CampShare. By creating an account, listing a vehicle, or making a booking, you agree to be bound by these Terms.

If you do not agree, you must not use CampShare.

> [!review] Confirm acceptance mechanism is sufficient under NZ contract law (click-wrap with versioned record kept per user).

---

## 1. About us

CampShare is operated by **CampShare Ltd** (NZBN `[TBD once Ltd formed]`), a company registered in New Zealand. We run a peer-to-peer marketplace at `campshare.co.nz` and `app.campshare.co.nz` that connects:

- **Hosts** — owners of campervans, motorhomes, and similar vehicles who list those vehicles for short-term rental, and
- **Guests** — people who book and use those vehicles.

CampShare is **not** the owner of any listed vehicle and is **not** a party to the rental agreement between Host and Guest. CampShare provides the platform, payment processing (through Stripe Connect), identity verification (through Stripe Identity), and the supporting trust-and-safety, booking, and dispute mechanisms.

Contact: `hello@campshare.co.nz` | Registered office: `[TBD]`

> [!review] Confirm correct framing of platform-versus-operator distinction for NZ purposes. Outdoorsy/Camplify both rely on this distinction, but NZ case law on marketplace liability is thin — flag the strongest formulation.

## 2. Definitions

- **Booking** — a confirmed reservation of a Vehicle by a Guest for a defined date range, accepted by the Host (whether through Instant Book or manual acceptance).
- **Cancellation Policy** — the cancellation terms set out at `/legal/cancellation`, version `standard_v1`.
- **Guest** — a registered User who books or attempts to book a Vehicle.
- **Host** — a registered User who lists a Vehicle for rental on CampShare.
- **KYC** — identity verification via Stripe Identity, required of all Guests before their first Booking.
- **Listing** — a Host's published page advertising a Vehicle for rental.
- **Platform** — the CampShare websites at `campshare.co.nz` and `app.campshare.co.nz`, our mobile-optimised pages, and any related services.
- **Security Deposit** — NZ$500, held by Stripe at the time of Booking and released after Vehicle return absent damage or dispute.
- **User** — any person who creates a CampShare account.
- **Vehicle** — a campervan, motorhome, caravan, or similar vehicle listed on CampShare by a Host.

## 3. Eligibility

To use CampShare you must:

- Be at least 18 years old;
- Have legal capacity to enter into a binding contract under NZ law;
- Be a NZ resident with a valid NZ residential address (during our initial launch — we may expand);
- Hold a valid driver licence appropriate to the Vehicle (for Guests) and provide it during KYC;
- Complete KYC via Stripe Identity before your first Booking (Guests).

Hosts must additionally meet the requirements of the Host Agreement at `/legal/host-agreement`. Guests must additionally meet the requirements of the Guest Agreement at `/legal/guest-agreement`.

CampShare may suspend or terminate any account that fails to meet these requirements at any time.

## 4. The platform and what CampShare does

CampShare:

1. **Hosts your Listing or Booking record.** We display Listings, run search and discovery, and store Booking history.
2. **Processes payment.** We act as a payment-facilitator through Stripe Connect. Guest funds are held by Stripe and paid out to the Host after the Booking completes, less CampShare's commission and Stripe's fees.
3. **Verifies identity.** We require Guests to complete Stripe Identity KYC before their first Booking.
4. **Provides messaging, calendar, and review tools** to support the Booking flow.
5. **Operates a dispute workflow** within a 7-day window after Booking completion, including security-deposit adjudication.

CampShare does not:

- Own, inspect, certify, or take physical custody of any Vehicle;
- Inspect, verify or guarantee Host-uploaded photographs, descriptions, pricing, or availability;
- Provide insurance directly (insurance is supplied by `[INSURER]` per `/legal/host-agreement` and `/legal/guest-agreement`);
- Act as your agent, partner, or employer.

## 5. Account registration and security

- Each User must provide accurate, current and complete information at registration and keep it up to date.
- You are responsible for safeguarding your password and all activity under your account.
- You must notify us promptly at `security@campshare.co.nz` if you suspect any unauthorised use.
- One person per account. Sharing accounts is grounds for suspension.

## 6. Fees

CampShare charges:

- **Guest service fee** — 12% of the nightly rate, calculated and shown at checkout;
- **Host commission** — 5% of the nightly rate, deducted from each payout;
- **GST** — 15% applied to CampShare's fees (not to the rental itself paid to the Host).

Stripe processing fees are passed through and shown transparently at checkout.

All fees and prices are in NZD unless stated otherwise. All Host nightly rates are inclusive of GST where the Host is GST-registered; non-GST-registered Hosts will quote a rate not inclusive of GST.

> [!review] Confirm GST treatment of (a) platform fee, (b) Host-supplied rental, (c) Add-ons, (d) Security Deposit — particularly the treatment when Host is below the $60k registration threshold.

## 7. Payments, payouts, and security deposit

- Guest is charged in full at the time of Booking confirmation (Instant Book) or on Host acceptance.
- Funds are held by Stripe (not by CampShare directly) until the Booking completes.
- Host payout occurs `[2–7 days]` after Booking completion, less CampShare commission and Stripe fees.
- The Security Deposit of NZ$500 is pre-authorised at Booking and released within 7 days of Vehicle return, less any damage claim raised within the dispute window.
- Refunds (when due under the Cancellation Policy or as resolved by dispute) are processed via the original payment method.

> [!review] Confirm escrow framing is correct — Stripe Connect's "destination charge" model is what we use; we never hold guest funds in CampShare's own bank account.

## 8. Cancellations and refunds

The Cancellation Policy `standard_v1` at `/legal/cancellation` applies to every Booking:

- **More than 7 days** before pickup — 100% refund (Guest service fee non-refundable);
- **2 to 7 days** before pickup — 50% refund;
- **Less than 48 hours** before pickup — 0% refund.

Cancellations by the Host (other than for proven safety or compliance reasons) result in:

- Full refund to the Guest;
- A penalty to the Host equal to 10% of the booking value (capped at NZ$200) credited to CampShare to cover the disrupted Guest's rebooking costs;
- Possible loss of Super Host status.

Force-majeure exceptions (natural disaster, civil emergency, Host or Guest serious illness with evidence) may be reviewed and waived at CampShare's reasonable discretion.

## 9. Reviews

Both Host and Guest may leave a review after Booking completion. CampShare publishes reviews unaltered, except where they:

- Contain personal information about a third party,
- Violate the Acceptable Use Policy at `/legal/acceptable-use`,
- Are demonstrably false or made in bad faith, or
- Are subject to an open dispute (review is held until dispute resolves).

CampShare does not pay for, solicit, or fabricate reviews.

## 10. Disputes between Host and Guest

The dispute window opens at Booking completion and runs for 7 calendar days. Either party may raise a dispute via `/dashboard/bookings/[id]/dispute`.

CampShare will:

- Acknowledge the dispute within 1 business day;
- Request supporting evidence (photographs, messages, third-party reports);
- Reach a decision within 5 business days where evidence is sufficient;
- Adjudicate the Security Deposit where damage is claimed.

CampShare's decision on the Security Deposit is binding for the purposes of releasing or withholding that deposit. It does **not** preclude either party from pursuing civil remedies between themselves.

## 11. Acceptable use

Use of CampShare is subject to the Acceptable Use Policy at `/legal/acceptable-use`. Breaches may result in content removal, suspension, or termination.

## 12. Intellectual property

- CampShare and the CampShare logo are trade marks of CampShare Ltd (application pending with IPONZ as at 2026-05-23).
- All content on the Platform other than User-supplied content is owned by CampShare Ltd or licensed to us.
- By uploading content (Listings, photographs, reviews, messages), you grant CampShare a worldwide, non-exclusive, royalty-free licence to host, store, reproduce and display that content for the purpose of operating the Platform and marketing CampShare. This licence survives account termination only to the extent reasonably necessary (e.g. preserving review history of completed Bookings).

> [!review] Confirm licence wording is the minimum necessary — some founders prefer a narrower licence that terminates fully on account closure, but that prevents us keeping the public review record.

## 13. Disclaimers

CampShare provides the Platform "as is" and "as available." To the maximum extent permitted by NZ law:

- CampShare does not warrant the accuracy, completeness, or safety of any Listing;
- CampShare does not warrant uninterrupted availability of the Platform;
- CampShare is not responsible for the condition, roadworthiness, mechanical performance, or legal compliance of any Vehicle;
- CampShare is not responsible for the conduct of any User.

Nothing in these Terms excludes, restricts, or modifies any guarantee, right or remedy implied by the **Consumer Guarantees Act 1993** or any other NZ legislation that cannot lawfully be excluded.

> [!review] Standard NZ disclaimer wording — confirm exact CGA carve-out wording.

## 14. Limitation of liability

To the maximum extent permitted by NZ law, CampShare Ltd's aggregate liability arising out of or in connection with the Platform or any Booking is limited to the greater of:

- the total fees paid by you to CampShare in the 12 months preceding the event giving rise to the claim, or
- NZ$500.

CampShare is not liable for indirect, consequential, special, or punitive damages, lost profits, loss of revenue, loss of data, or loss of business opportunity.

> [!review] Confirm this cap survives CGA scrutiny for marketplace services; consider whether to set a separate per-Booking liability cap distinct from the aggregate cap.

## 15. Indemnity

You agree to indemnify and hold CampShare Ltd and its directors, employees and contractors harmless from any claim arising out of:

- Your breach of these Terms or any related Agreement;
- Your use or misuse of the Platform;
- Your operation of, condition of, or damage to a Vehicle;
- Your interaction with another User.

This indemnity does not apply to the extent the claim arises from CampShare's own gross negligence or wilful misconduct.

## 16. Suspension and termination

CampShare may suspend or terminate your account immediately, with or without notice, if:

- You breach these Terms or any related Agreement;
- We have a reasonable suspicion of fraud, identity misrepresentation, payment misuse, or safety risk;
- Required by law, court order, or a request from a regulator or law-enforcement agency;
- You fail KYC or are sanctioned under NZ or applicable international sanctions law.

You may close your account at any time via account settings. Closure does not relieve you of obligations relating to any prior Booking.

## 17. Changes to these Terms

We may amend these Terms from time to time. The "version" and "effective" date at the top of this page indicate the current version. Material changes will be notified to Users by email and on first login after the change takes effect. Continued use after the effective date constitutes acceptance of the amended Terms.

## 18. Governing law and disputes with CampShare

These Terms are governed by the laws of New Zealand. Any dispute between you and CampShare Ltd that cannot be resolved by good-faith negotiation will be submitted to the exclusive jurisdiction of the courts of New Zealand (Auckland venue).

You agree to first contact us at `hello@campshare.co.nz` and allow CampShare 30 days to attempt informal resolution before commencing proceedings.

## 19. General

- **Entire agreement** — these Terms, together with the Privacy Policy, applicable Host/Guest Agreement, Cancellation Policy and Acceptable Use Policy, constitute the entire agreement between you and CampShare Ltd.
- **Severability** — if any clause is found unenforceable, the remaining clauses continue in full force.
- **Assignment** — you may not assign your rights or obligations without our prior written consent. We may assign these Terms to a successor entity in connection with a merger, acquisition, or sale of assets.
- **No waiver** — failure to enforce any provision is not a waiver of our right to enforce it later.
- **Notices to you** — by email to the address on your account.
- **Notices to us** — by email to `legal@campshare.co.nz`.

---

**Last updated:** 2026-05-23
**Version:** 0.1-draft
