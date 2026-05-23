import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import HomeHero from "@/components/home/HomeHero";
import TrustBanner from "@/components/home/TrustBanner";
import FeaturedVans from "@/components/home/FeaturedVans";
import HowItWorks from "@/components/home/HowItWorks";
import CategoryCards from "@/components/home/CategoryCards";
import RegionGrid from "@/components/home/RegionGrid";
import HomepageFaq from "@/components/home/HomepageFaq";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CampShare — Hire a campervan from a local in Aotearoa",
  description:
    "Peer-to-peer campervan hire across New Zealand. Book direct from Kiwi owners, pay securely, hit the road.",
  openGraph: {
    title: "CampShare — Hire a campervan from a local in Aotearoa",
    description:
      "Peer-to-peer campervan hire across New Zealand. Book direct from Kiwi owners, pay securely, hit the road.",
    url: "https://app.campshare.co.nz",
    images: [
      { url: "/og-default.png", width: 1200, height: 630, alt: "CampShare — Campervans in Aotearoa" },
    ],
  },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "CampShare",
  url: "https://app.campshare.co.nz",
  logo: "https://app.campshare.co.nz/og-default.png",
  description:
    "Peer-to-peer campervan hire across New Zealand. Book direct from Kiwi owners, pay securely, hit the road.",
  areaServed: { "@type": "Country", name: "New Zealand" },
  sameAs: ["https://campshare.co.nz"],
};

export default async function Root() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <main>
        <HomeHero />
        <TrustBanner />
        <FeaturedVans />
        <HowItWorks />
        <CategoryCards />
        <RegionGrid />
        <HomepageFaq />
      </main>
    </>
  );
}
