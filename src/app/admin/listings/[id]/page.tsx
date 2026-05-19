import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import ModerationButtons from "@/components/ModerationButtons";
import type { VanListing, HostProfile } from "@/lib/types";

interface Row extends VanListing {
  hostFirstName: string;
  hostLastName: string;
  hostPhone: string;
  hostEmail: string;
}

function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p className="cs-label" style={{ marginBottom: 2 }}>{label}</p>
      <p style={{ margin: 0, whiteSpace: multiline ? "pre-wrap" : "normal" }}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="cs-card" style={{ marginTop: 16 }}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export default async function AdminListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const row = await db()
    .prepare(
      `SELECT vl.*,
              hp.firstName AS hostFirstName, hp.lastName AS hostLastName, hp.phone AS hostPhone,
              u.email AS hostEmail
       FROM van_listing vl
       JOIN host_profile hp ON hp.userId = vl.hostUserId
       JOIN user u ON u.id = vl.hostUserId
       WHERE vl.id = ?`
    )
    .bind(id)
    .first<Row>();

  if (!row) notFound();

  let features: string[] = [];
  try { features = JSON.parse(row.features) as string[]; } catch { features = []; }

  return (
    <main className="cs-page">
      <div className="cs-narrow">
        <Link href="/admin" className="cs-small">← Admin</Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <h1 style={{ margin: 0 }}>{row.name}</h1>
          <span className={`cs-pill cs-pill-${row.status === "pending_review" ? "pending" : row.status}`}>
            {row.status === "pending_review" ? "in review" : row.status}
          </span>
        </div>
        <p className="cs-muted cs-small">Submitted {formatDate(row.createdAt)}</p>

        <Section title="Host">
          <Field label="Name" value={`${row.hostFirstName} ${row.hostLastName}`} />
          <Field label="Email" value={row.hostEmail} />
          <Field label="Phone" value={row.hostPhone} />
        </Section>

        <Section title="Van">
          <Field label="Type" value={row.vanType} />
          <Field label="Year" value={String(row.year)} />
          <Field label="Sleeps / Seats" value={`${row.sleeps} / ${row.seats}`} />
          <Field label="Fixed toilet" value={row.fixedToilet ? "Yes" : "No"} />
          <Field label="Pet friendly" value={row.petFriendly ? "Yes" : "No"} />
          <Field label="Location" value={`${row.region}, ${row.island} Island`} />
          <Field label="Description" value={row.description} multiline />
        </Section>

        <Section title="Pricing">
          <Field label="Nightly rate" value={`$${Math.round(row.nightlyRate / 100)} NZD`} />
          <Field label="Minimum nights" value={String(row.minimumNights)} />
          <Field label="Instant book" value={row.instantBook ? "Yes" : "No"} />
        </Section>

        <Section title="Features & rules">
          <Field label="Features" value={features.length ? features.join(", ") : "None listed"} />
          <Field label="House rules" value={row.houseRules || "None"} multiline />
        </Section>

        {row.adminNote && (
          <Section title="Previous admin note">
            <p className="cs-muted cs-small">{row.adminNote}</p>
          </Section>
        )}

        {row.status === "pending_review" && (
          <div className="cs-card" style={{ marginTop: 16 }}>
            <h3>Decision</h3>
            <ModerationButtons id={id} apiEndpoint={`/api/admin/listings/${id}`} />
          </div>
        )}
      </div>
    </main>
  );
}
