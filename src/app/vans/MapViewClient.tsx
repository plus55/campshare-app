"use client";

import dynamic from "next/dynamic";
import type { SearchResult } from "./ListingCard";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

export default function MapViewClient({ listings }: { listings: SearchResult[] }) {
  return <MapView listings={listings} />;
}
