"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAccess } from "@/app/lib/auth-guard";
import { invalidatePeopleCache } from "@/app/lib/baserow";
import {
  findDuplicatePeopleClustersPg,
  mergePeoplePg,
  searchPeopleForMergePg,
  type DuplicateCluster,
  type PersonMergeCandidate,
} from "@/app/lib/db/people-merge-repo";
import { arePeopleSafeToAutoMerge } from "@/app/lib/people-merge-helpers";

export async function getDuplicatePeopleClustersAction(tenant: string): Promise<{
  success: boolean;
  error?: string;
  clusters?: DuplicateCluster[];
}> {
  const auth = await requireAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const clusters = await findDuplicatePeopleClustersPg(tenant, 80);
    return { success: true, clusters };
  } catch (error) {
    console.error("getDuplicatePeopleClustersAction error:", error);
    return { success: false, error: "Failed to scan for duplicate people." };
  }
}

export async function searchPeopleForMergeAction(
  tenant: string,
  query: string
): Promise<{ success: boolean; error?: string; people?: PersonMergeCandidate[] }> {
  const auth = await requireAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const people = await searchPeopleForMergePg(tenant, query);
    return { success: true, people };
  } catch (error) {
    console.error("searchPeopleForMergeAction error:", error);
    return { success: false, error: "Failed to search people." };
  }
}

export async function mergePeopleAction(
  tenant: string,
  winnerId: number,
  loserId: number
) {
  const auth = await requireAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const res = await mergePeoplePg(tenant, winnerId, loserId);
    if (!res.success) return res;

    invalidatePeopleCache(tenant);
    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}`);
    revalidatePath(`/${tenant}/archive`);
    return res;
  } catch (error) {
    console.error("mergePeopleAction error:", error);
    return { success: false, error: "Unexpected error merging people." };
  }
}

export async function autoMergeSafeDuplicatesAction(tenant: string): Promise<{
  success: boolean;
  error?: string;
  mergedCount?: number;
}> {
  const auth = await requireAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const clusters = await findDuplicatePeopleClustersPg(tenant, 200);
    let mergedCount = 0;

    for (const cluster of clusters) {
      if (cluster.matchType !== "exact") continue;
      const winner =
        cluster.people.find((p) => p.id === cluster.recommendedWinnerId) || cluster.people[0];
      const safeLosers = cluster.people.filter(
        (p) => p.id !== winner.id && arePeopleSafeToAutoMerge(winner, p)
      );
      for (const loser of safeLosers) {
        const res = await mergePeoplePg(tenant, winner.id, loser.id);
        if (res.success) mergedCount++;
      }
    }

    invalidatePeopleCache(tenant);
    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}`);
    revalidatePath(`/${tenant}/archive`);
    return { success: true, mergedCount };
  } catch (error) {
    console.error("autoMergeSafeDuplicatesAction error:", error);
    return { success: false, error: "Failed to run safe auto-merge." };
  }
}
