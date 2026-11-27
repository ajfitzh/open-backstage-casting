// app/actions/phase3-ops.ts
"use server";

import { revalidatePath } from "next/cache";
import { isPostgresEnabled } from "@/db";
import { requireStaffAccess } from "@/app/lib/auth-guard";
import {
  listVenueSeatsPg,
  saveVenueSeatsPg,
} from "@/app/lib/db/phase3-repo";
import type { SeatDraft } from "@/app/lib/phase3-helpers";

export async function getVenueSeatsAction(tenant: string) {
  if (!isPostgresEnabled()) {
    return { success: false as const, error: "PostgreSQL required.", venues: [], seatsByVenue: {} };
  }
  const guard = await requireStaffAccess();
  if (!guard.ok) {
    return { success: false as const, error: guard.error, venues: [], seatsByVenue: {} };
  }
  const data = await listVenueSeatsPg(tenant);
  return { success: true as const, ...data };
}

export async function saveVenueSeatsAction(
  tenant: string,
  venueId: number,
  seats: SeatDraft[]
) {
  if (!isPostgresEnabled()) {
    return { success: false as const, error: "PostgreSQL required." };
  }
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false as const, error: guard.error };

  const res = await saveVenueSeatsPg(tenant, venueId, seats);
  if (res.success) {
    revalidatePath(`/${tenant}/box-office`);
    revalidatePath(`/${tenant}/tickets`);
  }
  return res;
}
