---
title: Cancellation Policy
version: standard_v1
effective: TBD
last-updated: 2026-05-23
status: draft — pending lawyer review
---

# CampShare Cancellation Policy

**This page reproduces the cancellation rules enforced by the CampShare booking system. The version is `standard_v1` and matches the code in `src/lib/cancellation.ts`.**

This Policy applies to every Booking and forms part of the [Terms of Service](/legal/terms), [Host Agreement](/legal/host-agreement), and [Guest Agreement](/legal/guest-agreement).

---

## When a Guest cancels

Refund of the **nightly rate** (Host-set price × nights):

| When you cancel | Refund of nightly rate |
|---|---|
| More than 7 days before pickup | **100%** |
| 2 to 7 days before pickup | **50%** |
| Less than 48 hours before pickup | **0%** |

The **Guest service fee (12%)** is non-refundable when you cancel.

The **NZ$500 Security Deposit** is always released in full.

**Add-ons** (Excess Reduction, Off-road clearance, Extra driver, etc.) follow the same refund schedule as the nightly rate.

## When a Host cancels

If a Host cancels a confirmed Booking — other than for a valid safety, compliance, or force-majeure reason — you receive:

- **100% refund** of all amounts paid (nightly rate, service fee, Add-ons, Security Deposit pre-authorisation released);
- Assistance from CampShare to find an alternative Vehicle for the same dates where possible.

The Host incurs a 10% penalty (capped at NZ$200) credited to CampShare to cover Guest support and rebooking costs.

## When neither side can perform — force majeure

If a Booking cannot proceed because of:

- A natural disaster, civil emergency, public-health order, or NZTA road closure preventing travel;
- A serious medical event affecting the Guest, primary driver, or Host (with supporting documentation);
- Vehicle breakdown disclosed by the Host before pickup that cannot be remedied in time;

CampShare may, at its reasonable discretion, refund the Guest in full and waive the Host penalty. Decisions are made case-by-case and require supporting evidence (medical certificate, civil-defence order, NZTA advisory, etc.).

## When the dispute window applies

The cancellation policy governs **before pickup**. Once the Booking has started, refunds and credits are handled through the [dispute workflow](/legal/terms#10-disputes-between-host-and-guest), with the same 7-day post-completion window.

## How refunds are processed

- Refunds are processed via the original payment method.
- Stripe typically returns funds to the cardholder within 5–10 business days.
- The Security Deposit, once released, may show as a "voided authorisation" rather than a "refund" depending on your bank.

## Examples

**Example 1.** A Guest books a NZ$200/night Vehicle for 5 nights = NZ$1,000 nightly rate + NZ$120 service fee + NZ$500 deposit. They cancel 10 days before pickup.
- Refund: NZ$1,000 nightly rate (100%) + NZ$500 deposit released. Service fee NZ$120 retained.
- Total refunded: NZ$1,500.

**Example 2.** Same Booking, cancelled 4 days before pickup.
- Refund: NZ$500 nightly rate (50%) + NZ$500 deposit released. Service fee NZ$120 retained.
- Total refunded: NZ$1,000. Host receives NZ$500 less commission.

**Example 3.** Same Booking, cancelled 24 hours before pickup.
- Refund: NZ$0 nightly rate + NZ$500 deposit released. Service fee NZ$120 retained.
- Total refunded: NZ$500. Host receives full nightly rate less commission.

**Example 4.** Host cancels a confirmed Booking 3 days before pickup with no valid reason.
- Refund: NZ$1,000 nightly rate + NZ$120 service fee + NZ$500 deposit released. Total refunded: NZ$1,620.
- Host charged NZ$100 penalty.

---

**Policy version:** `standard_v1`
**Last updated:** 2026-05-23
