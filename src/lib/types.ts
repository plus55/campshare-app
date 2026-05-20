export type VanListingStatus = "draft" | "pending_review" | "published" | "paused" | "archived";
export type Island = "North" | "South";
export type AvailabilityBlockReason = "booking" | "host-blocked" | "maintenance";

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
  createdAt: number;
}

export type BookingStatus =
  | "requested"
  | "accepted"
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
  totalCents: number;
  guestMessage: string | null;
  status: BookingStatus;
  statusReason: string | null;
  requestedAt: number;
  respondedAt: number | null;
  cancelledAt: number | null;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface BookingMessage {
  id: string;
  bookingId: string;
  senderUserId: string;
  body: string;
  readAt: number | null;
  createdAt: number;
}
