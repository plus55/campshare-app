import Link from "next/link";

interface Props {
  icon: React.ReactNode;
  heading: string;
  body: string;
  cta?: { label: string; href: string };
}

export default function EmptyState({ icon, heading, body, cta }: Props) {
  return (
    <div className="cs-empty">
      <div className="cs-empty-icon">{icon}</div>
      <h3>{heading}</h3>
      <p>{body}</p>
      {cta && (
        <Link href={cta.href} className="cs-btn cs-btn-primary" style={{ marginTop: 8 }}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}
