"use server";

import { fetchBaserow, DB } from "@/app/lib/baserow";
import { revalidatePath } from "next/cache";

export async function generateCastingRows(productionId: number) {
  console.log(`Generating casting rows for Production ${productionId}...`);

  // 1. Fetch ALL Blueprint Roles (e.g. Ariel, Flounder, Ensemble)
  // You might want to filter this by "Department = Cast" if you have crew roles mixed in
  const roles = await fetchBaserow(`/database/rows/table/${DB.ROLES.ID}/`, {}, {
    size: "200", // Ensure we get them all
    // Optional: Add filter if you only want Cast roles
    // [`filter__${DB.ROLES.FIELDS.DEPARTMENT}__equal`]: 'Cast' 
  });

  if (!roles || roles.length === 0) throw new Error("No Roles found in Blueprint!");

  // 2. Prepare the Batch Create requests
  // Baserow allows batch creating rows. We'll link the Role + The Production.
  // We also PRE-FILL the scenes from the Role's default link!
  const newRows = roles.map((role: any) => ({
    [DB.ASSIGNMENTS.FIELDS.PRODUCTION]: [productionId],
    [DB.ASSIGNMENTS.FIELDS.ROLE]: [role.id],
    // Auto-fill scenes from the Role's "Default Scenes" field if it exists
    [DB.ASSIGNMENTS.FIELDS.SCENES]: role[DB.ROLES.FIELDS.DEFAULT_SCENES] || [] 
  }));

  // 3. Send to Baserow (Batch create)
  // Baserow API limits batch size, so safe to do chunks if you have >100 roles.
  // Assuming <100 roles for now:
  await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/batch/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: newRows })
  });

  // 4. Refresh the UI
  revalidatePath('/casting');
  return { success: true, count: newRows.length };
}