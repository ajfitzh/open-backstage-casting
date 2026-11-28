// app/actions/committees.ts
"use server";

import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getOrganizationBySlugPg } from "@/app/lib/db/core-repo";
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedUser, requirePermission } from "@/app/lib/auth-guard";
import {
  addCommitteeVolunteerPg,
  deleteCommitteeVolunteerPg,
  saveCommitteeAssignmentsPg,
  submitCommitteeReportPg,
  updateCommitteeVolunteerPg,
} from "@/app/lib/db/operations-repo";

export async function submitCommitteeReport(tenant: string, data: any) {
  const authGuard = await requireAuthenticatedUser();
  if (!authGuard.ok) return { success: false, error: authGuard.error };

  try {
    return await submitCommitteeReportPg(tenant, data);
  } catch (error) {
    console.error("Report Submission Error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function saveCommitteeAssignments(
  tenant: string,
  phase: 'Pre-Show' | 'Show Week',
  assignments: Record<number, string>,
  chairs: Record<number, boolean>
) {
  const guard = await requirePermission(tenant, "manage_committees");
  if (!guard.ok) return { success: false, error: guard.error };

  if (process.env.ENABLE_DRY_RUN === "true") {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return { success: true };
  }

  try {
    const res = await saveCommitteeAssignmentsPg(tenant, phase, assignments, chairs);
    if (res.success) {
      revalidatePath('/[tenant]/(main)/(staff)/committees', 'page');
    }
    return res;
  } catch (error) {
    console.error("Committee Assignment Save Error:", error);
    return { success: false, error: "Failed to save committee assignments." };
  }
}

export async function addCommitteeVolunteer(
  tenant: string,
  data: { name: string; email: string; phone: string }
) {
  const guard = await requirePermission(tenant, "manage_committees");
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const res = await addCommitteeVolunteerPg(tenant, data);
    revalidatePath('/[tenant]/(main)/(staff)/committees', 'page');
    return res;
  } catch (error) {
    console.error("Add Committee Volunteer Error:", error);
    return { success: false, error: "Failed to add committee volunteer." };
  }
}

export async function updateCommitteeVolunteer(
  tenant: string,
  rowId: number,
  data: { name: string; email: string; phone: string }
) {
  const guard = await requirePermission(tenant, "manage_committees");
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const res = await updateCommitteeVolunteerPg(tenant, rowId, data);
    revalidatePath('/[tenant]/(main)/(staff)/committees', 'page');
    return res;
  } catch (error) {
    console.error("Update Committee Volunteer Error:", error);
    return { success: false, error: "Failed to update committee volunteer." };
  }
}

export async function deleteCommitteeVolunteer(tenant: string, rowId: number) {
  const guard = await requirePermission(tenant, "manage_committees");
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const res = await deleteCommitteeVolunteerPg(tenant, rowId);
    revalidatePath('/[tenant]/(main)/(staff)/committees', 'page');
    return res;
  } catch (error) {
    console.error("Delete Committee Volunteer Error:", error);
    return { success: false, error: "Failed to delete committee volunteer." };
  }
}

export async function saveCommitteeTargetsAction(
  tenant: string,
  productionId: number,
  targets: Record<string, number>
) {
  const guard = await requirePermission(tenant, "manage_committees");
  if (!guard.ok) return { success: false as const, error: guard.error };

  try {
    const org = await getOrganizationBySlugPg(tenant);
    if (!org) return { success: false as const, error: "Organization not found." };

    const cleanTargets: Record<string, number> = {};
    for (const [k, v] of Object.entries(targets)) {
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        cleanTargets[k] = Math.round(v);
      }
    }

    const currentSettings = (org.settings || {}) as Record<string, any>;
    const existingByShow = (currentSettings.committeeTargetsByShow || {}) as Record<
      string,
      Record<string, number>
    >;

    const db = getDb();
    await db
      .update(schema.organizations)
      .set({
        settings: {
          ...currentSettings,
          committeeTargetsByShow: {
            ...existingByShow,
            [String(productionId)]: cleanTargets,
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.organizations.id, org.id));

    return { success: true as const };
  } catch (error) {
    console.error("Save Committee Targets Error:", error);
    return { success: false as const, error: "Failed to save committee targets." };
  }
}

export async function saveVenueCostEstimatesAction(
  tenant: string,
  estimates: Record<number, number>
) {
  const guard = await requireAuthenticatedUser();
  if (!guard.ok) return { success: false as const, error: guard.error };

  try {
    const org = await getOrganizationBySlugPg(tenant);
    if (!org) return { success: false as const, error: "Organization not found." };

    const cleanEstimates: Record<string, number> = {};
    for (const [k, v] of Object.entries(estimates)) {
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        cleanEstimates[String(k)] = Math.round(v);
      }
    }

    const currentSettings = (org.settings || {}) as Record<string, any>;
    const db = getDb();
    await db
      .update(schema.organizations)
      .set({
        settings: {
          ...currentSettings,
          venueCostEstimates: cleanEstimates,
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.organizations.id, org.id));

    return { success: true as const };
  } catch (error) {
    console.error("Save Venue Cost Estimates Error:", error);
    return { success: false as const, error: "Failed to save venue cost estimates." };
  }
}
