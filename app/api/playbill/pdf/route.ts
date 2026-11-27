// app/api/playbill/pdf/route.ts
// Generates downloadable half-letter (5.5 x 8.5 in) or saddle-stitch booklet Playbill PDFs.

import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { requirePermission } from "@/app/lib/auth-guard";
import { getDb, isPostgresEnabled, schema } from "@/db";
import { getOrganizationBySlugPg } from "@/app/lib/db/core-repo";
import { getPlaybillDataPg } from "@/app/lib/db/operations-repo";
import { generatePlaybillPdf } from "@/app/lib/playbill-pdf";

export const dynamic = "force-dynamic";

async function fetchPosterImageBytes(
  url: string | null | undefined
): Promise<{ bytes: Uint8Array; mime: "image/jpeg" | "image/png" } | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const mime: "image/jpeg" | "image/png" | null = contentType.includes("png")
      ? "image/png"
      : contentType.includes("jpeg") || contentType.includes("jpg")
        ? "image/jpeg"
        : null;
    if (!mime) return null;

    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 6 * 1024 * 1024) return null;
    return { bytes: buf, mime };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenant = (searchParams.get("tenant") || "").trim().toLowerCase();
  const productionId = Number(searchParams.get("productionId"));
  const mode = searchParams.get("mode") === "booklet" ? "booklet" : "reader";

  if (!tenant || !Number.isInteger(productionId) || productionId <= 0) {
    return NextResponse.json(
      { error: "Valid tenant and productionId query params are required." },
      { status: 400 }
    );
  }

  const guard = await requirePermission(tenant, "view_cast_list", productionId);
  if (!guard.ok) {
    const status = /auth|sign in|unauthorized/i.test(guard.error) ? 401 : 403;
    return NextResponse.json({ error: guard.error }, { status });
  }

  if (!isPostgresEnabled()) {
    return NextResponse.json({ error: "Playbill PDF requires PostgreSQL." }, { status: 503 });
  }

  try {
    const org = await getOrganizationBySlugPg(tenant);
    if (!org) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const db = getDb();
    const [prod] = await db
      .select()
      .from(schema.productions)
      .where(
        and(
          eq(schema.productions.organizationId, org.id),
          or(
            eq(schema.productions.baserowId, productionId),
            eq(schema.productions.id, productionId)
          )
        )
      )
      .limit(1);

    if (!prod) {
      return NextResponse.json({ error: "Production not found." }, { status: 404 });
    }

    const [castData, poster] = await Promise.all([
      getPlaybillDataPg(tenant, productionId),
      fetchPosterImageBytes(prod.showImageUrl),
    ]);

    const datesLabel =
      prod.openingNight && prod.closingNight
        ? `${prod.openingNight} – ${prod.closingNight}`
        : prod.openingNight || prod.sessionLabel || null;

    const pdfBytes = await generatePlaybillPdf({
      orgName: org.name,
      showTitle: prod.title,
      location: prod.location || org.name,
      datesLabel,
      posterBytes: poster?.bytes ?? null,
      posterMime: poster?.mime ?? null,
      cast: castData || [],
      mode,
    });

    const slugTitle = prod.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const suffix = mode === "booklet" ? "booklet_letter" : "half_letter";
    const filename = `${slugTitle}_playbill_${suffix}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[Playbill PDF] Generation error:", err);
    return NextResponse.json({ error: "Failed to generate Playbill PDF." }, { status: 500 });
  }
}
