import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export interface Addon {
  id: string;
  name: string;
  description: string | null;
  priceType: "flat" | "per_night";
  sortOrder: number;
}

export async function GET() {
  const result = await db()
    .prepare("SELECT id, name, description, priceType, sortOrder FROM addon WHERE active = 1 ORDER BY sortOrder")
    .all<Addon>();
  return NextResponse.json(result.results);
}
