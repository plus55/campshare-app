import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { sendBrandedEmail } from "@/lib/email";

interface ApplyPayload {
  firstName: string;
  lastName: string;
  phone: string;
  region: string;
  island: "North" | "South";
  vanName: string;
  vanType: string;
  vanYear: number;
  sleeps: number;
  seats: number;
  fixedToilet: boolean;
  description: string;
  nightlyRate: number;
  minimumNights: number;
  availableFrom: string | null;
  availableTo: string | null;
  instantBook: boolean;
  features: string[];
  houseRules: string;
  petFriendly: boolean;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function toEpochOrNull(d: string | null): number | null {
  if (!d) return null;
  const t = Date.parse(d);
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  let body: ApplyPayload;
  try {
    body = (await req.json()) as ApplyPayload;
  } catch {
    return bad("Invalid JSON");
  }

  // Minimal validation — UI does the heavy lifting.
  const required: (keyof ApplyPayload)[] = [
    "firstName",
    "lastName",
    "phone",
    "region",
    "island",
    "vanName",
    "vanType",
    "description",
  ];
  for (const k of required) {
    if (!body[k]) return bad(`Missing field: ${k}`);
  }
  if (!Number.isFinite(body.vanYear) || body.vanYear < 1970) {
    return bad("Invalid van year");
  }
  if (!Number.isFinite(body.nightlyRate) || body.nightlyRate <= 0) {
    return bad("Nightly rate must be greater than zero");
  }

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db()
    .prepare(
      `INSERT INTO host_application (
         id, userId,
         firstName, lastName, phone, region, island,
         vanName, vanType, vanYear, sleeps, seats, fixedToilet, description,
         nightlyRate, minimumNights, availableFrom, availableTo, instantBook,
         features, houseRules, petFriendly,
         status, submittedAt
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
    )
    .bind(
      id,
      session.user.id,
      body.firstName,
      body.lastName,
      body.phone,
      body.region,
      body.island,
      body.vanName,
      body.vanType,
      body.vanYear,
      body.sleeps ?? 0,
      body.seats ?? 0,
      body.fixedToilet ? 1 : 0,
      body.description,
      body.nightlyRate,
      body.minimumNights,
      toEpochOrNull(body.availableFrom),
      toEpochOrNull(body.availableTo),
      body.instantBook ? 1 : 0,
      JSON.stringify(body.features ?? []),
      body.houseRules ?? "",
      body.petFriendly ? 1 : 0,
      now
    )
    .run();

  // Notify the admin.
  const admin = process.env.ADMIN_EMAIL ?? "jontydavies7@gmail.com";
  const appUrl = process.env.BETTER_AUTH_URL ?? "https://app.campshare.co.nz";

  try {
    await sendBrandedEmail({
      to: admin,
      subject: `New host application: ${body.vanName}`,
      heading: "New host application",
      intro:
        `${body.firstName} ${body.lastName} has applied to list ` +
        `${body.vanName} (${body.region}, ${body.island} Island).`,
      cta: {
        label: "Review application",
        href: `${appUrl}/admin/applications/${id}`,
      },
    });
  } catch (e) {
    console.error("Failed to send admin notification", e);
  }

  return NextResponse.json({ id, status: "pending" });
}
