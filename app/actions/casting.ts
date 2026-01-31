"use server";

import { fetchBaserow, DB } from "@/app/lib/baserow";
import { revalidatePath } from "next/cache";

export async function generateCastingRows(productionId: number) {
  console.log(`Generating casting rows for Production ${productionId}...`);

  // 1. Fetch ALL Blueprint Roles
  // 🟢 SCHEMA MATCH: Using DB.BLUEPRINT_ROLES
  const roles = await fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`, {}, {
    size: "200", 
    "user_field_names": "true" 
  });

  if (!roles || roles.length === 0) throw new Error("No Blueprint Roles found!");

  // 2. Prepare the Batch Create requests
  const newRows = roles.map((role: any) => ({
    [DB.ASSIGNMENTS.FIELDS.PRODUCTION]: [productionId],
    
    // 🟢 SCHEMA MATCH: Linking to 'Performance Identity'
    [DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY]: [role.id],
    
    // 🟢 SCHEMA MATCH: Linking to 'Scene Assignments'
    // We grab the default scenes from the Blueprint's 'Active Scenes' field
    [DB.ASSIGNMENTS.FIELDS.SCENE_ASSIGNMENTS]: role['Active Scenes']?.map((s:any) => s.id) || [] 
  }));

  // 3. Send to Baserow (Batch create)
  await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/batch/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: newRows })
  });

  // 4. Refresh the UI
  revalidatePath('/casting');
  return { success: true, count: newRows.length };
}