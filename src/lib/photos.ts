export function photoUrl(r2Key: string): string {
  const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (!base) return "";
  return `${base}/${r2Key}`;
}

export function photoExtension(contentType: string): string {
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/png") return "png";
  return "jpg";
}

export const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/webp", "image/png"] as const;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_PHOTOS_PER_LISTING = 10;
