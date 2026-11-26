import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, isPostgresEnabled } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  if (!isPostgresEnabled()) {
    return NextResponse.json({
      ok: true,
      backend: "baserow-fallback",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      ok: true,
      backend: "postgres",
      dbLatencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Health Check] Postgres ping failed:", error);
    return NextResponse.json(
      {
        ok: false,
        backend: "postgres",
        error: "Database unreachable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
