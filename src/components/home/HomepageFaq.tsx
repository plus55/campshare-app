const FAQS = [
  {
    section: "For travellers",
    items: [
      { q: "How does booking work?", a: "Find a van, send the host a booking request with your dates and a short message. Your card is authorised on request and only charged when the host accepts. You&rsquo;ll get an email confirmation with pickup details." },
      { q: "What happens if I need to cancel?", a: "Cancel more than 7 days before check-in for a full refund. Between 2&ndash;7 days you get 50% back. Inside 48 hours bookings are non-refundable. The host&rsquo;s policy is shown on every listing." },
      { q: "Is there a security deposit?", a: "Yes &mdash; a $500 hold is placed on your card when your trip starts and released 24 hours after you return the van, assuming no damage is reported." },
    ],
  },
  {
    section: "For van owners",
    items: [
      { q: "How much does it cost to list?", a: "Nothing upfront. CampShare takes a 12% service fee from guest bookings and a 5% host fee, plus GST on the fees. You set your own nightly rate." },
      { q: "How do payouts work?", a: "We use Stripe Connect to pay you directly. Payouts are released 24 hours after the trip completes &mdash; usually in your bank account 1&ndash;2 business days later." },
      { q: "What about insurance and damage?", a: "Hosts currently arrange their own insurance through a NZ provider. The $500 deposit covers minor damage; we&rsquo;re building broader cover as we grow." },
    ],
  },
];

export default function HomepageFaq() {
  return (
    <section style={{ padding: "clamp(3rem, 6vw, 5rem) 0", background: "var(--cream)" }}>
      <div className="wrap" style={{ maxWidth: 880 }}>
        <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", textAlign: "center", marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
          Common questions
        </h2>
        {FAQS.map((group) => (
          <div key={group.section} style={{ marginBottom: "2.5rem" }}>
            <h3 style={{ fontSize: "0.85rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ochre)", marginBottom: "1rem" }}>
              {group.section}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {group.items.map((it) => (
                <details
                  key={it.q}
                  style={{
                    background: "var(--sand)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius)",
                    padding: "1rem 1.25rem",
                  }}
                >
                  <summary style={{
                    cursor: "pointer",
                    fontWeight: 500,
                    color: "var(--forest-deep)",
                    fontFamily: "var(--font-serif)",
                    fontSize: "1.05rem",
                    listStyle: "none",
                  }}>
                    {it.q}
                  </summary>
                  <p style={{ marginTop: "0.75rem", marginBottom: 0, color: "var(--charcoal-soft)" }}
                     dangerouslySetInnerHTML={{ __html: it.a }} />
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
