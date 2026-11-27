// app/actions/tickets.ts
"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/app/lib/auth-guard";
import { isPostgresEnabled } from "@/db";
import {
  createPerformancePg,
  scanTicketAtDoorPg,
  updatePerformancePg,
} from "@/app/lib/db/tickets-repo";

export async function createShowPerformance(
  tenant: string,
  productionId: number,
  input: {
    label: string;
    performanceDate: string;
    doorsOpenAt?: string;
    totalInventory: number;
    ticketPrice: number;
  }
) {
  const guard = await requirePermission(tenant, "view_cast_list", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL is required." };

  const res = await createPerformancePg(tenant, productionId, input);
  if (res.success) {
    revalidatePath(`/${tenant}/box-office`);
    revalidatePath(`/${tenant}/tickets`);
  }
  return res;
}

export async function togglePerformanceSales(
  tenant: string,
  performanceId: number,
  salesOpen: boolean
) {
  const guard = await requirePermission(tenant, "view_cast_list");
  if (!guard.ok) return { success: false as const, error: guard.error };
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL is required." };

  const res = await updatePerformancePg(tenant, performanceId, { salesOpen });
  if (res.success) {
    revalidatePath(`/${tenant}/box-office`);
    revalidatePath(`/${tenant}/tickets`);
  }
  return res;
}

export async function scanDoorTicket(
  tenant: string,
  codeOrQr: string,
  expectedPerformanceId?: number | null
) {
  const guard = await requirePermission(tenant, "view_checkin");
  if (!guard.ok) {
    return {
      outcome: "invalid" as const,
      message: guard.error || "Check-in permission required.",
    };
  }
  if (!isPostgresEnabled()) {
    return { outcome: "invalid" as const, message: "PostgreSQL is required." };
  }

  const scannedBy = guard.user?.email || "box-office";
  const res = await scanTicketAtDoorPg(tenant, codeOrQr, scannedBy, expectedPerformanceId);
  if (res.outcome === "admitted") {
    revalidatePath(`/${tenant}/box-office`);
  }
  return res;
}
