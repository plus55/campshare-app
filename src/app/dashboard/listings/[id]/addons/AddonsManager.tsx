"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Addon {
  id: string;
  name: string;
  description: string | null;
  priceType: "flat" | "per_night";
}

interface Props {
  listingId: string;
  catalogue: Addon[];
  enabledMap: Record<string, number>; // addonId → priceNZDCents
}

export default function AddonsManager({ listingId, catalogue, enabledMap }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(catalogue.map((a) => [a.id, a.id in enabledMap]))
  );
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(
      catalogue.map((a) => [a.id, a.id in enabledMap ? String(Math.round(enabledMap[a.id] / 100)) : ""])
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle(id: string) {
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  }

  function setPrice(id: string, val: string) {
    setPrices((prev) => ({ ...prev, [id]: val }));
    setSaved(false);
  }

  async function save() {
    setError(null);
    setSaving(true);
    const items = catalogue
      .filter((a) => enabled[a.id])
      .map((a) => {
        const dollars = parseFloat(prices[a.id] ?? "0");
        if (isNaN(dollars) || dollars < 0) return null;
        return { addonId: a.id, priceNZDCents: Math.round(dollars * 100) };
      });

    if (items.some((i) => i === null)) {
      setError("Enter a valid price (in NZD) for each enabled add-on");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/listings/${listingId}/addons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items.filter(Boolean)),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Save failed");
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {catalogue.map((addon) => (
        <div
          key={addon.id}
          className="cs-card"
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
            opacity: enabled[addon.id] ? 1 : 0.6,
          }}
        >
          <input
            type="checkbox"
            id={`addon-${addon.id}`}
            checked={!!enabled[addon.id]}
            onChange={() => toggle(addon.id)}
            style={{ marginTop: 4, flexShrink: 0, cursor: "pointer" }}
          />
          <div style={{ flex: 1 }}>
            <label htmlFor={`addon-${addon.id}`} style={{ fontWeight: 600, cursor: "pointer", display: "block" }}>
              {addon.name}
            </label>
            {addon.description && (
              <p className="cs-muted cs-small" style={{ margin: "2px 0 0" }}>{addon.description}</p>
            )}
          </div>
          {enabled[addon.id] && (
            <label className="cs-field" style={{ margin: 0, minWidth: 120 }}>
              <span className="cs-label">Price (NZD)</span>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                  color: "var(--stone)", fontSize: 14,
                }}>$</span>
                <input
                  type="number"
                  className="cs-input"
                  style={{ paddingLeft: 22 }}
                  min="0"
                  step="1"
                  placeholder="0"
                  value={prices[addon.id] ?? ""}
                  onChange={(e) => setPrice(addon.id, e.target.value)}
                />
              </div>
              <span className="cs-muted cs-small">{addon.priceType === "per_night" ? "per night" : "per booking"}</span>
            </label>
          )}
        </div>
      ))}

      {error && <p className="cs-error">{error}</p>}

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          className="cs-btn cs-btn-primary"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save add-ons"}
        </button>
        {saved && <span className="cs-muted cs-small">Saved</span>}
      </div>
    </div>
  );
}
