import Link from "next/link";
import ResetPasswordForm from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 shadow">
        <h1 className="mb-2 font-serif text-2xl text-forest-deep dark:text-cream">Reset link invalid</h1>
        <p className="mb-4 text-muted-foreground">
          This password reset link is missing its token, or has expired.
        </p>
        <Link href="/forgot-password" className="text-sm text-clay hover:text-clay-deep">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
