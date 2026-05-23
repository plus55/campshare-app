import type { BookingStatus } from "@/lib/types";

const CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  pending_capture:    { label: "Processing payment", className: "bg-[#fef3c7] text-[#92400e]" },
  requested:          { label: "Pending response",   className: "bg-[#fef3c7] text-[#92400e]" },
  accepted:           { label: "Confirmed",           className: "bg-moss-light text-moss" },
  in_progress:        { label: "Trip in progress",    className: "bg-[#dbeafe] text-[#1e40af]" },
  completed:          { label: "Completed",           className: "bg-[#f0fdf4] text-[#166534]" },
  declined:           { label: "Declined",            className: "bg-rust-light text-rust" },
  cancelled_by_guest: { label: "Cancelled",           className: "bg-sand-warm text-stone" },
  cancelled_by_host:  { label: "Cancelled by host",   className: "bg-sand-warm text-stone" },
  expired:            { label: "Expired",             className: "bg-sand-warm text-stone" },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, className } = CONFIG[status] ?? CONFIG.expired;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
