import Link from "next/link";

interface Props {
  title: string;
  meta?: string;
  action?: { label: string; href: string };
}

export default function SectionHeader({ title, meta, action }: Props) {
  return (
    <div className="cs-section-header">
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        {meta && <span className="cs-section-header-meta">{meta}</span>}
      </div>
      {action && (
        <Link href={action.href} className="cs-section-header-action" style={{ color: "var(--clay-500)" }}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
