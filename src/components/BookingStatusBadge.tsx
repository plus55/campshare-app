import type { BookingStatus } from "@/lib/types";

const CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  requested:          { label: "Pending response",   className: "bg-ochre/10 text-ochre" },
  accepted:           { label: "Confirmed",           className: "bg-moss/10 text-moss" },
  in_progress:        { label: "Trip in progress",    className: "bg-forest/10 text-forest" },
  completed:          { label: "Completed",           className: "bg-moss/10 text-moss" },
  declined:           { label: "Declined",            className: "bg-destructive/10 text-destructive" },
  cancelled_by_guest: { label: "Cancelled",           className: "bg-muted text-muted-foreground" },
  cancelled_by_host:  { label: "Cancelled by host",   className: "bg-muted text-muted-foreground" },
  expired:            { label: "Expired",             className: "bg-muted text-muted-foreground" },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, className } = CONFIG[status] ?? CONFIG.expired;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
