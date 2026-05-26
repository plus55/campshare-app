import type { InsuranceStatus } from "@/lib/types";

// Private R2 bucket for host documents (insurance certificates). Never public.
export const HOST_DOCS_BUCKET = "campshare-host-docs";

export const INSURANCE_DOC_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type InsuranceDocContentType = (typeof INSURANCE_DOC_CONTENT_TYPES)[number];

export const MAX_INSURANCE_DOC_BYTES = 10 * 1024 * 1024; // 10 MB

export function insuranceDocExtension(contentType: string): string {
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export interface HostInsuranceFields {
  insuranceStatus: InsuranceStatus;
  insuranceExpiryDate: number | null; // unix seconds
}

/**
 * A host may publish listings and accept bookings only when their hire
 * insurance is verified AND the policy has not expired. This is the single
 * source of truth for every insurance gate (listing submit, admin approve,
 * booking accept) and the expiry cron.
 */
export function isInsuranceCurrent(
  host: HostInsuranceFields | null | undefined,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!host) return false;
  if (host.insuranceStatus !== "verified") return false;
  if (!host.insuranceExpiryDate) return false;
  return host.insuranceExpiryDate > nowSec;
}

export const INSURANCE_GATE_MESSAGE =
  "Verify your hire insurance before this can go live. Add a current policy that permits paid hire on your profile.";
