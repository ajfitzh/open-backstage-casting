// app/actions/checkin.ts
"use server";

import { requirePermission } from "@/app/lib/auth-guard";
import { saveCheckInPg } from "@/app/lib/db/casting-repo";

export async function saveCheckIn(
  tenant: string,
  auditionId: number,
  status: string,
  lobbyNote: string,
  performerId?: number | null,
  updatedName?: string,
  updatedPhone?: string,
  updatedEmail?: string
) {
  const guard = await requirePermission(tenant, "view_checkin");
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    return await saveCheckInPg(
      tenant,
      auditionId,
      status,
      lobbyNote,
      performerId,
      updatedName,
      updatedPhone,
      updatedEmail
    );
  } catch (e) {
    console.error("Check-In Save Error:", e);
    return { success: false };
  }
}
