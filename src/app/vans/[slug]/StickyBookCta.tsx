"use client";

interface Props {
  nightlyRateCents: number;
}

export default function StickyBookCta({ nightlyRateCents }: Props) {
  const price = Math.round(nightlyRateCents / 100);

  function scrollToForm() {
    document.getElementById("book-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="pdp-sticky-cta">
      <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>
        From ${price}<span style={{ fontWeight: 400, fontSize: 13, color: "var(--stone)" }}>/night</span>
      </p>
      <button type="button" className="cs-btn cs-btn-primary" onClick={scrollToForm}>
        Select dates
      </button>
    </div>
  );
}
