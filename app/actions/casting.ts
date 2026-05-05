"use server";

import { fetchBaserow, DB } from "@/app/lib/baserow";
import { revalidatePath } from "next/cache";

export async function generateCastingRows(productionId: number) {
  console.log(`Generating casting rows for Production ${productionId}...`);

  try {
    // 1. Fetch ALL Blueprint Roles using pagination
    let allRoles: any[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`, {}, {
        size: "200", 
        page: page.toString(),
        "user_field_names": "true" 
      });

      // Handle how fetchBaserow formats the return (it might return the array directly or a results object)
      const batch = Array.isArray(response) ? response : (response?.results || []);

      if (!batch || batch.length === 0) {
        hasNextPage = false;
        break;
      }

      allRoles = [...allRoles, ...batch];

      // If we got fewer than 200 items, we are on the last page
      if (batch.length < 200) {
        hasNextPage = false;
      } else {
        page++; // Queue up the next page
      }
    }

    if (!allRoles || allRoles.length === 0) {
      return { success: false, error: "No Blueprint Roles found for this production." };
    }

    // 2. Prepare the new rows payload
    const newRows = allRoles.map((role: any) => ({
      [DB.ASSIGNMENTS.FIELDS.PRODUCTION]: [productionId],
      [DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY]: [role.id],
      [DB.ASSIGNMENTS.FIELDS.SCENE_ASSIGNMENTS]: role['Active Scenes']?.map((s:any) => s.id) || [] 
    }));

    // 3. Batch POST the rows in chunks (Baserow's batch limit is also 200)
    const chunkSize = 200;
    for (let i = 0; i < newRows.length; i += chunkSize) {
      const chunk = newRows.slice(i, i + chunkSize);
      
      await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/batch/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: chunk })
      });
    }

    revalidatePath('/casting');
    return { success: true, count: newRows.length };

  } catch (error) {
    console.error("Casting Generation Error:", error);
    return { success: false, error: "An unexpected error occurred while communicating with Baserow." };
  }
}