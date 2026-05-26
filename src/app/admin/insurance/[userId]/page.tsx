import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { getDb } from "@/lib/db";
import { generatePresignedGet, getR2Credentials } from "@/lib/r2-presign";
import { HOST_DOCS_BUCKET } from "@/lib/insurance";
import InsuranceActions from "./InsuranceActions";

interface Row {
  userId: string;
  firstName: string;
  lastName: string;
  hostEmail: string;
  insuranceStatus: string;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  insuranceCoverType: string | null;
  insuranceExpiryDate: number | null;
  insuranceDocR2Key: string | null;
  insuranceAttestedAt: number | null;
  insuranceAdminNote: string | null;
}

function formatDate(epochSeconds: number | null): string {
  if (!epochSeconds) return "—";
  return new Date(epochSeconds * 1000).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

const coverLabel: Record<string, string> = {
  p2p_rental: "Peer-to-peer / short-term rental",
  commercial_fleet: "Commercial / fleet",
  self_attested: "Other — permits paid hire",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-stone">{label}</p>
      <p className="text-sm text-charcoal">{value}</p>
    </div>
  );
}

export default async function AdminInsuranceDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();
  const { userId } = await params;
  const database = await getDb();

  const row = await database
    .prepare(
      `SELECT hp.userId, hp.firstName, hp.lastName,
              hp.insuranceStatus, hp.insuranceProvider, hp.insurancePolicyNumber,
              hp.insuranceCoverType, hp.insuranceExpiryDate, hp.insuranceDocR2Key,
              hp.insuranceAttestedAt, hp.insuranceAdminNote,
              u.email AS hostEmail
       FROM host_profile hp JOIN user u ON u.id = hp.userId
       WHERE hp.userId = ?`,
    )
    .bind(userId)
    .first<Row>();

  if (!row) notFound();

  let docUrl: string | null = null;
  if (row.insuranceDocR2Key) {
    const creds = await getR2Credentials();
    if (creds) {
      docUrl = await generatePresignedGet({
        creds,
        bucket: HOST_DOCS_BUCKET,
        key: row.insuranceDocR2Key,
        expiresIn: 300, // 5 minutes — short-lived admin-only link
      });
    }
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[720px]">
        <p className="mb-2 text-sm">
          <Link href="/admin" className="text-stone hover:text-charcoal">← Admin</Link>
        </p>
        <h1 className="mb-1 font-serif text-3xl text-forest-deep">
          Insurance — {row.firstName} {row.lastName}
        </h1>
        <p className="mb-4 text-sm text-stone">{row.hostEmail} · status: {row.insuranceStatus}</p>

        <div className="mt-4 rounded-2xl border border-line bg-cream p-5">
          <h3 className="mb-3 font-serif text-base text-forest-deep">Policy</h3>
          <Field label="Provider" value={row.insuranceProvider ?? "—"} />
          <Field label="Policy number" value={row.insurancePolicyNumber ?? "—"} />
          <Field label="Cover type" value={row.insuranceCoverType ? (coverLabel[row.insuranceCoverType] ?? row.insuranceCoverType) : "—"} />
          <Field label="Expiry" value={formatDate(row.insuranceExpiryDate)} />
          <Field label="Host attested permits paid hire" value={row.insuranceAttestedAt ? `Yes (${formatDate(row.insuranceAttestedAt)})` : "No"} />
          <div className="mb-1">
            <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-stone">Document</p>
            {docUrl ? (
              <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-clay hover:text-clay-deep">
                View uploaded document (link valid 5 min) →
              </a>
            ) : (
              <p className="text-sm text-stone">{row.insuranceDocR2Key ? "Storage not configured" : "No document uploaded"}</p>
            )}
          </div>
        </div>

        {row.insuranceAdminNote && (
          <div className="mt-4 rounded-2xl border border-line bg-cream p-5">
            <h3 className="mb-2 font-serif text-base text-forest-deep">Previous note</h3>
            <p className="text-sm text-stone">{row.insuranceAdminNote}</p>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-line bg-cream p-5">
          <h3 className="mb-3 font-serif text-base text-forest-deep">Decision</h3>
          <InsuranceActions userId={row.userId} />
        </div>
      </div>
    </main>
  );
}
