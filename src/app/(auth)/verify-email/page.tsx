import Link from "next/link";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow">
      <h1 className="mb-2 font-serif text-2xl text-forest-deep dark:text-cream">Check your inbox</h1>
      <p className="mb-2 text-muted-foreground">
        We&apos;ve sent a verification link to{" "}
        <strong className="font-medium text-foreground">{email ?? "your email"}</strong>. Click it to activate your CampShare account.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Didn&apos;t get it? Check your spam folder, or{" "}
        <Link href="/signup" className="text-clay hover:text-clay-deep">try signing up again</Link>.
      </p>
    </div>
  );
}
