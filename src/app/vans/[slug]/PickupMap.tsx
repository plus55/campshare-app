"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Props {
  lat: number;
  lng: number;
}

export default function PickupMap({ lat, lng }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [lng, lat],
      zoom: 12,
      interactive: false,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("area", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} },
      });

      map.addLayer({
        id: "area-fill",
        type: "circle",
        source: "area",
        paint: {
          "circle-color": "#2d3a2e",
          "circle-opacity": 0.12,
          "circle-blur": 0.9,
          "circle-radius": [
            "interpolate", ["exponential", 2], ["zoom"],
            8,  25,
            10, 55,
            12, 110,
            14, 240,
          ],
        },
      });

      map.addLayer({
        id: "area-stroke",
        type: "circle",
        source: "area",
        paint: {
          "circle-color": "transparent",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#2d3a2e",
          "circle-stroke-opacity": 0.25,
          "circle-radius": [
            "interpolate", ["exponential", 2], ["zoom"],
            8,  25,
            10, 55,
            12, 110,
            14, 240,
          ],
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  return <div ref={containerRef} style={{ width: "100%", height: 260, borderRadius: "var(--radius)", overflow: "hidden" }} />;
}
