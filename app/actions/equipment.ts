// app/actions/equipment.ts
"use server";

import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/app/lib/auth-guard";
import { isPostgresEnabled } from "@/db";
import {
  createEquipmentPg,
  deleteEquipmentPg,
  getCheckoutPickerOptionsPg,
  getEquipmentBySkuPg,
  listEquipmentPg,
  updateEquipmentStatusPg,
  type CreateEquipmentInput,
} from "@/app/lib/db/wardrobe-academy-repo";

async function toQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 220,
    margin: 1,
    color: { dark: "#09090b", light: "#ffffff" },
  });
}

export async function getEquipmentInventoryWithQr(tenant: string) {
  if (!isPostgresEnabled()) return { success: true as const, items: [] };
  const items = await listEquipmentPg(tenant);
  const withQr = await Promise.all(
    items.map(async (item) => ({
      ...item,
      qrDataUrl: await toQrDataUrl(item.qrCodeValue),
    }))
  );
  return { success: true as const, items: withQr };
}

export async function createEquipmentItem(tenant: string, input: CreateEquipmentInput) {
  const guard = await requirePermission(tenant, "view_cast_list");
  if (!guard.ok) return { success: false as const, error: guard.error };
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL is required." };

  const res = await createEquipmentPg(tenant, input);
  if (!res.success) return res;

  const qrDataUrl = await toQrDataUrl(res.item.qrCodeValue);
  revalidatePath(`/${tenant}/inventory`);
  return { success: true as const, item: { ...res.item, qrDataUrl } };
}

export async function updateEquipmentStatus(
  tenant: string,
  equipmentId: number,
  status: string,
  location?: string,
  assignment?: {
    productionId?: number | null;
    personId?: number | null;
    clearAssignment?: boolean;
  }
) {
  const guard = await requirePermission(tenant, "view_cast_list");
  if (!guard.ok) return { success: false as const, error: guard.error };
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL is required." };

  const res = await updateEquipmentStatusPg(tenant, equipmentId, status, location, assignment);
  if (!res.success) return res;

  revalidatePath(`/${tenant}/inventory`);
  return { success: true as const, item: res.item };
}

export async function getEquipmentCheckoutOptions(tenant: string) {
  if (!isPostgresEnabled()) return { productions: [], people: [] };
  return getCheckoutPickerOptionsPg(tenant);
}

export async function deleteEquipmentItem(tenant: string, equipmentId: number) {
  const guard = await requirePermission(tenant, "view_cast_list");
  if (!guard.ok) return { success: false as const, error: guard.error };
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL is required." };

  const res = await deleteEquipmentPg(tenant, equipmentId);
  revalidatePath(`/${tenant}/inventory`);
  return res;
}

export async function lookupEquipmentBySku(tenant: string, skuOrQr: string) {
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL is required." };
  const item = await getEquipmentBySkuPg(tenant, skuOrQr);
  if (!item) return { success: false as const, error: `No equipment found matching "${skuOrQr}".` };

  const qrDataUrl = await toQrDataUrl(item.qrCodeValue);
  return { success: true as const, item: { ...item, qrDataUrl } };
}
