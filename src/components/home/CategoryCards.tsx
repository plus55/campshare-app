import Link from "next/link";

const CATEGORIES = [
  { label: "Pet-friendly", href: "/vans?petFriendly=1", body: "Vans that welcome your dog along for the ride." },
  { label: "Family-size (sleeps 4+)", href: "/vans?sleeps=4", body: "Plenty of room for the whole crew." },
  { label: "Self-contained", href: "/vans?vanType=self-contained", body: "Freedom-camp anywhere certified parking is allowed." },
  { label: "Instant book", href: "/vans?instantBook=1", body: "Confirmed bookings without waiting for host approval." },
];

export default function CategoryCards() {
  return (
    <section style={{ padding: "clamp(3rem, 6vw, 5rem) 0", background: "var(--cream)" }}>
      <div className="wrap">
        <div style={{ textAlign: "center", marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", marginBottom: "0.75rem" }}>
            Find your kind of trip
          </h2>
          <p className="cs-muted" style={{ maxWidth: "48ch", margin: "0 auto" }}>
            Whether it&apos;s a weekend with the dog or a month-long family expedition.
          </p>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
        }}>
          {CATEGORIES.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="cs-card"
              style={{
                padding: "1.5rem",
                textDecoration: "none",
                color: "inherit",
                display: "block",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
            >
              <h3 style={{ fontSize: "1.2rem", marginBottom: "0.4rem", color: "var(--forest-deep)" }}>
                {c.label}
              </h3>
              <p className="cs-muted cs-small" style={{ margin: 0 }}>{c.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
