// app/lib/actions.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getClassRoster, fetchBaserow, DB } from "@/app/lib/baserow";

// --- EXISTING ACTIONS ---

export async function fetchRosterAction(classId: string) {
  // This runs on the server, keeping your API tokens safe
  const roster = await getClassRoster(classId);
  return roster;
}

export async function switchProduction(formData: FormData) {
  const productionId = formData.get("productionId")?.toString();
  const redirectPath = formData.get("redirectPath")?.toString() || "/dashboard";

  if (productionId) {
    // Set the cookie for 30 days
    (await cookies()).set("active_production_id", productionId, {
      maxAge: 60 * 60 * 24 * 30, 
      path: "/",
    });
  }
  
  redirect(redirectPath);
}

// --- 🆕 NEW: PRODUCTION ANALYSIS ACTIONS ---

// Define the shape of the update object coming from the UI
type SceneLoadUpdate = {
  id: number;
  load: {
    music: number;
    dance: number;
    block: number;
  };
};

export async function updateSceneLoads(updates: SceneLoadUpdate[]) {
  const F = DB.SCENES.FIELDS;

  // Map updates to parallel PATCH requests
  const promises = updates.map(async (update) => {
    // 1. Map "Friendly" keys to "Baserow Field IDs"
    const body = {
      [F.MUSIC_LOAD]: update.load.music,
      [F.DANCE_LOAD]: update.load.dance,
      [F.BLOCKING_LOAD]: update.load.block,
    };

    // 2. Send PATCH to Baserow
    await fetchBaserow(`/database/rows/table/${DB.SCENES.ID}/${update.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  });

  // 3. Wait for all saves to complete
  await Promise.all(promises);

  // 4. Purge the cache for these pages so the UI updates immediately
  revalidatePath("/dashboard");
  revalidatePath("/analysis");

  return { success: true };
}