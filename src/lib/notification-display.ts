export function notificationLabel(type: string, payload: Record<string, unknown>): string {
  const van = (payload.vanName as string) ?? "your van";
  switch (type) {
    case "booking_requested": return `New booking request for ${van}`;
    case "booking_accepted": return `Your booking for ${van} was accepted`;
    case "booking_declined": return `Booking request for ${van} was declined`;
    case "booking_cancelled": return `Booking for ${van} was cancelled`;
    case "date_change_requested": return `New date-change request for ${van}`;
    case "date_change_accepted": return `Date change for ${van} was accepted`;
    case "date_change_declined": return `Date change for ${van} was declined`;
    case "review_prompt": return `Time to leave a review for ${van}`;
    case "review_received": return `New review for ${van}`;
    case "host_response": return `Your host replied to your review for ${van}`;
    case "message": return `New message about ${van}`;
    case "payout_sent": return `Payout sent for ${van}`;
    case "deposit_released": return `Deposit released for ${van}`;
    case "damage_claim_resolved": return `Damage claim resolved for ${van}`;
    default: return "New notification";
  }
}

export function notificationHref(type: string, payload: Record<string, unknown>): string {
  const bookingId = payload.bookingId as string | undefined;
  const recipientRole = payload.recipientRole as string | undefined;
  switch (type) {
    case "booking_requested":
    case "date_change_requested":
      return bookingId ? `/dashboard/bookings/${bookingId}` : "/dashboard/bookings";
    case "booking_accepted":
    case "booking_declined":
    case "date_change_accepted":
    case "date_change_declined":
    case "deposit_released":
      return bookingId ? `/trips/${bookingId}` : "/trips";
    case "booking_cancelled":
    case "message":
      return recipientRole === "guest"
        ? (bookingId ? `/trips/${bookingId}` : "/trips")
        : (bookingId ? `/dashboard/bookings/${bookingId}` : "/dashboard/bookings");
    case "review_prompt":
    case "review_received":
    case "host_response":
      return "/dashboard/reviews";
    case "payout_sent":
      return "/dashboard/payouts";
    case "damage_claim_resolved":
      return recipientRole === "guest"
        ? (bookingId ? `/trips/${bookingId}` : "/trips")
        : (bookingId ? `/dashboard/bookings/${bookingId}` : "/dashboard/bookings");
    default:
      return "/dashboard/notifications";
  }
}
