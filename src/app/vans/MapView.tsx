"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { REGION_COORDS } from "@/lib/constants";
import type { SearchResult } from "./ListingCard";

export default function MapView({ listings }: { listings: SearchResult[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [172.0, -41.3],
      zoom: 5,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    listings.forEach((listing) => {
      const coords = listing.pickupLat && listing.pickupLng
        ? { lat: listing.pickupLat, lng: listing.pickupLng }
        : REGION_COORDS[listing.region];
      if (!coords) return;

      const el = document.createElement("div");
      const price = Math.round(listing.nightlyRate / 100);
      el.textContent = `$${price}`;
      el.style.cssText = [
        "background: white",
        "border: 1.5px solid var(--clay, #8B5E3C)",
        "border-radius: 12px",
        "padding: 3px 8px",
        "font-size: 12px",
        "font-weight: 700",
        "cursor: pointer",
        "box-shadow: 0 1px 4px rgba(0,0,0,0.18)",
        "transition: transform 0.1s",
        "white-space: nowrap",
      ].join(";");
      el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.1)"; });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false })
        .setHTML(`
          <div style="font-size:13px;line-height:1.4;max-width:180px">
            <strong>${listing.name}</strong><br>
            <span style="color:#666">${listing.region} · Sleeps ${listing.sleeps}</span><br>
            <span style="font-weight:600">$${price}/night</span><br>
            <a href="/vans/${listing.slug}" style="color:var(--clay,#8B5E3C);font-weight:600">View listing →</a>
          </div>
        `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([coords.lng, coords.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [listings]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
