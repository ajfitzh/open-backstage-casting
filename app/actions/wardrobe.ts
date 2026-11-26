// app/actions/wardrobe.ts
"use server";

import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/app/lib/auth-guard";
import { isPostgresEnabled } from "@/db";
import {
  createGarmentPg,
  deleteGarmentPg,
  getGarmentBySkuPg,
  listGarmentsPg,
  savePersonMeasurementsPg,
  updateGarmentPg,
  type UpsertGarmentInput,
} from "@/app/lib/db/wardrobe-academy-repo";

export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 240,
    margin: 1,
    color: {
      dark: "#09090b",
      light: "#ffffff",
    },
  });
}

export async function getGarmentInventoryWithQr(tenant: string) {
  if (!isPostgresEnabled()) {
    return { success: true as const, items: [] };
  }

  const items = await listGarmentsPg(tenant);
  const withQr = await Promise.all(
    items.map(async (item) => ({
      ...item,
      qrDataUrl: await generateQrDataUrl(item.qrCodeValue),
    }))
  );
  return { success: true as const, items: withQr };
}

export async function createGarmentItem(
  tenant: string,
  productionId: number,
  input: UpsertGarmentInput
) {
  const guard = await requirePermission(tenant, "view_checkin", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };

  if (!isPostgresEnabled()) {
    return {
      success: false as const,
      error: "Garment inventory requires PostgreSQL to be enabled.",
    };
  }

  const res = await createGarmentPg(tenant, input);
  if (!res.success) return res;

  const qrDataUrl = await generateQrDataUrl(res.item.qrCodeValue);
  revalidatePath(`/${tenant}/production/${productionId}/costumes`);
  return { success: true as const, item: { ...res.item, qrDataUrl } };
}

export async function updateGarmentItem(
  tenant: string,
  productionId: number,
  garmentId: number,
  input: UpsertGarmentInput
) {
  const guard = await requirePermission(tenant, "view_checkin", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };

  if (!isPostgresEnabled()) {
    return {
      success: false as const,
      error: "Garment inventory requires PostgreSQL to be enabled.",
    };
  }

  const res = await updateGarmentPg(tenant, garmentId, input);
  if (!res.success) return res;

  const qrDataUrl = await generateQrDataUrl(res.item.qrCodeValue);
  revalidatePath(`/${tenant}/production/${productionId}/costumes`);
  return { success: true as const, item: { ...res.item, qrDataUrl } };
}

export async function deleteGarmentItem(
  tenant: string,
  productionId: number,
  garmentId: number
) {
  const guard = await requirePermission(tenant, "view_checkin", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };

  if (!isPostgresEnabled()) {
    return { success: false as const, error: "PostgreSQL is required." };
  }

  const res = await deleteGarmentPg(tenant, garmentId);
  if (!res.success) return res;

  revalidatePath(`/${tenant}/production/${productionId}/costumes`);
  return { success: true as const };
}

export async function lookupGarmentBySku(tenant: string, skuOrQr: string) {
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL is required." };
  const item = await getGarmentBySkuPg(tenant, skuOrQr);
  if (!item) return { success: false as const, error: `No garment found matching "${skuOrQr}".` };

  const qrDataUrl = await generateQrDataUrl(item.qrCodeValue);
  return { success: true as const, item: { ...item, qrDataUrl } };
}

export async function saveActorMeasurements(
  tenant: string,
  productionId: number,
  personId: number,
  data: {
    height?: number | null;
    chest?: number | null;
    waist?: number | null;
    hips?: number | null;
    inseam?: number | null;
    shoeSize?: number | null;
  }
) {
  const guard = await requirePermission(tenant, "view_checkin", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };

  if (!isPostgresEnabled()) {
    return { success: false as const, error: "PostgreSQL is required." };
  }

  const res = await savePersonMeasurementsPg(tenant, personId, data);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/costumes`);
  }
  return res;
}
