import type { BookingStatus } from "@/lib/types";

const CONFIG: Record<BookingStatus, { label: string; bg: string; color: string }> = {
  requested:          { label: "Pending response",  bg: "#fef3c7", color: "#92400e" },
  accepted:           { label: "Confirmed",          bg: "#d1fae5", color: "#065f46" },
  in_progress:        { label: "Trip in progress",   bg: "#dbeafe", color: "#1e40af" },
  completed:          { label: "Completed",           bg: "#f0fdf4", color: "#166534" },
  declined:           { label: "Declined",            bg: "#fee2e2", color: "#991b1b" },
  cancelled_by_guest: { label: "Cancelled",           bg: "#f3f4f6", color: "#4b5563" },
  cancelled_by_host:  { label: "Cancelled by host",  bg: "#f3f4f6", color: "#4b5563" },
  expired:            { label: "Expired",             bg: "#f3f4f6", color: "#4b5563" },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, bg, color } = CONFIG[status] ?? CONFIG.expired;
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 500,
      background: bg,
      color,
    }}>
      {label}
    </span>
  );
}
