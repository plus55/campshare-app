"use client";

import Script from "next/script";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

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
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-cream shadow-md">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-stone m-0">
              We use cookies to improve your experience and understand how CampShare is used.{" "}
              <Link href="/privacy" className="underline text-clay hover:text-clay-deep">
                Privacy Policy
              </Link>
            </p>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={decline}
                className="border-line text-charcoal-soft hover:bg-sand">
                Decline
              </Button>
              <Button size="sm" onClick={accept}>
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
