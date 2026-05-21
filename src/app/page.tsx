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
};

export default async function Root() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main>
      <HomeHero />
      <TrustBanner />
      <FeaturedVans />
      <HowItWorks />
      <CategoryCards />
      <RegionGrid />
      <HomepageFaq />
    </main>
  );
}
