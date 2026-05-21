import { NZ_REGIONS } from "@/lib/constants";

export default function HomeHero() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section style={{
      background: "linear-gradient(180deg, var(--cream) 0%, var(--sand) 100%)",
      borderBottom: "1px solid var(--line)",
      padding: "clamp(3rem, 8vw, 6rem) 0 clamp(3.5rem, 9vw, 7rem)",
    }}>
      <div className="wrap" style={{ textAlign: "center" }}>
        <h1 style={{
          fontSize: "clamp(2.2rem, 5vw, 3.6rem)",
          lineHeight: 1.1,
          maxWidth: "18ch",
          margin: "0 auto 1rem",
        }}>
          Hire a campervan from a local in Aotearoa
        </h1>
        <p style={{
          fontSize: "clamp(1rem, 1.6vw, 1.2rem)",
          maxWidth: "52ch",
          margin: "0 auto 2.5rem",
          color: "var(--charcoal-soft)",
        }}>
          Skip the rental fleet. Book direct from owners across New Zealand &mdash;
          characterful vans, real people, fair prices.
        </p>

        <form
          action="/vans"
          method="get"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) auto",
            gap: "0.5rem",
            background: "var(--cream)",
            padding: "0.6rem",
            borderRadius: "999px",
            boxShadow: "0 12px 40px -16px rgba(31,42,32,0.18)",
            maxWidth: 760,
            margin: "0 auto",
            border: "1px solid var(--line)",
          }}
          className="home-hero-form"
        >
          <label style={{ display: "flex", flexDirection: "column", padding: "0.4rem 1rem", textAlign: "left", borderRadius: "999px" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--stone)" }}>
              Region
            </span>
            <select
              name="region"
              defaultValue=""
              style={{
                border: 0,
                background: "transparent",
                fontFamily: "var(--font-sans)",
                fontSize: "0.95rem",
                color: "var(--forest-deep)",
                padding: "0.15rem 0",
                outline: "none",
                width: "100%",
              }}
            >
              <option value="">Anywhere in NZ</option>
              {NZ_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", padding: "0.4rem 1rem", textAlign: "left", borderLeft: "1px solid var(--line)", borderRadius: 0 }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--stone)" }}>
              Check in
            </span>
            <input
              type="date"
              name="startDate"
              min={today}
              style={{
                border: 0,
                background: "transparent",
                fontFamily: "var(--font-sans)",
                fontSize: "0.95rem",
                color: "var(--forest-deep)",
                padding: "0.15rem 0",
                outline: "none",
                width: "100%",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", padding: "0.4rem 1rem", textAlign: "left", borderLeft: "1px solid var(--line)", borderRadius: 0 }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--stone)" }}>
              Check out
            </span>
            <input
              type="date"
              name="endDate"
              min={today}
              style={{
                border: 0,
                background: "transparent",
                fontFamily: "var(--font-sans)",
                fontSize: "0.95rem",
                color: "var(--forest-deep)",
                padding: "0.15rem 0",
                outline: "none",
                width: "100%",
              }}
            />
          </label>

          <button type="submit" className="btn btn-primary" style={{ padding: "0.85rem 1.8rem" }}>
            Find a van
          </button>
        </form>
      </div>
    </section>
  );
}
