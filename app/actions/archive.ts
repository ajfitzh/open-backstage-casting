"use server";

import { isPostgresEnabled } from "@/db";
import {
  getPublicShowDetailPg,
  type PublicShowDetail,
} from "@/app/lib/db/archive-repo";

export async function getPublicShowDetailAction(
  tenant: string,
  productionId: number
): Promise<{ ok: boolean; detail?: PublicShowDetail | null; error?: string }> {
  if (!isPostgresEnabled()) {
    return { ok: false, error: "Archive requires PostgreSQL." };
  }
  if (!tenant || !Number.isInteger(productionId) || productionId <= 0) {
    return { ok: false, error: "Invalid production." };
  }

  try {
    const detail = await getPublicShowDetailPg(tenant, productionId);
    return { ok: true, detail };
  } catch (err) {
    console.error("[Archive] Failed to load show detail:", err);
    return { ok: false, error: "Could not load show details." };
  }
}
