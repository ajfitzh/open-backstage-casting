// app/actions/audition-panel.ts
"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/app/lib/auth-guard";
import { getUserProductionRole } from "@/app/lib/baserow";
import {
  bulkCreateAuditionSlotsPg,
  getAuditionDeckDataPg,
  saveAuditionVideoPg,
  saveGroupDanceVideoPg,
  saveJudgeBallotPg,
  updateCallbackStatusPg,
} from "@/app/lib/db/audition-panel-repo";
import type { AuditionRound, VideoKind } from "@/app/lib/audition-workflow-helpers";

export async function fetchAuditionDeckData(
  tenant: string,
  productionId: number,
  callbacksOnly = false
) {
  const guard = await requirePermission(tenant, "view_auditions", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };

  const data = await getAuditionDeckDataPg(tenant, productionId, { callbacksOnly });
  if (!data) return { success: false as const, error: "Organization not found." };

  return { success: true as const, ...data };
}

export async function saveJudgeBallotAction(
  tenant: string,
  productionId: number,
  auditionId: number,
  input: {
    round?: AuditionRound;
    judgeRoleOverride?: string;
    vocalScore?: number | null;
    actingScore?: number | null;
    danceScore?: number | null;
    stagePresenceScore?: number | null;
    callbackVote?: string | null;
    suggestedRoles?: string;
    notes?: string;
  }
) {
  const guard = await requirePermission(tenant, "view_auditions", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };

  let effectiveRole = input.judgeRoleOverride?.trim() || "";
  if (!effectiveRole && guard.user.id && !Number.isNaN(Number(guard.user.id))) {
    const prodRole = await getUserProductionRole(tenant, Number(guard.user.id), productionId);
    if (prodRole) effectiveRole = prodRole;
  }
  if (!effectiveRole) effectiveRole = guard.user.role || "Judge";

  const res = await saveJudgeBallotPg(
    tenant,
    productionId,
    auditionId,
    {
      email: guard.user.email,
      name: guard.user.name || guard.user.email,
      role: effectiveRole,
    },
    input
  );

  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/auditions`);
    revalidatePath(`/${tenant}/production/${productionId}/callbacks`);
    revalidatePath(`/${tenant}/production/${productionId}/casting`);
  }

  return res;
}

export async function saveAuditionVideoAction(
  tenant: string,
  productionId: number,
  auditionId: number,
  videoKind: VideoKind,
  videoUrl: string | null
) {
  const guard = await requirePermission(tenant, "view_auditions", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };

  const res = await saveAuditionVideoPg(tenant, auditionId, videoKind, videoUrl);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/auditions`);
    revalidatePath(`/${tenant}/production/${productionId}/callbacks`);
  }
  return res;
}

export async function saveGroupDanceVideoAction(
  tenant: string,
  productionId: number,
  auditionIds: number[],
  videoUrl: string | null
) {
  const guard = await requirePermission(tenant, "view_auditions", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };

  const res = await saveGroupDanceVideoPg(tenant, auditionIds, videoUrl);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/auditions`);
    revalidatePath(`/${tenant}/production/${productionId}/callbacks`);
  }
  return res;
}

export async function toggleCallbackSelectionAction(
  tenant: string,
  productionId: number,
  auditionId: number,
  isCalledBack: boolean,
  callbackGroup?: string
) {
  const guard = await requirePermission(tenant, "view_auditions", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };

  const res = await updateCallbackStatusPg(tenant, auditionId, isCalledBack, callbackGroup);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/auditions`);
    revalidatePath(`/${tenant}/production/${productionId}/callbacks`);
    revalidatePath(`/${tenant}/production/${productionId}/roster`);
  }
  return res;
}

export async function bulkCreateAuditionSlotsAction(
  tenant: string,
  productionId: number,
  slots: Array<{ timeLabel: string; dateTime: string; capacity: number }>
) {
  const guard = await requirePermission(tenant, "view_auditions", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };

  const res = await bulkCreateAuditionSlotsPg(tenant, productionId, slots);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/auditions`);
    revalidatePath(`/${tenant}/audition-form`);
  }
  return res;
}
