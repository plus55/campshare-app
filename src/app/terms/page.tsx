import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — CampShare",
  description: "The terms that govern your use of CampShare — the peer-to-peer campervan marketplace for Aotearoa.",
};

export default function TermsPage() {
  return (
    <main className="cs-page">
      <div className="cs-container cs-narrow" style={{ maxWidth: 720 }}>

        {/* Draft notice */}
        <div className="bg-ochre/15 border border-ochre/40 rounded-[var(--radius)] px-4 py-3 mb-8 text-[13px] text-charcoal-soft">
          <strong className="text-charcoal">Draft — subject to final legal review.</strong>{" "}
          These Terms have not yet been reviewed by a lawyer and may change before CampShare launches.
        </div>

        <h1 className="font-serif text-forest-deep mb-2">Terms of Service</h1>
        <p className="text-stone text-sm mb-8">Last updated: 23 May 2026 · Version 0.1-draft</p>

        <p>
          <strong>Important.</strong> These Terms govern your use of CampShare. By creating an account,
          listing a vehicle, or making a booking, you agree to be bound by these Terms. If you do not
          agree, you must not use CampShare.
        </p>

        <hr className="border-line my-8" />

        <h2>1. About us</h2>
        <p>
          CampShare is operated by <strong>CampShare Ltd</strong>, a company registered in New Zealand.
          We run a peer-to-peer marketplace at campshare.co.nz and app.campshare.co.nz that connects
          Hosts (campervan owners) and Guests (travellers).
        </p>
        <p>
          CampShare is <strong>not</strong> the owner of any listed vehicle and is{" "}
          <strong>not</strong> a party to the rental agreement between Host and Guest.
          CampShare provides the platform, payment processing (Stripe Connect), identity verification
          (Stripe Identity), and supporting trust-and-safety mechanisms.
        </p>
        <p>Contact: <a href="mailto:hello@campshare.co.nz" className="text-clay hover:text-clay-deep">hello@campshare.co.nz</a></p>

        <h2>2. Eligibility</h2>
        <p>You must be at least 18 years old to use CampShare. Guests must hold a valid driver licence appropriate for the vehicle hired. Hosts must own or have legal authority to list the vehicle.</p>

        <h2>3. Bookings and payments</h2>
        <p>All payments are processed by Stripe. Funds are held by Stripe until the booking begins, then released to the Host after the rental period starts, subject to our cancellation policy. CampShare charges a service fee deducted from the total.</p>

        <h2>4. Cancellations and refunds</h2>
        <p>Cancellation policies are set at the listing level (flexible, moderate, or strict). Guest service fees are non-refundable once a booking is confirmed. Host cancellations may result in penalties. Full policy details are shown at checkout.</p>

        <h2>5. Insurance and liability</h2>
        <p>Hosts are responsible for ensuring their vehicle has appropriate insurance cover for peer-to-peer rental. CampShare does not provide insurance. Guests assume liability for damage beyond fair wear and tear during the rental period.</p>

        <h2>6. Prohibited conduct</h2>
        <p>You must not use CampShare for unlawful purposes, submit false information, circumvent payments outside the platform, or harass other users.</p>

        <h2>7. Termination</h2>
        <p>We may suspend or terminate accounts that breach these Terms, at our discretion, with or without notice for serious breaches.</p>

        <h2>8. Governing law</h2>
        <p>These Terms are governed by New Zealand law. Disputes will be subject to the exclusive jurisdiction of the New Zealand courts.</p>

        <hr className="border-line my-8" />

        <p className="text-stone text-[13px]">
          <Link href="/privacy" className="text-clay hover:text-clay-deep">Privacy Policy</Link>
          {" · "}
          <Link href="/" className="text-clay hover:text-clay-deep">Back to CampShare</Link>
        </p>
      </div>
    </main>
  );
}
