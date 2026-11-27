// app/api/inventory/labels/pdf/route.ts
// Generates printable Avery 5163 adhesive QR label PDFs for costumes & tech equipment.

import { NextRequest, NextResponse } from "next/server";
import { isPostgresEnabled } from "@/db";
import { requireStaffAccess } from "@/app/lib/auth-guard";
import { listInventoryForQrLabelsPg } from "@/app/lib/db/phase3-repo";
import { generateAveryQrLabelsPdf } from "@/app/lib/label-pdf";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isPostgresEnabled()) {
    return NextResponse.json({ error: "PostgreSQL required for QR label export." }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const tenant = (searchParams.get("tenant") || "").trim().toLowerCase();
  const typeParam = (searchParams.get("type") || "garments").trim().toLowerCase();
  const type: "garments" | "equipment" = typeParam === "equipment" ? "equipment" : "garments";
  const prodRaw = searchParams.get("productionId");
  const productionId = prodRaw && Number.isInteger(Number(prodRaw)) && Number(prodRaw) > 0
    ? Number(prodRaw)
    : null;

  if (!tenant) {
    return NextResponse.json({ error: "Missing tenant parameter." }, { status: 400 });
  }

  const guard = await requireStaffAccess();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const data = await listInventoryForQrLabelsPg(tenant, type, productionId);
  if (!data) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  const pdfBytes = await generateAveryQrLabelsPdf(data.items, data.orgName);
  const filename = `${tenant}-${type}-qr-labels.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
