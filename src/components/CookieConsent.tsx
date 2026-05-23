"use client";

import Script from "next/script";
import { useState, useEffect } from "react";

const CONSENT_KEY = "campshare_cookie_consent";
type ConsentValue = "accepted" | "declined";

export default function CookieConsent() {
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY) as ConsentValue | null;
    if (stored) {
      setConsent(stored);
    } else {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setConsent("accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    setConsent("declined");
    setVisible(false);
  }

  const analyticsToken = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;

  return (
    <>
      {consent === "accepted" && analyticsToken && (
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={`{"token":"${analyticsToken}"}`}
          strategy="afterInteractive"
        />
      )}
      {visible && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg md:p-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              We use cookies to improve your experience and understand how CampShare
              is used.{" "}
              <a href="/privacy" className="underline hover:text-gray-900">
                Privacy Policy
              </a>
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={decline}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Decline
              </button>
              <button
                onClick={accept}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
