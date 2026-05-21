const STEPS = [
  {
    n: "1",
    title: "Search",
    body: "Filter by region, dates, sleeps and features. Find a van that fits your trip.",
  },
  {
    n: "2",
    title: "Book",
    body: "Send a request to the host. Pay securely &mdash; your card is only charged when they accept.",
  },
  {
    n: "3",
    title: "Hit the road",
    body: "Meet the owner, pick up the van, and head off on your Aotearoa adventure.",
  },
];

export default function HowItWorks() {
  return (
    <section style={{ padding: "clamp(3rem, 6vw, 5rem) 0", background: "var(--cream)" }}>
      <div className="wrap">
        <div style={{ textAlign: "center", marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", marginBottom: "0.75rem" }}>
            How CampShare works
          </h2>
          <p className="cs-muted" style={{ maxWidth: "48ch", margin: "0 auto" }}>
            Three simple steps between you and a Kiwi road trip.
          </p>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.5rem",
        }}>
          {STEPS.map((s) => (
            <div key={s.n} className="cs-card" style={{ textAlign: "center", padding: "2rem 1.5rem" }}>
              <div style={{
                width: 48, height: 48,
                margin: "0 auto 1rem",
                borderRadius: "50%",
                background: "var(--forest-deep)",
                color: "var(--cream)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-serif)",
                fontSize: "1.2rem",
                fontWeight: 500,
                border: "1.5px solid var(--ochre)",
              }}>
                {s.n}
              </div>
              <h3 style={{ marginBottom: "0.5rem" }}>{s.title}</h3>
              <p className="cs-muted" style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: s.body }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
