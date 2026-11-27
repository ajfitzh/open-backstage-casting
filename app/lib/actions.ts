"use server";

import { signOut } from "@/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveTenant } from "@/app/lib/tenant-server";
import { requirePermission, requireStaffAccess } from "@/app/lib/auth-guard";
import { generateCastingRowsPg } from "@/app/lib/db/casting-repo";
import {
  clearCastingDataPg,
  getSeasonBoardPg,
  saveCastingGridPg,
  saveScheduleBatchPg,
  toggleWorkflowTagPg,
  updateSceneLoadsPg,
  updateSceneStatusPg,
} from "@/app/lib/db/operations-repo";
import {
  claimBountyPg,
  getClassRosterPg,
  submitProposalPg,
  updateApplicantStatusPg,
  updateClassSchedulePg,
} from "@/app/lib/db/wardrobe-academy-repo";

export async function handleLogout() {
  await signOut({ redirectTo: "/login" });
}

export async function getSeasonBoard(seasonId: string, explicitTenant?: string) {
  try {
    const tenant = await resolveTenant(explicitTenant);
    return (await getSeasonBoardPg(tenant, Number(seasonId))) ?? null;
  } catch (error) {
    console.error("Failed to load Season Board:", error);
    return null;
  }
}

// --- EDUCATION ACTIONS ---

export async function submitProposalAction(data: any, explicitTenant?: string) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const tenant = await resolveTenant(explicitTenant);
    const res = await submitProposalPg(tenant, data);
    if (res.success) revalidatePath(`/${tenant}/education/portal`);
    return res;
  } catch (error) {
    console.error("Failed to submit proposal:", error);
    return { success: false };
  }
}

export async function claimBountyAction(
  classId: number,
  teacherName: string,
  explicitTenant?: string
) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const tenant = await resolveTenant(explicitTenant);
    const res = await claimBountyPg(tenant, classId, teacherName);
    if (res.success) {
      revalidatePath(`/${tenant}/education/portal`);
      revalidatePath(`/${tenant}/education/proposals`);
    }
    return res;
  } catch (error) {
    console.error("Failed to claim bounty:", error);
    return { success: false };
  }
}

export async function updateApplicantStatus(
  personId: number,
  oldTags: string[],
  newTag: string,
  explicitTenant?: string
) {
  const tenant = await resolveTenant(explicitTenant);
  const guard = await requirePermission(tenant, "edit_compliance");
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const res = await updateApplicantStatusPg(tenant, personId, oldTags, newTag);
    if (res.success) revalidatePath(`/${tenant}/education/hiring`);
    return res;
  } catch (error) {
    console.error("Failed to update applicant status:", error);
    return { success: false };
  }
}

export async function fetchRosterAction(classId: number, explicitTenant?: string) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return [];

  try {
    const tenant = await resolveTenant(explicitTenant);
    const pgRoster = await getClassRosterPg(tenant, classId);
    if (!pgRoster) return [];
    return pgRoster
      .filter((r) => r.status !== "Instructor")
      .map((r) => ({
        id: r.id,
        name: r.name,
        age: r.age || "?",
        email: r.email,
        phone: r.phone,
      }));
  } catch (error) {
    console.error("[fetchRosterAction] Error:", error);
    return [];
  }
}

export async function updateClassSchedule(
  classId: number,
  payload: { day: string; time: string; location: string; status: string },
  explicitTenant?: string
) {
  const tenant = await resolveTenant(explicitTenant);
  const guard = await requirePermission(tenant, "edit_compliance");
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const res = await updateClassSchedulePg(tenant, classId, payload);
    if (res.success) {
      revalidatePath(`/${tenant}/education/planning`);
      revalidatePath(`/${tenant}/education`);
    }
    return res;
  } catch (error) {
    console.error("Failed to update class schedule:", error);
    return { success: false };
  }
}

// --- WORKFLOW ACTIONS ---

export async function toggleWorkflowTag(
  productionId: number,
  tagKey: string,
  explicitTenant?: string
) {
  if (!productionId) return;

  const tenant = await resolveTenant(explicitTenant);
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return;

  const keyMap: Record<string, string> = {
    auditions: "Auditions",
    callbacks: "Callbacks",
    casting: "Casting",
    first_reh: "FirstRehearsal",
    superSat: "SuperSaturday",
    tech_mon: "Tech_Mon",
    tech_tue: "Tech_Tue",
    tech_wed: "Tech_Wed",
    tech_thu: "Tech_Thu",
    tech_fri: "Tech_Fri",
    weekend1: "ShowWeekend1",
    weekend2: "ShowWeekend2",
  };

  const targetTag = keyMap[tagKey] || tagKey;

  try {
    await toggleWorkflowTagPg(tenant, productionId, targetTag);
    revalidatePath(`/${tenant}`);
    revalidatePath("/");
  } catch (error) {
    console.error("Toggle Failed:", error);
  }
}

export async function switchProduction(formData: FormData) {
  const productionId = formData.get("productionId")?.toString();
  const redirectPath = formData.get("redirectPath")?.toString() || "/";

  if (productionId) {
    (await cookies()).set("active_production_id", productionId, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
  redirect(redirectPath);
}

export async function markStepComplete(
  productionId: number,
  stepKey: string,
  explicitTenant?: string
) {
  if (!productionId) return;
  await toggleWorkflowTag(productionId, stepKey, explicitTenant);
}

// --- SCENE ANALYSIS ACTIONS ---

export async function updateSceneLoads(
  updates: { id: number; load: { music: number; dance: number; block: number } }[],
  explicitTenant?: string
) {
  const tenant = await resolveTenant(explicitTenant);
  const guard = await requirePermission(tenant, "manage_casting");
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const res = await updateSceneLoadsPg(tenant, updates);
    if (res.success) revalidatePath(`/${tenant}/production`);
    return res;
  } catch (error) {
    console.error("Failed to update scene loads:", error);
    return { success: false };
  }
}

export async function updateSceneStatus(
  sceneId: number,
  field: "music" | "dance" | "block",
  status: string,
  explicitTenant?: string
) {
  const tenant = await resolveTenant(explicitTenant);
  const guard = await requirePermission(tenant, "manage_casting");
  if (!guard.ok) return;

  try {
    await updateSceneStatusPg(tenant, sceneId, field, status);
    revalidatePath(`/${tenant}/production`);
  } catch (error) {
    console.error("Failed to update scene status:", error);
  }
}

// --- SCHEDULING ACTIONS ---

export async function saveScheduleBatch(
  productionId: number,
  items: any[],
  explicitTenant?: string
) {
  const tenant = await resolveTenant(explicitTenant);
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const res = await saveScheduleBatchPg(tenant, productionId, items);
    if (res.success) revalidatePath(`/${tenant}/production/${productionId}/schedule`);
    return res;
  } catch (error) {
    console.error("Failed to save schedule batch:", error);
    return { success: false };
  }
}

// --- CASTING ACTIONS ---

export async function generateCastingRows(tenant: string, productionId: number) {
  const resolvedTenant = await resolveTenant(tenant);
  const guard = await requirePermission(resolvedTenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const res = await generateCastingRowsPg(resolvedTenant, productionId);
    if (res.success) revalidatePath(`/${resolvedTenant}/production/${productionId}/casting`);
    return res;
  } catch (error) {
    console.error("Failed to generate casting rows:", error);
    return { success: false, error: "Failed to generate casting rows." };
  }
}

export async function saveCastingGrid(
  tenant: string,
  productionId: number,
  actorChanges: any[],
  sceneChanges: any[],
  deletedRowIds: number[] = [],
  createdRows: any[] = []
) {
  const resolvedTenant = await resolveTenant(tenant);
  const guard = await requirePermission(resolvedTenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const res = await saveCastingGridPg(
      resolvedTenant,
      productionId,
      actorChanges,
      sceneChanges,
      deletedRowIds,
      createdRows
    );
    if (res.success) revalidatePath(`/${resolvedTenant}/production/${productionId}/casting`);
    return res;
  } catch (error) {
    console.error("Failed to save casting grid:", error);
    return { success: false, error: "Failed to save casting grid." };
  }
}

export async function clearCastingData(productionId: number, explicitTenant?: string) {
  const tenant = await resolveTenant(explicitTenant);
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const res = await clearCastingDataPg(tenant, productionId);
    if (res.success) revalidatePath(`/${tenant}/production/${productionId}/casting`);
    return res;
  } catch (error) {
    console.error("Failed to clear casting data:", error);
    return { success: false, error: "Failed to clear casting data." };
  }
}
