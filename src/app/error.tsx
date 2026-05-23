"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="text-gray-500">
        An unexpected error occurred. We&apos;ve been notified.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-green-600 px-5 py-2 text-white hover:bg-green-700"
      >
        Try again
      </button>
    </div>
  );
}
