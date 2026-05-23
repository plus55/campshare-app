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
      <div className="rounded-2xl bg-cream p-8 shadow">
        <h1 className="mb-2 font-serif text-2xl text-forest-deep">Reset link invalid</h1>
        <p className="mb-4 text-stone">
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
