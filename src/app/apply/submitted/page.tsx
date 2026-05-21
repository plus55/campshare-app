import Link from "next/link";

export default function ApplySubmittedPage() {
  return (
    <main className="cs-page">
      <div className="cs-narrow">
        <div className="cs-card">
          <h1>Thanks — we&apos;ve got it.</h1>
          <p>
            Your host application is in. We review applications within 1–2
            business days and will email you the moment we&apos;ve made a
            decision.
          </p>
          <Link
            href="/dashboard"
            className="cs-btn cs-btn-primary"
            style={{ marginTop: 12 }}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
