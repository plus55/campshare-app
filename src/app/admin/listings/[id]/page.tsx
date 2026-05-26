import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { getDb } from "@/lib/db";
import ModerationButtons from "@/components/ModerationButtons";
import type { VanListing } from "@/lib/types";
import { fmtNzd } from "@/lib/money";

interface Row extends VanListing {
  hostFirstName: string;
  hostLastName: string;
  hostPhone: string;
  hostEmail: string;
}

function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString("en-NZ", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const statusBadge: Record<string, string> = {
  pending_review: "rounded-full bg-sand-warm px-2.5 py-0.5 text-[11px] font-medium text-charcoal-soft",
  published:      "rounded-full bg-moss-light px-2.5 py-0.5 text-[11px] font-medium text-moss",
  rejected:       "rounded-full bg-rust-light px-2.5 py-0.5 text-[11px] font-medium text-rust",
};

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="mb-3">
      <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-stone">{label}</p>
      <p className={`text-sm text-charcoal ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-line bg-cream p-5">
      <h3 className="mb-3 font-serif text-base text-forest-deep">{title}</h3>
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
  const database = await getDb();

  const row = await database
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
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[720px]">
        <p className="mb-2 text-sm">
          <Link href="/admin" className="text-stone hover:text-charcoal">← Admin</Link>
        </p>

        <div className="mb-1 flex items-center gap-3">
          <h1 className="m-0 font-serif text-3xl text-forest-deep">{row.name}</h1>
          <span className={statusBadge[row.status] ?? statusBadge.pending_review}>
            {row.status === "pending_review" ? "in review" : row.status}
          </span>
        </div>
        <p className="mb-4 text-sm text-stone">Submitted {formatDate(row.createdAt)}</p>

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
          <Field label="Nightly rate" value={`${fmtNzd(row.nightlyRate)} NZD`} />
          <Field label="Minimum nights" value={String(row.minimumNights)} />
          <Field label="Instant book" value={row.instantBook ? "Yes" : "No"} />
        </Section>

        <Section title="Features & rules">
          <Field label="Features" value={features.length ? features.join(", ") : "None listed"} />
          <Field label="House rules" value={row.houseRules || "None"} multiline />
        </Section>

        {row.adminNote && (
          <Section title="Previous admin note">
            <p className="text-sm text-stone">{row.adminNote}</p>
          </Section>
        )}

        {row.status === "pending_review" && (
          <div className="mt-4 rounded-2xl border border-line bg-cream p-5">
            <h3 className="mb-3 font-serif text-base text-forest-deep">Decision</h3>
            <ModerationButtons id={id} apiEndpoint={`/api/admin/listings/${id}`} />
          </div>
        )}
      </div>
    </main>
  );
}
