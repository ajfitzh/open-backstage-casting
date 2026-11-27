// app/actions/casting.ts
"use server";

import { requirePermission } from "@/app/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { generateCastingRowsPg } from "@/app/lib/db/casting-repo";

export async function generateCastingRows(tenant: string, productionId: number) {
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const pgRes = await generateCastingRowsPg(tenant, productionId);
    if (pgRes.success) {
      revalidatePath('/[tenant]/(main)/(casting)/casting', 'page');
    }
    return pgRes;
  } catch (error) {
    console.error("Casting Generation Error:", error);
    return { success: false, error: "An unexpected error occurred while generating casting rows." };
  }
}
