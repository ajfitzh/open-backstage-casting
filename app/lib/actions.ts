// app/lib/actions.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
// 1. Added getActiveProduction to imports so we can find the current show
import { getClassRoster, fetchBaserow, DB, getActiveProduction } from "@/app/lib/baserow";

// --- EXISTING ACTIONS ---

export async function fetchRosterAction(classId: string) {
  const roster = await getClassRoster(classId);
  return roster;
}

export async function switchProduction(formData: FormData) {
  const productionId = formData.get("productionId")?.toString();
  const redirectPath = formData.get("redirectPath")?.toString() || "/dashboard";

  if (productionId) {
    (await cookies()).set("active_production_id", productionId, {
      maxAge: 60 * 60 * 24 * 30, 
      path: "/",
    });
  }
  
  redirect(redirectPath);
}

// --- PRODUCTION ANALYSIS ACTIONS ---

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

  const promises = updates.map(async (update) => {
    const body = {
      [F.MUSIC_LOAD]: update.load.music,
      [F.DANCE_LOAD]: update.load.dance,
      [F.BLOCKING_LOAD]: update.load.block,
    };

    await fetchBaserow(`/database/rows/table/${DB.SCENES.ID}/${update.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  });

  await Promise.all(promises);

  revalidatePath("/dashboard");
  revalidatePath("/analysis");

  return { success: true };
}

// --- 🆕 NEW: WORKFLOW OVERRIDE ACTION ---

export async function markStepComplete(stepKey: string) {
  // 1. Get the Active Production to find its ID and current tags
  const production = await getActiveProduction();
  if (!production) return;

  // 2. Map the "stepKey" (e.g. 'auditions') to the Baserow Option Name
  // These MUST match the options you created in Baserow exactly (Case Sensitive)
  const keyMap: Record<string, string> = {
    'auditions': 'Auditions',
    'callbacks': 'Callbacks',
    'casting': 'Casting',
    'points': 'Calibration',
    'schedule': 'Scheduling'
  };
  
  const targetTag = keyMap[stepKey];
  if (!targetTag) return;

  // 3. Get current tags. 
  // Baserow returns Multi-Select as an array of objects: [{id: 1, value: "Auditions", color: "blue"}]
  // We need to map them to just the IDs or Values to update it. Sending Values is safer if IDs change.
  const currentTags = production.workflowOverrides || []; 
  const currentValues = currentTags.map((t: any) => t.value);

  // 4. Add the new tag if it's not there
  if (!currentValues.includes(targetTag)) {
    const newValues = [...currentValues, targetTag];

    // 5. PATCH Baserow
    await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/${production.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Make sure this ID matches what you added to schema.ts
        [DB.PRODUCTIONS.FIELDS.WORKFLOW_OVERRIDES]: newValues
      }),
    });
  }

  // 6. Refresh the dashboard so the checkmark appears immediately
  revalidatePath("/");
}