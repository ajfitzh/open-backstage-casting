"use server";

import { fetchBaserow, DB } from "@/app/lib/baserow";
import { revalidatePath } from "next/cache";

export async function generateCastingRows(productionId: number) {
  console.log(`Generating casting rows for Production ${productionId}...`);

  try {
    const roles = await fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`, {}, {
      size: "200", 
      "user_field_names": "true" 
    });

    if (!roles || roles.length === 0) {
      return { success: false, error: "No Blueprint Roles found for this production." };
    }

    const newRows = roles.map((role: any) => ({
      [DB.ASSIGNMENTS.FIELDS.PRODUCTION]: [productionId],
      [DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY]: [role.id],
      [DB.ASSIGNMENTS.FIELDS.SCENE_ASSIGNMENTS]: role['Active Scenes']?.map((s:any) => s.id) || [] 
    }));

    await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/batch/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: newRows })
    });

    revalidatePath('/casting');
    return { success: true, count: newRows.length };

  } catch (error) {
    console.error("Casting Generation Error:", error);
    return { success: false, error: "An unexpected error occurred while communicating with Baserow." };
  }
}