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

      const popupContent = document.createElement("div");
      popupContent.style.cssText = "font-size:13px;line-height:1.4;max-width:180px";

      const name = document.createElement("strong");
      name.textContent = listing.name;
      popupContent.appendChild(name);
      popupContent.appendChild(document.createElement("br"));

      const details = document.createElement("span");
      details.style.color = "#666";
      details.textContent = `${listing.region} \u00b7 Sleeps ${listing.sleeps}`;
      popupContent.appendChild(details);
      popupContent.appendChild(document.createElement("br"));

      const rate = document.createElement("span");
      rate.style.fontWeight = "600";
      rate.textContent = `$${price}/night`;
      popupContent.appendChild(rate);
      popupContent.appendChild(document.createElement("br"));

      const link = document.createElement("a");
      link.href = `/vans/${encodeURIComponent(listing.slug)}`;
      link.style.cssText = "color:var(--clay,#8B5E3C);font-weight:600";
      link.textContent = "View listing \u2192";
      popupContent.appendChild(link);

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false })
        .setDOMContent(popupContent);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([coords.lng, coords.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [listings]);

  return <div ref={containerRef} className="size-full" />;
}
