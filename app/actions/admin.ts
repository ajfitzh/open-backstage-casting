"use server";

import { revalidatePath } from "next/cache";
import { fetchBaserow, getDB, getUserProfile } from "@/app/lib/baserow";
import { getTenantTableConfig } from "@/app/lib/tenant-config";
import { requireAdminAccess, requireAuthenticatedUser } from "@/app/lib/auth-guard";
import { ASSIGNABLE_GLOBAL_ROLES } from "@/app/lib/permissions";

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
