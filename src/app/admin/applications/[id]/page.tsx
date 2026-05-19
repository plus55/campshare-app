import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import ApproveRejectButtons from "./ApproveRejectButtons";

interface Detail {
  id: string;
  status: "pending" | "approved" | "rejected";
  firstName: string;
  lastName: string;
  phone: string;
  region: string;
  island: string;
  email: string;
  vanName: string;
  vanType: string;
  vanYear: number;
  sleeps: number;
  seats: number;
  fixedToilet: number;
  description: string;
  nightlyRate: number;
  minimumNights: number;
  availableFrom: number | null;
  availableTo: number | null;
  instantBook: number;
  features: string;
  houseRules: string;
  petFriendly: number;
  adminNote: string | null;
  submittedAt: number;
  reviewedAt: number | null;
}

export default async function AdminDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const row = await db()
    .prepare(
      `SELECT ha.*, u.email AS email
       FROM host_application ha
       JOIN user u ON u.id = ha.userId
       WHERE ha.id = ?`
    )
    .bind(id)
    .first<Detail>();

  if (!row) notFound();

  let features: string[] = [];
  try {
    features = JSON.parse(row.features) as string[];
  } catch {
    features = [];
  }

  return (
    <main className="cs-page">
      <div className="cs-narrow">
        <Link href="/admin" className="cs-small">
          ← All applications
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <h1 style={{ margin: 0 }}>{row.vanName}</h1>
          <span className={`cs-pill cs-pill-${row.status}`}>{row.status}</span>
        </div>
        <p className="cs-muted cs-small">
          Submitted {formatDate(row.submittedAt)}
          {row.reviewedAt ? ` · Reviewed ${formatDate(row.reviewedAt)}` : ""}
        </p>

        <Section title="Applicant">
          <Field label="Name" value={`${row.firstName} ${row.lastName}`} />
          <Field label="Email" value={row.email} />
          <Field label="Phone" value={row.phone} />
          <Field label="Location" value={`${row.region}, ${row.island} Island`} />
        </Section>

        <Section title="Van">
          <Field label="Type" value={row.vanType} />
          <Field label="Year" value={String(row.vanYear)} />
          <Field label="Sleeps / Seats" value={`${row.sleeps} / ${row.seats}`} />
          <Field
            label="Fixed toilet"
            value={row.fixedToilet ? "Yes" : "No"}
          />
          <Field label="Description" value={row.description} multiline />
        </Section>

        <Section title="Pricing & availability">
          <Field label="Nightly rate" value={`$${row.nightlyRate} NZD`} />
          <Field label="Minimum nights" value={String(row.minimumNights)} />
          <Field
            label="Available"
            value={
              row.availableFrom && row.availableTo
                ? `${formatDate(row.availableFrom)} – ${formatDate(
                    row.availableTo
                  )}`
                : "Any time"
            }
          />
          <Field
            label="Instant book"
            value={row.instantBook ? "Yes" : "No"}
          />
        </Section>

        <Section title="Features & rules">
          <Field
            label="Features"
            value={features.length ? features.join(", ") : "None listed"}
          />
          <Field
            label="House rules"
            value={row.houseRules || "None"}
            multiline
          />
          <Field
            label="Pet friendly"
            value={row.petFriendly ? "Yes" : "No"}
          />
        </Section>

        {row.adminNote && (
          <Section title="Previous admin note">
            <p className="cs-muted cs-small">{row.adminNote}</p>
          </Section>
        )}

        {row.status === "pending" && (
          <div className="cs-card" style={{ marginTop: 16 }}>
            <h3>Decision</h3>
            <ApproveRejectButtons applicationId={row.id} />
          </div>
        )}
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="cs-card" style={{ marginTop: 16 }}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p className="cs-label" style={{ marginBottom: 2 }}>
        {label}
      </p>
      <p
        style={{
          margin: 0,
          whiteSpace: multiline ? "pre-wrap" : "normal",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
