export type VanListingStatus = "draft" | "pending_review" | "published" | "paused" | "archived";
export type Island = "North" | "South";
export type AvailabilityBlockReason = "booking" | "host-blocked" | "maintenance" | "ical";

export type InsuranceStatus = "none" | "pending" | "verified" | "rejected" | "expired";
export type InsuranceCoverType = "p2p_rental" | "commercial_fleet" | "self_attested";

export interface HostProfile {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  region: string;
  island: Island;
  bio: string | null;
  verifiedIdentity: number;
  stripeAccountId: string | null;
  stripeOnboardingCompleted: number;
  insuranceStatus: InsuranceStatus;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  insuranceCoverType: InsuranceCoverType | null;
  insuranceDocR2Key: string | null;
  insuranceExpiryDate: number | null;
  insuranceAttestedAt: number | null;
  insuranceVerifiedAt: number | null;
  insuranceAdminNote: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface VanListing {
  id: string;
  hostUserId: string;
  slug: string;
  name: string;
  vanType: string;
  year: number;
  sleeps: number;
  seats: number;
  fixedToilet: number;
  petFriendly: number;
  description: string;
  nightlyRate: number;
  minimumNights: number;
  instantBook: number;
  status: VanListingStatus;
  adminNote: string | null;
  region: string;
  island: Island;
  pickupLocationText: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  features: string; // JSON array string
  houseRules: string;
  publishedAt: number | null;
  minDriverAge: number;
  icalFeedUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface VanPhoto {
  id: string;
  vanListingId: string;
  r2Key: string;
  position: number;
  caption: string | null;
  createdAt: number;
}

export interface AvailabilityBlock {
  id: string;
  vanListingId: string;
  startDate: number;
  endDate: number;
  reason: AvailabilityBlockReason;
  bookingId: string | null;
  icalUid: string | null;
  createdAt: number;
}

export type BookingStatus =
  | "requested"
  | "accepted"
  | "in_progress"
  | "completed"
  | "declined"
  | "cancelled_by_guest"
  | "cancelled_by_host"
  | "expired";

export interface Booking {
  id: string;
  vanListingId: string;
  guestUserId: string;
  hostUserId: string;
  startDate: number;
  endDate: number;
  nights: number;
  guestCount: number;
  nightlyRateCents: number;
  subtotalCents: number | null;
  serviceFeeCents: number | null;
  gstOnFeeCents: number | null;
  hostPayoutCents: number | null;
  totalCents: number;
  depositCents: number;
  cancellationPolicy: string;
  guestMessage: string | null;
  addonTotalCents: number;
  status: BookingStatus;
  statusReason: string | null;
  paymentIntentId: string | null;
  depositPaymentIntentId: string | null;
  depositPaymentMethodId: string | null;
  customerStripeId: string | null;
  requestedAt: number;
  respondedAt: number | null;
  paidAt: number | null;
  startedAt: number | null;
  completedAt: number | null;
  cancelledAt: number | null;
  expiresAt: number;
  reviewPromptSentAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export type ReviewRole = "guest" | "host";

export interface Review {
  id: string;
  bookingId: string;
  authorUserId: string;
  subjectUserId: string;
  vanListingId: string;
  role: ReviewRole;
  rating: number;
  text: string;
  createdAt: number;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: string;
  createdAt: number;
}

export interface BookingMessage {
  id: string;
  bookingId: string;
  senderUserId: string;
  body: string;
  readAt: number | null;
  createdAt: number;
}

export interface MessageTemplate {
  id: string;
  userId: string;
  title: string;
  body: string;
  position: number;
  createdAt: number;
  updatedAt: number;
}

export interface UserPaymentProfile {
  userId: string;
  stripeCustomerId: string;
  createdAt: number;
}

export interface Payout {
  id: string;
  bookingId: string;
  hostUserId: string;
  amountCents: number;
  stripeTransferId: string | null;
  status: "pending" | "paid" | "failed" | "reversed";
  createdAt: number;
  updatedAt: number;
}

export interface PaymentEvent {
  id: string;
  stripeEventId: string;
  eventType: string;
  bookingId: string | null;
  payload: string;
  status: "pending" | "processed" | "failed";
  processedAt: number | null;
  createdAt: number;
}

export interface DepositClaim {
  id: string;
  disputeId: string;
  bookingId: string;
  hostUserId: string;
  amountCents: number;
  chargePaymentIntentId: string | null;
  stripeTransferId: string | null;
  status: "pending" | "charged" | "transferred" | "failed";
  createdAt: number;
  updatedAt: number;
}

export interface PaymentReconciliation {
  id: string;
  bookingId: string;
  paymentIntentId: string;
  kind: "capture_orphan" | "finalise_failed";
  detail: string | null;
  createdAt: number;
}
