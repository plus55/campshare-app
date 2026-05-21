"use client";

import dynamic from "next/dynamic";

const PickupMap = dynamic(() => import("./PickupMap"), { ssr: false });

export default function PickupMapClient({ lat, lng }: { lat: number; lng: number }) {
  return <PickupMap lat={lat} lng={lng} />;
}
