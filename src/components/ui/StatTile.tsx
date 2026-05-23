import Link from "next/link";

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  href?: string;
  warn?: boolean;
}

export default function StatTile({ label, value, sub, icon, href, warn }: Props) {
  const inner = (
    <div className={`cs-stat-tile${warn ? " cs-stat-tile-warn" : ""}`}>
      <div className="cs-stat-tile-label">
        {icon}
        {label}
      </div>
      <div className="cs-stat-tile-value">{value}</div>
      {sub && <div className="cs-stat-tile-sub">{sub}</div>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        {inner}
      </Link>
    );
  }
  return inner;
}
