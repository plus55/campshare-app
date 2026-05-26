import { describe, expect, it } from "vitest";
import type { BookingStatus } from "@/lib/types";
import {
  canMessageOnBooking,
  canSelfCancelBooking,
  isActiveBooking,
} from "@/lib/booking-status";

const allStatuses: BookingStatus[] = [
  "requested",
  "accepted",
  "in_progress",
  "completed",
  "declined",
  "cancelled_by_guest",
  "cancelled_by_host",
  "expired",
];

describe("booking status policy", () => {
  it("treats requested, accepted, and in-progress bookings as active", () => {
    const active = allStatuses.filter(isActiveBooking);
    expect(active).toEqual(["requested", "accepted", "in_progress"]);
  });

  it("allows messages only while a booking is active", () => {
    const messageable = allStatuses.filter(canMessageOnBooking);
    expect(messageable).toEqual(["requested", "accepted", "in_progress"]);
  });

  it("allows self-service cancellation only before a trip starts", () => {
    const cancellable = allStatuses.filter(canSelfCancelBooking);
    expect(cancellable).toEqual(["requested", "accepted"]);
  });
});
