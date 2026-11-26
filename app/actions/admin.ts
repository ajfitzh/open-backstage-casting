"use server";

import { revalidatePath } from "next/cache";
import { fetchBaserow, getDB, getUserProfile, invalidatePeopleCache } from "@/app/lib/baserow";
import { getTenantTableConfig } from "@/app/lib/tenant-config";
import { requireAdminAccess, requireAuthenticatedUser, requirePermission } from "@/app/lib/auth-guard";
import { ASSIGNABLE_GLOBAL_ROLES } from "@/app/lib/permissions";
import { isPostgresEnabled } from "@/db";
import {
  assignShowTeamMemberPg,
  createAuditionSlotPg,
  createProductionPg,
  deleteAuditionSlotPg,
  removeShowTeamMemberPg,
  setProductionStatusPg,
  updatePersonProfilePg,
  updatePersonRolesPg,
} from "@/app/lib/db/productions-repo";

const ALLOWED_ROLE_SET = new Set([
  ...ASSIGNABLE_GLOBAL_ROLES,
  "Student",
  "Teacher",
  "Alumni",
  "Parent",
]);

const ALLOWED_PRODUCTION_STATUSES = new Set(["Active", "Upcoming", "Archived"]);

export async function updateMyProfile(
  tenant: string,
  data: {
    fullName?: string;
    phone?: string;
    address?: string;
    city?: string;
    headshotUrl?: string;
  }
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return { success: false, error: authResult.error };

  try {
    if (isPostgresEnabled()) {
      const pgRes = await updatePersonProfilePg(tenant, authResult.user.email, data);
      if (!pgRes.success) return pgRes;
      invalidatePeopleCache(tenant);
      revalidatePath(`/${tenant}/settings`);
      return { success: true };
    }

    const profile = await getUserProfile(tenant, authResult.user.email);
    if (!profile?.id) {
      return { success: false, error: "Could not locate your profile record." };
    }

    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const F = DB.PEOPLE.FIELDS;

    const payload: Record<string, unknown> = {};

    if (typeof data.fullName === "string" && data.fullName.trim()) {
      const parts = data.fullName.trim().split(/\s+/);
      payload[F.FIRST_NAME] = parts[0];
      payload[F.LAST_NAME] = parts.slice(1).join(" ");
    }

    if (typeof data.phone === "string") {
      payload[F.PHONE_NUMBER] = data.phone.trim();
    }

    if (typeof data.address === "string") {
      payload[F.ADDRESS] = data.address.trim();
    }

    if (typeof data.city === "string") {
      payload[F.CITY] = data.city.trim();
    }

    if (typeof data.headshotUrl === "string" && data.headshotUrl.startsWith("https://")) {
      payload[F.HEADSHOT] = data.headshotUrl;
    }

    if (Object.keys(payload).length === 0) {
      return { success: true };
    }

    const res = await fetchBaserow(
      `/database/rows/table/${tables.PEOPLE}/${profile.id}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      {},
      tenant
    );

    if (!res || res.error) {
      return { success: false, error: "Failed to save profile changes." };
    }

    invalidatePeopleCache(tenant);
    revalidatePath(`/${tenant}/settings`);
    return { success: true };
  } catch (error) {
    console.error("updateMyProfile error:", error);
    return { success: false, error: "Unexpected error saving profile." };
  }
}

export async function updateUserRoles(tenant: string, personId: number, roles: string[]) {
  const authResult = await requireAdminAccess();
  if (!authResult.ok) return { success: false, error: authResult.error };

  if (!Number.isInteger(personId) || personId <= 0) {
    return { success: false, error: "Invalid person ID." };
  }

  const sanitizedRoles = Array.from(
    new Set(roles.map((r) => r.trim()).filter((r) => ALLOWED_ROLE_SET.has(r)))
  );

  try {
    if (isPostgresEnabled()) {
      const pgRes = await updatePersonRolesPg(tenant, personId, sanitizedRoles);
      if (!pgRes.success) return pgRes;
      invalidatePeopleCache(tenant);
      revalidatePath(`/${tenant}/settings`);
      return { success: true, roles: sanitizedRoles };
    }

    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);

    const res = await fetchBaserow(
      `/database/rows/table/${tables.PEOPLE}/${personId}/`,
      {
        method: "PATCH",
        body: JSON.stringify({
          [DB.PEOPLE.FIELDS.STATUS]: sanitizedRoles,
        }),
      },
      {},
      tenant
    );

    if (!res || res.error) {
      return { success: false, error: "Failed to update user roles in Baserow." };
    }

    invalidatePeopleCache(tenant);
    revalidatePath(`/${tenant}/settings`);
    return { success: true, roles: sanitizedRoles };
  } catch (error) {
    console.error("updateUserRoles error:", error);
    return { success: false, error: "Unexpected error updating roles." };
  }
}

export async function setProductionStatus(
  tenant: string,
  productionId: number,
  status: string
) {
  const authResult = await requireAdminAccess();
  if (!authResult.ok) return { success: false, error: authResult.error };

  if (!Number.isInteger(productionId) || productionId <= 0) {
    return { success: false, error: "Invalid production ID." };
  }

  if (!ALLOWED_PRODUCTION_STATUSES.has(status)) {
    return { success: false, error: `Invalid production status: ${status}` };
  }

  try {
    if (isPostgresEnabled()) {
      const pgRes = await setProductionStatusPg(tenant, productionId, status);
      if (!pgRes.success) return pgRes;
      revalidatePath(`/${tenant}/settings`);
      revalidatePath(`/${tenant}`);
      return { success: true };
    }

    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);

    const res = await fetchBaserow(
      `/database/rows/table/${tables.PRODUCTIONS}/${productionId}/`,
      {
        method: "PATCH",
        body: JSON.stringify({
          [DB.PRODUCTIONS.FIELDS.STATUS]: status,
        }),
      },
      {},
      tenant
    );

    if (!res || res.error) {
      return { success: false, error: "Failed to update production status." };
    }

    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}`);
    return { success: true };
  } catch (error) {
    console.error("setProductionStatus error:", error);
    return { success: false, error: "Unexpected error updating production status." };
  }
}

export async function createProduction(
  tenant: string,
  data: {
    title: string;
    status?: string;
    location?: string;
    productionFee?: number;
    seasonId?: number | null;
    masterShowId?: number | null;
  }
) {
  const authResult = await requireAdminAccess();
  if (!authResult.ok) return { success: false, error: authResult.error };

  const title = (data.title || "").trim();
  if (!title) {
    return { success: false, error: "Production title is required." };
  }

  const status =
    data.status && ALLOWED_PRODUCTION_STATUSES.has(data.status) ? data.status : "Upcoming";
  const fee = Number(data.productionFee ?? 0);
  if (Number.isNaN(fee) || fee < 0) {
    return { success: false, error: "Production fee must be a valid non-negative number." };
  }

  try {
    if (isPostgresEnabled()) {
      const pgRes = await createProductionPg(tenant, {
        title,
        status,
        location: data.location,
        productionFee: fee,
        seasonId: data.seasonId,
        masterShowId: data.masterShowId,
      });
      if (!pgRes.success) return pgRes;
      revalidatePath(`/${tenant}/settings`);
      revalidatePath(`/${tenant}`);
      return pgRes;
    }

    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const F = DB.PRODUCTIONS.FIELDS;

    const payload: Record<string, unknown> = {
      [F.TITLE]: title,
      [F.STATUS]: status,
      [F.PRODUCTION_FEE]: fee,
      [F.IS_ACTIVE]: status === "Active",
    };

    if (data.location?.trim()) {
      payload[F.LOCATION] = data.location.trim();
    }
    if (data.seasonId && Number.isInteger(data.seasonId) && data.seasonId > 0) {
      payload[F.SEASON_LINKED] = [data.seasonId];
    }
    if (data.masterShowId && Number.isInteger(data.masterShowId) && data.masterShowId > 0) {
      payload[F.MASTER_SHOW_DATABASE] = [data.masterShowId];
    }

    const res = await fetchBaserow(
      `/database/rows/table/${tables.PRODUCTIONS}/`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      {},
      tenant
    );

    if (!res || res.error || !res.id) {
      return { success: false, error: "Failed to create production in Baserow." };
    }

    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}`);
    return {
      success: true,
      production: {
        id: res.id,
        title,
        status,
        location: data.location?.trim() || "General",
        productionFee: fee,
      },
    };
  } catch (error) {
    console.error("createProduction error:", error);
    return { success: false, error: "Unexpected error creating production." };
  }
}

export async function createAuditionSlot(
  tenant: string,
  productionId: number,
  data: {
    timeLabel: string;
    dateTime?: string;
    capacity: number;
  }
) {
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  const timeLabel = (data.timeLabel || "").trim();
  const capacity = Number(data.capacity);

  if (!Number.isInteger(productionId) || productionId <= 0) {
    return { success: false, error: "Select a valid production first." };
  }
  if (!timeLabel) {
    return { success: false, error: "Slot label (e.g., Thursday 5:00 PM) is required." };
  }
  if (!Number.isInteger(capacity) || capacity <= 0 || capacity > 500) {
    return { success: false, error: "Capacity must be between 1 and 500." };
  }

  try {
    if (isPostgresEnabled()) {
      const pgRes = await createAuditionSlotPg(tenant, productionId, {
        timeLabel,
        dateTime: data.dateTime,
        capacity,
      });
      if (!pgRes.success) return pgRes;
      revalidatePath(`/${tenant}/settings`);
      revalidatePath(`/${tenant}/audition-form`);
      return pgRes;
    }

    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const F = DB.AUDITION_SLOTS.FIELDS;
    const tableId = tables.AUDITION_SLOTS || DB.AUDITION_SLOTS.ID;

    const payload: Record<string, unknown> = {
      [F.TIME_LABEL]: timeLabel,
      [F.PRODUCTION]: [productionId],
      [F.CAPACITY]: capacity,
    };

    if (data.dateTime?.trim()) {
      payload[F.DATE_TIME] = data.dateTime.trim();
    }

    const res = await fetchBaserow(
      `/database/rows/table/${tableId}/`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      {},
      tenant
    );

    if (!res || res.error || !res.id) {
      return { success: false, error: "Failed to create audition slot." };
    }

    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}/audition-form`);
    return {
      success: true,
      slot: {
        id: res.id,
        label: timeLabel,
        capacity,
        taken: 0,
        remaining: capacity,
        isFull: false,
      },
    };
  } catch (error) {
    console.error("createAuditionSlot error:", error);
    return { success: false, error: "Unexpected error creating audition slot." };
  }
}

export async function deleteAuditionSlot(tenant: string, slotId: number) {
  const guard = await requirePermission(tenant, "manage_casting");
  if (!guard.ok) return { success: false, error: guard.error };

  if (!Number.isInteger(slotId) || slotId <= 0) {
    return { success: false, error: "Invalid slot ID." };
  }

  try {
    if (isPostgresEnabled()) {
      const pgRes = await deleteAuditionSlotPg(tenant, slotId);
      if (!pgRes.success) return pgRes;
      revalidatePath(`/${tenant}/settings`);
      revalidatePath(`/${tenant}/audition-form`);
      return { success: true };
    }

    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const tableId = tables.AUDITION_SLOTS || DB.AUDITION_SLOTS.ID;

    await fetchBaserow(
      `/database/rows/table/${tableId}/${slotId}/`,
      { method: "DELETE" },
      {},
      tenant
    );

    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}/audition-form`);
    return { success: true };
  } catch (error) {
    console.error("deleteAuditionSlot error:", error);
    return { success: false, error: "Unexpected error deleting audition slot." };
  }
}

export async function assignShowTeamMember(
  tenant: string,
  productionId: number,
  personId: number,
  positionId: number
) {
  const authResult = await requireAdminAccess();
  if (!authResult.ok) return { success: false, error: authResult.error };

  if (!productionId || !personId || !positionId) {
    return { success: false, error: "Production, person, and position are all required." };
  }

  try {
    if (isPostgresEnabled()) {
      const pgRes = await assignShowTeamMemberPg(tenant, productionId, personId, positionId);
      if (!pgRes.success) return pgRes;
      revalidatePath(`/${tenant}/settings`);
      revalidatePath(`/${tenant}`);
      return pgRes;
    }

    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const tableId = tables.SHOW_TEAM || DB.SHOW_TEAM.ID;
    const F = DB.SHOW_TEAM.FIELDS;

    const res = await fetchBaserow(
      `/database/rows/table/${tableId}/`,
      {
        method: "POST",
        body: JSON.stringify({
          [F.PRODUCTIONS]: [productionId],
          [F.PERSON]: [personId],
          [F.POSITION]: [positionId],
        }),
      },
      {},
      tenant
    );

    if (!res || res.error || !res.id) {
      return { success: false, error: "Failed to assign show team member." };
    }

    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}`);
    return { success: true, assignmentId: res.id };
  } catch (error) {
    console.error("assignShowTeamMember error:", error);
    return { success: false, error: "Unexpected error assigning show team member." };
  }
}

export async function removeShowTeamMember(tenant: string, assignmentId: number) {
  const authResult = await requireAdminAccess();
  if (!authResult.ok) return { success: false, error: authResult.error };

  if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
    return { success: false, error: "Invalid assignment ID." };
  }

  try {
    if (isPostgresEnabled()) {
      const pgRes = await removeShowTeamMemberPg(tenant, assignmentId);
      if (!pgRes.success) return pgRes;
      revalidatePath(`/${tenant}/settings`);
      revalidatePath(`/${tenant}`);
      return { success: true };
    }

    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const tableId = tables.SHOW_TEAM || DB.SHOW_TEAM.ID;

    await fetchBaserow(
      `/database/rows/table/${tableId}/${assignmentId}/`,
      { method: "DELETE" },
      {},
      tenant
    );

    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}`);
    return { success: true };
  } catch (error) {
    console.error("removeShowTeamMember error:", error);
    return { success: false, error: "Unexpected error removing team member." };
  }
}
