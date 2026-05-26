import type { BookingStatus } from "@/lib/types";

const ACTIVE_BOOKING_STATUSES = new Set<BookingStatus>([
  "requested",
  "accepted",
  "in_progress",
]);

const SELF_CANCELLABLE_BOOKING_STATUSES = new Set<BookingStatus>([
  "requested",
  "accepted",
]);

export function isActiveBooking(status: BookingStatus): boolean {
  return ACTIVE_BOOKING_STATUSES.has(status);
}

export function canMessageOnBooking(status: BookingStatus): boolean {
  return ACTIVE_BOOKING_STATUSES.has(status);
}

export function canSelfCancelBooking(status: BookingStatus): boolean {
  return SELF_CANCELLABLE_BOOKING_STATUSES.has(status);
}
