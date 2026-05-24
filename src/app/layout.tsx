import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CookieConsent from "@/components/CookieConsent";
import { cn } from "@/lib/utils";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CampShare — Share the road",
  description:
    "Find a campervan in Aotearoa, or list yours and earn while you're not using it.",
  metadataBase: new URL("https://app.campshare.co.nz"),
  openGraph: {
    type: "website",
    siteName: "CampShare",
    title: "CampShare — Share the road",
    description:
      "Find a campervan in Aotearoa, or list yours and earn while you're not using it.",
    images: [
      { url: "/og-default.png", width: 1200, height: 630, alt: "CampShare — Campervans in Aotearoa" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CampShare — Share the road",
    description:
      "Find a campervan in Aotearoa, or list yours and earn while you're not using it.",
    images: ["/og-default.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(fraunces.variable, outfit.variable)} suppressHydrationWarning>
      <body>
        <TooltipProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
          <CookieConsent />
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
