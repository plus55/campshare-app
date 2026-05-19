import Link from "next/link";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="cs-card">
      <h1>Check your inbox</h1>
      <p>
        We&apos;ve sent a verification link to{" "}
        <strong>{email ?? "your email"}</strong>. Click it to activate your
        CampShare account.
      </p>
      <p className="cs-muted cs-small" style={{ marginTop: 16 }}>
        Didn&apos;t get it? Check your spam folder, or{" "}
        <Link href="/signup">try signing up again</Link>.
      </p>
    </div>
  );
}
