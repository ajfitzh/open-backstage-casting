"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getClassRoster, fetchBaserow, getActiveProduction } from "@/app/lib/baserow";
import { DB } from "@/app/lib/schema";

// --- HELPERS ---

// Converts decimal time (18.5) to HH:MM string ("18:30")
// Used to construct ISO strings for Baserow
const formatTimeHHMM = (decimal: number) => {
  const h = Math.floor(decimal);
  const m = Math.round((decimal % 1) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

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
  revalidatePath("/production");

  return { success: true };
}

// --- SHOW HUB STATUS ACTION ---

export async function updateSceneStatus(sceneId: number, field: 'music' | 'dance' | 'block', status: string) {
  const F = DB.SCENES.FIELDS;
  
  // Map "Traffic Light" names to Baserow Field IDs
  const fieldMap = {
    'music': F.MUSIC_STATUS,
    'dance': F.DANCE_STATUS,
    'block': F.BLOCK_STATUS // Matched to Schema
  };

  const targetField = fieldMap[field];
  
  await fetchBaserow(`/database/rows/table/${DB.SCENES.ID}/${sceneId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      [targetField]: status 
    }),
  });

  revalidatePath("/production");
}

// --- WORKFLOW OVERRIDE ACTION ---

export async function markStepComplete(stepKey: string) {
  const production = await getActiveProduction();
  if (!production) return;

  const keyMap: Record<string, string> = {
    'auditions': 'Auditions',
    'callbacks': 'Callbacks',
    'casting': 'Casting',
    'points': 'Calibration',
    'schedule': 'Scheduling'
  };
  
  const targetTag = keyMap[stepKey];
  if (!targetTag) return;

  const currentTags = production.workflowOverrides || []; 
  const currentValues = currentTags.map((t: any) => t.value);

  if (!currentValues.includes(targetTag)) {
    const newValues = [...currentValues, targetTag];

    await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/${production.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [DB.PRODUCTIONS.FIELDS.WORKFLOW_OVERRIDES]: newValues
      }),
    });
  }

  revalidatePath("/");
}

// --- SCHEDULING ACTIONS (PARENT-CHILD LOGIC) ---

export async function saveScheduleBatch(productionId: number, items: any[]) {
  // 1. Group items by Day to handle Parents
  // items.date is "YYYY-MM-DD"
  const itemsByDate: Record<string, any[]> = {};
  
  items.forEach(item => {
      if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
      itemsByDate[item.date].push(item);
  });

  const promises = Object.entries(itemsByDate).map(async ([date, dayItems]) => {
      
      // A. FIND OR CREATE PARENT EVENT ("The Container")
      // Logic: If no ID passed, we assume we need to create a new 
      // "Rehearsal Block" that spans the min/max time of these slots.
      
      let parentEventId = dayItems[0].existingParentEventId; 

      if (!parentEventId) {
          // Calculate container duration
          const minTime = Math.min(...dayItems.map((i:any) => i.startTime)); 
          const maxTime = Math.max(...dayItems.map((i:any) => i.startTime + (i.duration/60))); 
          
          // Construct Full ISO DateTimes for Baserow Date Fields
          const startDateTime = `${date}T${formatTimeHHMM(minTime)}:00`;
          const endDateTime = `${date}T${formatTimeHHMM(maxTime)}:00`;

          const parentRes = await fetchBaserow(`/database/rows/table/${DB.EVENTS.ID}/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  [DB.EVENTS.FIELDS.PRODUCTION]: [productionId],
                  [DB.EVENTS.FIELDS.DATE]: date,
                  [DB.EVENTS.FIELDS.START_TIME]: startDateTime,
                  [DB.EVENTS.FIELDS.END_TIME]: endDateTime,
                  [DB.EVENTS.FIELDS.EVENT_TYPE]: "Rehearsal"
              })
          });
          
          if (parentRes.ok) {
            const parentData = await parentRes.json();
            parentEventId = parentData.id;
          } else {
             console.error("Failed to create parent event:", await parentRes.text());
             return; // Stop if parent failed
          }
      }

      // B. CREATE THE SLOTS ("The 30-min Blocks")
      // These link to the Parent Event we just created
      if (parentEventId) {
        const slotPromises = dayItems.map(item => {
             const slotStartDateTime = `${date}T${formatTimeHHMM(item.startTime)}:00`;

             return fetchBaserow(`/database/rows/table/${DB.SLOTS.ID}/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    [DB.SLOTS.FIELDS.EVENT_LINK]: [parentEventId], // Link to Parent
                    [DB.SLOTS.FIELDS.SCENE]: [item.sceneId],       // Link to Scene
                    [DB.SLOTS.FIELDS.TRACK]: item.track,           // e.g. "Music"
                    [DB.SLOTS.FIELDS.START_TIME]: slotStartDateTime,
                    [DB.SLOTS.FIELDS.DURATION]: item.duration
                })
             });
        });
        await Promise.all(slotPromises);
      }
  });

  await Promise.all(promises);
  revalidatePath("/schedule");
  return { success: true };
}