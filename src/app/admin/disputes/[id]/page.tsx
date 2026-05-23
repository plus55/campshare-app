import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import DisputeActions from "./DisputeActions";

interface DisputeDetail {
  id: string;
  bookingId: string;
  initiatorUserId: string;
  reason: string;
  details: string;
  evidenceUrls: string | null;
  status: string;
  adminNote: string | null;
  depositAction: string | null;
  depositSplitToHostCents: number | null;
  createdAt: number;
  resolvedAt: number | null;
  initiatorName: string;
  initiatorEmail: string;
  vanName: string;
  vanSlug: string;
  guestUserId: string;
  guestName: string;
  hostUserId: string;
  hostName: string;
  bookingTotalCents: number;
  bookingDepositCents: number;
  bookingHostPayoutCents: number | null;
  startDate: number;
  endDate: number;
}

const REASON_LABEL: Record<string, string> = {
  damage: "Damage",
  cleanliness: "Cleanliness",
  misrepresentation: "Misrepresentation",
  no_show_host: "Host no-show",
  no_show_guest: "Guest no-show",
  other: "Other",
};

function fmt(epochSeconds: number) {
  return new Date(epochSeconds * 1000).toLocaleString("en-NZ", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtDateMs(ms: number) {
  return new Date(ms).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const d = await db()
    .prepare(
      `SELECT d.*,
              u.name AS initiatorName, u.email AS initiatorEmail,
              vl.name AS vanName, vl.slug AS vanSlug,
              b.guestUserId, b.hostUserId,
              b.totalCents AS bookingTotalCents,
              b.depositCents AS bookingDepositCents,
              b.hostPayoutCents AS bookingHostPayoutCents,
              b.startDate, b.endDate,
              ug.name AS guestName,
              uh.name AS hostName
       FROM dispute d
       JOIN user u ON u.id = d.initiatorUserId
       JOIN booking b ON b.id = d.bookingId
       JOIN van_listing vl ON vl.id = b.vanListingId
       JOIN user ug ON ug.id = b.guestUserId
       JOIN user uh ON uh.id = b.hostUserId
       WHERE d.id = ?`
    )
    .bind(id)
    .first<DisputeDetail>();

  if (!d) notFound();

  let evidence: string[] = [];
  if (d.evidenceUrls) {
    try { evidence = JSON.parse(d.evidenceUrls) as string[]; } catch { evidence = []; }
  }

  const isOpen = d.status === "open" || d.status === "under_review";

  return (
    <main className="cs-page">
      <div className="cs-container" style={{ maxWidth: 760 }}>
        <p style={{ marginTop: 0 }}><Link href="/admin/disputes" className="cs-small">← Disputes</Link></p>

        <h1 style={{ margin: "0 0 8px" }}>{REASON_LABEL[d.reason] ?? d.reason}</h1>
        <p className="cs-muted">Status: <strong>{d.status}</strong> · raised {fmt(d.createdAt)}{d.resolvedAt ? ` · resolved ${fmt(d.resolvedAt)}` : ""}</p>

        <div className="cs-card" style={{ marginTop: 16 }}>
          <h2>Booking</h2>
          <p style={{ margin: 0 }}><Link href={`/vans/${d.vanSlug}`}>{d.vanName}</Link></p>
          <p className="cs-muted cs-small" style={{ margin: "4px 0 12px" }}>
            {fmtDateMs(d.startDate)} → {fmtDateMs(d.endDate)}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <p className="cs-label" style={{ margin: 0 }}>Guest</p>
              <p style={{ margin: 0 }}>{d.guestName}</p>
            </div>
            <div>
              <p className="cs-label" style={{ margin: 0 }}>Host</p>
              <p style={{ margin: 0 }}>{d.hostName}</p>
            </div>
            <div>
              <p className="cs-label" style={{ margin: 0 }}>Total paid</p>
              <p style={{ margin: 0 }}>${(d.bookingTotalCents / 100).toFixed(0)}</p>
            </div>
            <div>
              <p className="cs-label" style={{ margin: 0 }}>Deposit hold</p>
              <p style={{ margin: 0 }}>${(d.bookingDepositCents / 100).toFixed(0)}</p>
            </div>
            <div>
              <p className="cs-label" style={{ margin: 0 }}>Host payout</p>
              <p style={{ margin: 0 }}>{d.bookingHostPayoutCents != null ? `$${(d.bookingHostPayoutCents / 100).toFixed(0)}` : "—"}</p>
            </div>
          </div>
        </div>

        <div className="cs-card" style={{ marginTop: 16 }}>
          <h2>Initiator</h2>
          <p style={{ margin: 0 }}>
            {d.initiatorName} <span className="cs-muted">({d.initiatorEmail})</span>{" "}
            <span className="cs-muted cs-small">— {d.initiatorUserId === d.guestUserId ? "guest" : "host"}</span>
          </p>
        </div>

        <div className="cs-card" style={{ marginTop: 16 }}>
          <h2>Details</h2>
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{d.details}</p>
          {evidence.length > 0 && (
            <>
              <h3 style={{ marginTop: 16 }}>Evidence</h3>
              <ul>
                {evidence.map((u, i) => (
                  <li key={i}><a href={u} target="_blank" rel="noopener noreferrer">{u}</a></li>
                ))}
              </ul>
            </>
          )}
        </div>

        {d.adminNote && (
          <div className="cs-card" style={{ marginTop: 16 }}>
            <h2>Admin note</h2>
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{d.adminNote}</p>
            {d.depositAction && (
              <p className="cs-muted cs-small" style={{ marginTop: 8 }}>
                Deposit action: <strong>{d.depositAction}</strong>
                {d.depositAction === "split" && d.depositSplitToHostCents != null
                  ? ` — $${(d.depositSplitToHostCents / 100).toFixed(0)} to host, rest to guest`
                  : ""}
              </p>
            )}
          </div>
        )}

        {isOpen && (
          <div className="cs-card" style={{ marginTop: 16 }}>
            <h2>Resolve</h2>
            <DisputeActions disputeId={id} depositCents={d.bookingDepositCents} />
          </div>
        )}
      </div>
    </main>
  );
}
