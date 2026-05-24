"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col gap-3">
      {catalogue.map((addon) => (
        <div
          key={addon.id}
          className={`flex items-start gap-4 rounded-2xl border border-border bg-card p-4 transition-opacity ${enabled[addon.id] ? "opacity-100" : "opacity-60"}`}
        >
          <input
            type="checkbox"
            id={`addon-${addon.id}`}
            checked={!!enabled[addon.id]}
            onChange={() => toggle(addon.id)}
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-forest-deep"
          />
          <div className="flex-1">
            <label htmlFor={`addon-${addon.id}`} className="cursor-pointer text-sm font-semibold text-foreground">
              {addon.name}
            </label>
            {addon.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{addon.description}</p>
            )}
          </div>
          {enabled[addon.id] && (
            <div className="flex min-w-[120px] flex-col gap-1">
              <label htmlFor={`price-${addon.id}`} className="text-xs font-medium text-foreground">Price (NZD)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  id={`price-${addon.id}`}
                  type="number"
                  className="w-full rounded-lg border border-line bg-background py-1.5 pl-6 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-forest-deep focus:outline-none"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={prices[addon.id] ?? ""}
                  onChange={(e) => setPrice(addon.id, e.target.value)}
                />
              </div>
              <span className="text-xs text-muted-foreground">{addon.priceType === "per_night" ? "per night" : "per booking"}</span>
            </div>
          )}
        </div>
      ))}

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save add-ons"}
        </Button>
        {saved && <span className="text-sm text-muted-foreground">Saved</span>}
      </div>
    </div>
  );
}
