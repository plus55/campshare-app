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
      <div className="cs-card">
        <h1>Reset link invalid</h1>
        <p>This password reset link is missing its token, or has expired.</p>
        <p style={{ marginTop: 16 }} className="cs-small">
          <Link href="/forgot-password">Request a new reset link</Link>
        </p>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
