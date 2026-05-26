import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getDb } from "@/lib/db";
import DisputeActions from "./DisputeActions";
import { fmtNzd } from "@/lib/money";

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

const dl = "text-[11px] font-medium uppercase tracking-wide text-stone";

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const database = await getDb();

  const d = await database
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
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[760px]">
        <p className="mb-2 text-sm"><Link href="/admin/disputes" className="text-stone hover:text-charcoal">← Disputes</Link></p>

        <h1 className="mb-1 font-serif text-3xl text-forest-deep">{REASON_LABEL[d.reason] ?? d.reason}</h1>
        <p className="mb-4 text-sm text-stone">
          Status: <strong className="text-charcoal">{d.status}</strong> · raised {fmt(d.createdAt)}
          {d.resolvedAt ? ` · resolved ${fmt(d.resolvedAt)}` : ""}
        </p>

        <div className="rounded-2xl border border-line bg-cream p-5">
          <h2 className="mb-3 font-serif text-base text-forest-deep">Booking</h2>
          <p className="mb-1 text-sm font-medium text-charcoal">
            <Link href={`/vans/${d.vanSlug}`} className="text-clay hover:text-clay-deep">{d.vanName}</Link>
          </p>
          <p className="mb-4 text-xs text-stone">{fmtDateMs(d.startDate)} → {fmtDateMs(d.endDate)}</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Guest", value: d.guestName },
              { label: "Host", value: d.hostName },
              { label: "Total paid", value: fmtNzd(d.bookingTotalCents) },
              { label: "Deposit hold", value: fmtNzd(d.bookingDepositCents) },
              { label: "Host payout", value: d.bookingHostPayoutCents != null ? fmtNzd(d.bookingHostPayoutCents) : "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className={dl}>{label}</p>
                <p className="mt-0.5 text-sm text-charcoal">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-cream p-5">
          <h2 className="mb-2 font-serif text-base text-forest-deep">Initiator</h2>
          <p className="text-sm text-charcoal">
            {d.initiatorName} <span className="text-stone">({d.initiatorEmail})</span>{" "}
            <span className="text-xs text-stone">— {d.initiatorUserId === d.guestUserId ? "guest" : "host"}</span>
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-cream p-5">
          <h2 className="mb-2 font-serif text-base text-forest-deep">Details</h2>
          <p className="whitespace-pre-wrap text-sm text-charcoal">{d.details}</p>
          {evidence.length > 0 && (
            <>
              <h3 className="mb-1 mt-4 font-serif text-sm text-forest-deep">Evidence</h3>
              <ul className="space-y-1">
                {evidence.map((u, i) => (
                  <li key={i}><a href={u} target="_blank" rel="noopener noreferrer" className="text-sm text-clay hover:text-clay-deep">{u}</a></li>
                ))}
              </ul>
            </>
          )}
        </div>

        {d.adminNote && (
          <div className="mt-4 rounded-2xl border border-line bg-cream p-5">
            <h2 className="mb-2 font-serif text-base text-forest-deep">Admin note</h2>
            <p className="whitespace-pre-wrap text-sm text-charcoal">{d.adminNote}</p>
            {d.depositAction && (
              <p className="mt-2 text-xs text-stone">
                Deposit action: <strong className="text-charcoal">{d.depositAction}</strong>
                {d.depositAction === "split" && d.depositSplitToHostCents != null
                  ? ` — ${fmtNzd(d.depositSplitToHostCents)} to host, rest to guest`
                  : ""}
              </p>
            )}
          </div>
        )}

        {isOpen && (
          <div className="mt-4 rounded-2xl border border-line bg-cream p-5">
            <h2 className="mb-3 font-serif text-base text-forest-deep">Resolve</h2>
            <DisputeActions disputeId={id} depositCents={d.bookingDepositCents} />
          </div>
        )}
      </div>
    </main>
  );
}
