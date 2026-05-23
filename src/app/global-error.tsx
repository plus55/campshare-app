"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
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
      </body>
    </html>
  );
}
