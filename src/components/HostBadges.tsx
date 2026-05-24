import type { Badge } from "@/lib/badges";

const COLORS: Record<Badge["kind"], string> = {
  super_host: "border-clay/25 bg-clay/10 text-clay-deep",
  responds_reliably: "border-moss/20 bg-moss/10 text-moss",
  verified: "border-forest/20 bg-forest/10 text-forest",
};

export default function HostBadges({ badges, size = "md" }: { badges: Badge[]; size?: "sm" | "md" }) {
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => {
        return (
          <span
            key={b.kind}
            title={b.description}
            className={`whitespace-nowrap rounded-full border font-semibold ${COLORS[b.kind]} ${size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}`}
          >
            {b.label}
          </span>
        );
      })}
    </div>
  );
}
