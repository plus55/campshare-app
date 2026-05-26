import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Booking policies — CampShare",
  description: "Insurance, security deposit, damage claims, cancellation and GST policies for CampShare.",
};

export default function PoliciesPage() {
  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[720px]">
        <div className="bg-ochre/15 border border-ochre/40 rounded-[var(--radius)] px-4 py-3 mb-8 text-[13px] text-charcoal-soft">
          <strong className="text-charcoal">Draft.</strong>{" "}
          Confirm insurance wording with an insurance broker and GST treatment with an accountant before launch.
        </div>

        <h1 className="font-serif text-forest-deep mb-2">Booking policies</h1>
        <p className="text-stone text-sm mb-8">Last updated: 25 May 2026 · Version 0.1-draft</p>

        <h2>1. Insurance (hosts)</h2>
        <p>
          CampShare uses a <strong>host-carries-cover</strong> model. Each Host must hold a motor-vehicle
          insurance policy that explicitly permits renting the vehicle for payment (&ldquo;hire or
          reward&rdquo;). Standard personal policies usually exclude this, so most Hosts need a
          peer-to-peer / short-term rental policy or a commercial policy.
        </p>
        <p>
          Before a listing can go live, the Host uploads a current certificate of currency or policy
          schedule, which CampShare verifies. A listing cannot be published, and bookings cannot be
          accepted, without verified, in-date cover. If a policy lapses, affected listings are paused
          automatically until cover is renewed. <strong>CampShare does not provide or underwrite
          insurance.</strong>
        </p>

        <h2>2. Security deposit</h2>
        <p>
          Every booking carries a <strong>NZ$500 refundable security deposit</strong>. It is authorised
          when the trip begins and released after the trip completes if no claim is made. The deposit is
          the first layer of protection for minor damage; the Host&apos;s insurance covers damage above
          the deposit, third-party liability, theft and write-off.
        </p>

        <h2>3. Damage claims</h2>
        <p>
          Either party may open a damage claim within <strong>7 days of trip completion</strong>, with a
          description and photo evidence. CampShare reviews each claim and decides the outcome: the
          deposit is returned to the Guest, awarded to the Host, or split. Where the deposit is awarded
          to the Host, CampShare charges the Guest&apos;s saved payment method (up to NZ$500) and pays the
          Host. Damage beyond the deposit is a matter for the Host&apos;s insurer.
        </p>

        <h2>4. Cancellation (Standard policy)</h2>
        <p>If a Guest cancels, the refund of the rental amount depends on timing:</p>
        <ul className="list-disc pl-5">
          <li>More than 7 days before the trip starts — 100% refund</li>
          <li>Between 2 and 7 days before — 50% refund</li>
          <li>Less than 2 days before — no refund</li>
        </ul>
        <p>
          If a Host cancels a confirmed booking, the Guest receives a 100% refund. Bookings cannot be
          cancelled once the trip is in progress.
        </p>

        <h2>5. GST</h2>
        <p>
          Prices are shown in New Zealand dollars. CampShare charges a guest service fee and applies 15%
          GST to that fee. GST treatment of the rental itself depends on each Host&apos;s circumstances.
        </p>

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
