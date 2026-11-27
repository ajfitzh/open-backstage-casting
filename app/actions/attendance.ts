// app/actions/attendance.ts
"use server";

import { requirePermission } from "@/app/lib/auth-guard";
import { toggleAttendancePg } from "@/app/lib/db/operations-repo";

export async function toggleAttendance(
  tenant: string,
  productionId: number,
  personId: number,
  eventId: number,
  action: "IN" | "OUT" | "ABSENT"
) {
  const guard = await requirePermission(tenant, "view_checkin", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    return await toggleAttendancePg(tenant, productionId, personId, eventId, action);
  } catch (error) {
    console.error("Attendance Toggle Error:", error);
    return { success: false, error: "Database connection failed." };
  }
}
