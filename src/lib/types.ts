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
