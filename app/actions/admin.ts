"use server";

import { revalidatePath } from "next/cache";
import { invalidatePeopleCache } from "@/app/lib/baserow";
import { requireAdminAccess, requireAuthenticatedUser, requirePermission } from "@/app/lib/auth-guard";
import { ASSIGNABLE_GLOBAL_ROLES } from "@/app/lib/permissions";
import {
  assignShowTeamMemberPg,
  createAuditionSlotPg,
  createProductionPg,
  deleteAuditionSlotPg,
  removeShowTeamMemberPg,
  setProductionStatusPg,
  updatePersonProfilePg,
  updatePersonRolesPg,
  updateProductionImagePg,
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
    const pgRes = await updatePersonProfilePg(tenant, authResult.user.email, data);
    if (!pgRes.success) return pgRes;
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
    const pgRes = await updatePersonRolesPg(tenant, personId, sanitizedRoles);
    if (!pgRes.success) return pgRes;
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
    const pgRes = await setProductionStatusPg(tenant, productionId, status);
    if (!pgRes.success) return pgRes;
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
  if (!authResult.ok) return { success: false as const, error: authResult.error };

  const title = (data.title || "").trim();
  if (!title) {
    return { success: false as const, error: "Production title is required." };
  }

  const status =
    data.status && ALLOWED_PRODUCTION_STATUSES.has(data.status) ? data.status : "Upcoming";
  const fee = Number(data.productionFee ?? 0);
  if (Number.isNaN(fee) || fee < 0) {
    return { success: false as const, error: "Production fee must be a valid non-negative number." };
  }

  try {
    const pgRes = await createProductionPg(tenant, {
      title,
      status,
      location: data.location,
      productionFee: fee,
      seasonId: data.seasonId,
      masterShowId: data.masterShowId,
    });
    if (!pgRes.success) return { success: false as const, error: pgRes.error };
    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}`);
    return pgRes;
  } catch (error) {
    console.error("createProduction error:", error);
    return { success: false as const, error: "Unexpected error creating production." };
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
  if (!guard.ok) return { success: false as const, error: guard.error };

  const timeLabel = (data.timeLabel || "").trim();
  const capacity = Number(data.capacity);

  if (!Number.isInteger(productionId) || productionId <= 0) {
    return { success: false as const, error: "Select a valid production first." };
  }
  if (!timeLabel) {
    return { success: false as const, error: "Slot label (e.g., Thursday 5:00 PM) is required." };
  }
  if (!Number.isInteger(capacity) || capacity <= 0 || capacity > 500) {
    return { success: false as const, error: "Capacity must be between 1 and 500." };
  }

  try {
    const pgRes = await createAuditionSlotPg(tenant, productionId, {
      timeLabel,
      dateTime: data.dateTime,
      capacity,
    });
    if (!pgRes.success) return { success: false as const, error: pgRes.error };
    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}/audition-form`);
    return pgRes;
  } catch (error) {
    console.error("createAuditionSlot error:", error);
    return { success: false as const, error: "Unexpected error creating audition slot." };
  }
}

export async function deleteAuditionSlot(tenant: string, slotId: number) {
  const guard = await requirePermission(tenant, "manage_casting");
  if (!guard.ok) return { success: false, error: guard.error };

  if (!Number.isInteger(slotId) || slotId <= 0) {
    return { success: false, error: "Invalid slot ID." };
  }

  try {
    const pgRes = await deleteAuditionSlotPg(tenant, slotId);
    if (!pgRes.success) return pgRes;
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
  if (!authResult.ok) return { success: false as const, error: authResult.error };

  if (!productionId || !personId || !positionId) {
    return { success: false as const, error: "Production, person, and position are all required." };
  }

  try {
    const pgRes = await assignShowTeamMemberPg(tenant, productionId, personId, positionId);
    if (!pgRes.success) return { success: false as const, error: pgRes.error };
    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}`);
    return pgRes;
  } catch (error) {
    console.error("assignShowTeamMember error:", error);
    return { success: false as const, error: "Unexpected error assigning show team member." };
  }
}

export async function removeShowTeamMember(tenant: string, assignmentId: number) {
  const authResult = await requireAdminAccess();
  if (!authResult.ok) return { success: false, error: authResult.error };

  if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
    return { success: false, error: "Invalid assignment ID." };
  }

  try {
    const pgRes = await removeShowTeamMemberPg(tenant, assignmentId);
    if (!pgRes.success) return pgRes;
    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}`);
    return { success: true };
  } catch (error) {
    console.error("removeShowTeamMember error:", error);
    return { success: false, error: "Unexpected error removing team member." };
  }
}

export async function updateProductionImage(
  tenant: string,
  productionId: number,
  imageUrl: string | null
) {
  const authResult = await requireAdminAccess();
  if (!authResult.ok) return { success: false as const, error: authResult.error };

  if (!Number.isInteger(productionId) || productionId <= 0) {
    return { success: false as const, error: "Invalid production ID." };
  }

  if (imageUrl && !/^https?:\/\//i.test(imageUrl.trim())) {
    return { success: false as const, error: "Image URL must start with http:// or https://." };
  }

  try {
    const pgRes = await updateProductionImagePg(tenant, productionId, imageUrl);
    if (!pgRes.success) return pgRes;
    revalidatePath(`/${tenant}`);
    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}/production`);
    revalidatePath(`/${tenant}/audition-form`);
    return { success: true as const, imageUrl: pgRes.imageUrl };
  } catch (error) {
    console.error("updateProductionImage error:", error);
    return { success: false as const, error: "Unexpected error updating show artwork." };
  }
}
