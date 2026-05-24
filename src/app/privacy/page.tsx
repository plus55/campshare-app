import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Privacy Policy — CampShare",
  description: "How CampShare collects, uses, and protects your personal information under the Privacy Act 2020 (NZ).",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[720px]">

        {/* Draft notice */}
        <div className="bg-ochre/15 border border-ochre/40 rounded-[var(--radius)] px-4 py-3 mb-8 text-[13px] text-charcoal-soft">
          <strong className="text-charcoal">Draft — subject to final legal review.</strong>{" "}
          This policy has not yet been reviewed by a lawyer and may change before CampShare launches.
        </div>

        <h1 className="font-serif text-forest-deep mb-2">Privacy Policy</h1>
        <p className="text-stone text-sm mb-8">Last updated: 23 May 2026 · Version 0.1-draft</p>

        <p>
          This Privacy Policy explains how <strong>CampShare Ltd</strong> collects, uses, discloses,
          retains and protects personal information. It complies with the{" "}
          <strong>Privacy Act 2020 (NZ)</strong>, including Information Privacy Principle (IPP) 3A
          which came into force on 1 May 2026.
        </p>

        <p>
          Questions? Contact our Privacy Officer: <strong>Jonty Davies</strong>{" "}
          <a href="mailto:privacy@campshare.co.nz" className="text-clay hover:text-clay-deep">
            privacy@campshare.co.nz
          </a>
        </p>

        <hr className="border-line my-8" />

        <h2>1. Personal information we collect</h2>
        <p>We collect information you give us directly (name, email, password, mobile number, date of birth, driver licence and selfie for KYC) and information generated through your use of the platform (bookings, messages, reviews, payout records, IP address, device identifiers, usage patterns).</p>

        <h2>2. How we use it</h2>
        <p>To operate the marketplace (matching guests with hosts, processing bookings and payments), verify identity (Stripe Identity KYC), communicate with you, comply with legal obligations, prevent fraud, and improve the platform.</p>

        <h2>3. Who we share it with</h2>
        <p>Stripe (payments and identity verification), Resend (transactional email), Cloudflare (hosting and analytics), Sentry (error monitoring), and Mapbox (mapping). We do not sell your personal information.</p>

        <h2>4. Retention</h2>
        <p>We retain booking and financial records for 7 years for tax and legal compliance. Account data is retained while your account is active and for 3 years after closure. KYC records follow Stripe's retention policy.</p>

        <h2>5. Your rights</h2>
        <p>Under the Privacy Act 2020, you have the right to access, correct, and in some cases request deletion of your personal information. Contact{" "}
          <a href="mailto:privacy@campshare.co.nz" className="text-clay hover:text-clay-deep">
            privacy@campshare.co.nz
          </a>.
        </p>

        <h2>6. Cookies</h2>
        <p>We use Cloudflare Web Analytics (privacy-first, no cross-site tracking) only if you accept cookies. You can withdraw consent at any time via the cookie banner.</p>

        <hr className="border-line my-8" />

        <p className="text-stone text-[13px]">
          <Link href="/terms" className="text-clay hover:text-clay-deep">Terms of Service</Link>
          {" · "}
          <Link href="/" className="text-clay hover:text-clay-deep">Back to CampShare</Link>
        </p>
      </div>
    </main>
  );
}
