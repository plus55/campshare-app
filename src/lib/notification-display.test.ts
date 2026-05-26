import { describe, expect, it } from "vitest";
import { notificationHref, notificationLabel } from "@/lib/notification-display";

const bookingId = "booking-1";

describe("notificationHref", () => {
  it("routes host requests and messages to host booking details", () => {
    expect(notificationHref("booking_requested", { bookingId })).toBe("/dashboard/bookings/booking-1");
    expect(notificationHref("message", { bookingId, recipientRole: "host" })).toBe("/dashboard/bookings/booking-1");
  });

  it("routes guest booking updates and messages to trip details", () => {
    expect(notificationHref("booking_accepted", { bookingId })).toBe("/trips/booking-1");
    expect(notificationHref("message", { bookingId, recipientRole: "guest" })).toBe("/trips/booking-1");
    expect(notificationHref("booking_cancelled", { bookingId, recipientRole: "guest" })).toBe("/trips/booking-1");
  });

  it("routes date changes and review prompts to their active workspaces", () => {
    expect(notificationHref("date_change_requested", { bookingId })).toBe("/dashboard/bookings/booking-1");
    expect(notificationHref("date_change_accepted", { bookingId })).toBe("/trips/booking-1");
    expect(notificationHref("review_prompt", { bookingId })).toBe("/dashboard/reviews");
  });
});

describe("notificationLabel", () => {
  it("describes date-change notifications distinctly from booking requests", () => {
    expect(notificationLabel("date_change_requested", { vanName: "The Green Machine" }))
      .toBe("New date-change request for The Green Machine");
  });
});
