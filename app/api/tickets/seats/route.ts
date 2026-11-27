// app/api/tickets/seats/route.ts
// Public seat-map availability endpoint for a specific performance.

import { NextRequest, NextResponse } from "next/server";
import { isPostgresEnabled } from "@/db";
import { getPerformanceSeatingMapPg } from "@/app/lib/db/tickets-repo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isPostgresEnabled()) {
    return NextResponse.json({ hasSeatingMap: false, seats: [] });
  }

  const tenant = (req.nextUrl.searchParams.get("tenant") || "").trim().toLowerCase();
  const performanceId = Number(req.nextUrl.searchParams.get("performanceId"));

  if (!tenant || !Number.isInteger(performanceId) || performanceId <= 0) {
    return NextResponse.json(
      { error: "Valid tenant and performanceId are required." },
      { status: 400 }
    );
  }

  const map = await getPerformanceSeatingMapPg(tenant, performanceId);
  if (!map) {
    return NextResponse.json({ error: "Performance not found." }, { status: 404 });
  }

  return NextResponse.json(map, {
    headers: { "Cache-Control": "no-store" },
  });
}
