// app/actions/family.ts
"use server";

import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getOrganizationBySlugPg } from "@/app/lib/db/core-repo";
import { requireAuthenticatedUser } from "@/app/lib/auth-guard";
import {
  getFamilyMembersPg,
  updateAuditionDetailsPg,
  updateStudentMasterProfilePg,
} from "@/app/lib/db/casting-repo";

// Fetch the existing audition record for editing
export async function getStudentAuditionForEdit(
  tenant: string,
  studentId: number,
  productionId: number
) {
  const guard = await requireAuthenticatedUser();
  if (!guard.ok) return null;

  const org = await getOrganizationBySlugPg(tenant);
  if (!org) return null;

  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.auditions)
    .where(
      and(
        eq(schema.auditions.organizationId, org.id),
        eq(schema.auditions.performerId, studentId),
        eq(schema.auditions.productionId, productionId)
      )
    )
    .limit(1);

  return row ?? null;
}

// Save the updated details
export async function updateAuditionDetails(tenant: string, auditionId: number, updateData: any) {
  const guard = await requireAuthenticatedUser();
  if (!guard.ok) return { success: false, error: guard.error };

  return await updateAuditionDetailsPg(tenant, auditionId, updateData);
}

// Fetch all people tied to the parent's email
export async function getFamilyMembers(tenant: string, email: string) {
  try {
    const pgMembers = await getFamilyMembersPg(tenant, email);
    return pgMembers ?? [];
  } catch (error) {
    console.error("Failed to fetch family:", error);
    return [];
  }
}

// Save updates for a specific student's master profile
export async function updateStudentMasterProfile(tenant: string, personId: number, data: any) {
  try {
    return await updateStudentMasterProfilePg(tenant, personId, data);
  } catch (error) {
    console.error("Profile Save Error:", error);
    return { success: false, error: "Failed to connect to the database." };
  }
}
