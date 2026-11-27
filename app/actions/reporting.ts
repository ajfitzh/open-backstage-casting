// app/actions/reporting.ts
"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/app/lib/auth-guard";
import { isPostgresEnabled } from "@/db";
import {
  assignClassSpaceSchedulePg,
  deleteClassroomSpacePg,
  upsertClassroomSpacePg,
  upsertVenueRentalRatePg,
} from "@/app/lib/db/reporting-repo";

export async function saveClassroomSpace(
  tenant: string,
  input: {
    id?: number | null;
    venueId: number | null;
    roomName: string;
    capacity: number | null;
    squareFootage: number | null;
    floorType?: string | null;
  }
) {
  const guard = await requirePermission(tenant, "edit_compliance");
  if (!guard.ok) return { success: false as const, error: guard.error };
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL is required." };

  const res = await upsertClassroomSpacePg(tenant, input);
  if (res.success) {
    revalidatePath(`/${tenant}/education/planning`);
    revalidatePath(`/${tenant}/education`);
  }
  return res;
}

export async function removeClassroomSpace(tenant: string, spaceId: number) {
  const guard = await requirePermission(tenant, "edit_compliance");
  if (!guard.ok) return { success: false as const, error: guard.error };
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL is required." };

  const res = await deleteClassroomSpacePg(tenant, spaceId);
  if (res.success) {
    revalidatePath(`/${tenant}/education/planning`);
    revalidatePath(`/${tenant}/education`);
  }
  return res;
}

export async function assignClassToSpace(
  tenant: string,
  classId: number,
  input: {
    spaceId?: number | null;
    day?: string;
    time?: string;
    location?: string;
    status?: string;
  }
) {
  const guard = await requirePermission(tenant, "edit_compliance");
  if (!guard.ok) return { success: false as const, error: guard.error };
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL is required." };

  const res = await assignClassSpaceSchedulePg(tenant, classId, input);
  if (res.success) {
    revalidatePath(`/${tenant}/education/planning`);
    revalidatePath(`/${tenant}/education`);
  }
  return res;
}

export async function saveVenueRentalRate(
  tenant: string,
  venueId: number,
  flatRate: number,
  hourlyRate?: number | null
) {
  const guard = await requirePermission(tenant, "view_financials");
  if (!guard.ok) return { success: false as const, error: guard.error };
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL is required." };

  const res = await upsertVenueRentalRatePg(tenant, venueId, {
    flatRate,
    ...(hourlyRate !== undefined ? { hourlyRate } : {}),
  });
  if (res.success) {
    revalidatePath(`/${tenant}/analytics`);
    revalidatePath(`/${tenant}/education/planning`);
  }
  return res;
}
