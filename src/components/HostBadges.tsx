import type { Badge } from "@/lib/badges";

const COLORS: Record<Badge["kind"], { bg: string; fg: string; border: string }> = {
  super_host:        { bg: "#fdf0eb", fg: "#a23b1f", border: "#f5c8b5" },
  responds_reliably: { bg: "#e7f4ec", fg: "#1f7a3a", border: "#cae5d3" },
  verified:          { bg: "#eef3fb", fg: "#2654a3", border: "#cfdcef" },
};

export default function HostBadges({ badges, size = "md" }: { badges: Badge[]; size?: "sm" | "md" }) {
  if (badges.length === 0) return null;
  const fontSize = size === "sm" ? 11 : 12;
  const padding = size === "sm" ? "2px 8px" : "4px 10px";
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {badges.map((b) => {
        const c = COLORS[b.kind];
        return (
          <span
            key={b.kind}
            title={b.description}
            style={{
              padding,
              borderRadius: 999,
              fontSize,
              fontWeight: 600,
              color: c.fg,
              background: c.bg,
              border: `1px solid ${c.border}`,
              whiteSpace: "nowrap",
            }}
          >
            {b.label}
          </span>
        );
      })}
    </div>
  );
}
