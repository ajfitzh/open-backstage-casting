"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { 
  getClassRoster, 
  fetchBaserow, 
  getActiveProduction, 
  submitClassProposal, 
  claimBounty,
  getSeasons // <--- Ensure this is exported from baserow.ts
} from "@/app/lib/baserow";
import { DB } from "@/app/lib/schema";

// --- HELPERS ---

export async function getSeasonBoard(seasonId: string) {
  // 1. Fetch Season Metadata DIRECTLY (No more fetch errors)
  // Instead of fetchBaserow, we use the direct accessor if available, 
  // or handle the fetch safely without throwing on 404s immediately.
  
  try {
    const seasonRes = await fetchBaserow(
      `/database/rows/table/${DB.SEASONS.ID}/${seasonId}/?user_field_names=true`
    );
    
    if (!seasonRes || seasonRes.error) {
      console.error("Season Fetch Error:", seasonRes);
      return null;
    }
    const season = seasonRes; // fetchBaserow already returns JSON

    // 2. Fetch the "Talent Pool" (Applications linked to this Season)
    const staffRes = await fetchBaserow(
      `/database/rows/table/${DB.STAFF_INTEREST.ID}/?user_field_names=true&filter__field_${DB.STAFF_INTEREST.FIELDS.SEASON}__link_row_has=${seasonId}`
    );
    const talentPool = Array.isArray(staffRes) ? staffRes : (staffRes.results || []);

    // 3. Fetch the Productions (The Slots linked to this Season)
    const prodRes = await fetchBaserow(
      `/database/rows/table/${DB.PRODUCTIONS.ID}/?user_field_names=true&filter__field_${DB.PRODUCTIONS.FIELDS.SEASON_LINKED}__link_row_has=${seasonId}`
    );
    const productions = Array.isArray(prodRes) ? prodRes : (prodRes.results || []);

    // 4. Return the combined "War Room" object
    return {
      season: season,
      talentPool: talentPool,
      productions: productions
    };
  } catch (error) {
    console.error("Failed to load Season Board:", error);
    return null;
  }
}

// Converts decimal time (18.5) to HH:MM string ("18:30")
// Used to construct ISO strings for Baserow
const formatTimeHHMM = (decimal: number) => {
  const h = Math.floor(decimal);
  const m = Math.round((decimal % 1) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// --- EDUCATION ACTIONS ---

export async function submitProposalAction(data: any) {
  await submitClassProposal(data);
  revalidatePath("/education/portal");
}

export async function claimBountyAction(classId: number, teacherName: string) {
  await claimBounty(classId, teacherName);
  revalidatePath("/education/portal");
}

export async function fetchRosterAction(classId: string) {
  const roster = await getClassRoster(classId);
  return roster;
}

export async function updateClassSchedule(
  classId: number, 
  payload: { day: string; time: string; location: string; status: string }
) {
  const F = DB.CLASSES.FIELDS;
   
  await fetchBaserow(`/database/rows/table/${DB.CLASSES.ID}/${classId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      [F.DAY]: payload.day,
      [F.TIME_SLOT]: payload.time,
      [F.LOCATION]: payload.location,
      [F.STATUS]: payload.status 
    })
  });
   
  revalidatePath("/education/planning");
  revalidatePath("/education"); 
}
// app/lib/actions.ts

// ... (keep your existing imports and markStepComplete function) ...

export async function toggleWorkflowTag(productionId: number, tagKey: string) {
  if (!productionId) return;

  // Map friendly keys to DB values
  const keyMap: Record<string, string> = {
    'WeeklyReports': 'WeeklyReports',
    'WeeklySchedule': 'WeeklySchedule',
    'ShowWeekend1': 'ShowWeekend1', 
    'ShowWeekend2': 'ShowWeekend2',
  };
  
  const targetTag = keyMap[tagKey] || tagKey; // Fallback to raw key if not in map

  try {
    // 1. Fetch FRESH data
    // We use user_field_names=true to make reading the array easier
    const freshRow = await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/${productionId}/?user_field_names=true`);
    
    if (!freshRow || freshRow.error) {
        console.error("Fetch failed in toggleWorkflowTag", freshRow);
        throw new Error("Fetch failed");
    }

    // 2. Get current tags (Baserow returns objects like [{id: 1, value: "Auditions"}])
    const currentTags = freshRow[DB.PRODUCTIONS.FIELDS.WORKFLOW_OVERRIDES] || [];
    const currentValues = currentTags.map((t: any) => t.value);

    let newValues;
    
    // 3. TOGGLE LOGIC
    if (currentValues.includes(targetTag)) {
       // Remove it
       newValues = currentValues.filter((v: string) => v !== targetTag);
    } else {
       // Add it
       newValues = [...currentValues, targetTag];
    }

    // 4. Save back to Baserow
    await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/${productionId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [DB.PRODUCTIONS.FIELDS.WORKFLOW_OVERRIDES]: newValues
      }),
    });
    
    revalidatePath("/");
    revalidatePath("/dashboard");
    
  } catch (e) {
      console.error("Toggle Failed:", e);
  }
}
// --- PRODUCTION MANAGEMENT ACTIONS ---

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

export async function markStepComplete(productionId: number, stepKey: string) {
  if (!productionId) return;

const keyMap: Record<string, string> = {
    // Standard Phases
    'auditions': 'Auditions',
    'callbacks': 'Callbacks',
    'casting': 'Casting',
    'points': 'Calibration',
    'schedule': 'Scheduling',
    
    // New Phases
    'rehearsals': 'Rehearsals',
    'superSat': 'SuperSaturday',      // <--- Matches Baserow Option
    'tech': 'Tech Week',
    'weekend1': 'ShowWeekend1',
    'weekend2': 'ShowWeekend2',
    
    // Weekly Tasks
    'WeeklyReports': 'WeeklyReports',
    'WeeklySchedule': 'WeeklySchedule'
  };
  
  const targetTag = keyMap[stepKey];
  if (!targetTag) return;

  try {
    const freshRow = await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/${productionId}/?user_field_names=true`);
    
    if (!freshRow || freshRow.error) {
        throw new Error("Could not fetch fresh production data");
    }

    const currentTags = freshRow[DB.PRODUCTIONS.FIELDS.WORKFLOW_OVERRIDES] || [];
    const currentValues = currentTags.map((t: any) => t.value);

    // Append only if unique
    if (!currentValues.includes(targetTag)) {
      const newValues = [...currentValues, targetTag];

      await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/${productionId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [DB.PRODUCTIONS.FIELDS.WORKFLOW_OVERRIDES]: newValues
        }),
      });
      
      revalidatePath("/");
      revalidatePath("/dashboard");
    }
  } catch (e) {
      console.error("Workflow Update Failed:", e);
  }
}

// --- SCENE ANALYSIS ACTIONS ---

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

export async function updateSceneStatus(sceneId: number, field: 'music' | 'dance' | 'block', status: string) {
  const F = DB.SCENES.FIELDS;
  
  const fieldMap = {
    'music': F.MUSIC_STATUS,
    'dance': F.DANCE_STATUS,
    'block': F.BLOCKING_STATUS 
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

// --- SCHEDULING ALGORITHM ACTIONS ---

export async function saveScheduleBatch(productionId: number, items: any[]) {
  // 1. Group items by Date to handle Parent Containers
  const itemsByDate: Record<string, any[]> = {};
  
  items.forEach(item => {
      // Ensure we have a valid date string (YYYY-MM-DD)
      if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
      itemsByDate[item.date].push(item);
  });

  const promises = Object.entries(itemsByDate).map(async ([date, dayItems]) => {
      
      // A. FIND OR CREATE PARENT EVENT ("The Container")
      let parentEventId = dayItems[0].existingParentEventId; 

      if (!parentEventId) {
          // Calculate container duration
          const minTime = Math.min(...dayItems.map((i:any) => i.startTime)); 
          // End time is start + duration (converted from minutes to decimal hours if needed)
          // Assuming i.duration is in minutes based on (i.duration/60) usage below
          const maxTime = Math.max(...dayItems.map((i:any) => i.startTime + (i.duration/60))); 
          
          const startDateTime = `${date}T${formatTimeHHMM(minTime)}:00`;
          const endDateTime = `${date}T${formatTimeHHMM(maxTime)}:00`;

          const parentRes = await fetchBaserow(`/database/rows/table/${DB.EVENTS.ID}/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  [DB.EVENTS.FIELDS.PRODUCTION]: [productionId],
                  [DB.EVENTS.FIELDS.EVENT_DATE]: date,
                  [DB.EVENTS.FIELDS.START_TIME]: startDateTime,
                  [DB.EVENTS.FIELDS.END_TIME]: endDateTime,
                  [DB.EVENTS.FIELDS.EVENT_TYPE]: "Rehearsal" // Default type
              })
          });
          
          // Fixed: fetchBaserow returns the object directly, not a Response object we need to await .json() on
          // IF fetchBaserow returns a plain object (which your earlier code implied):
          if (parentRes && !parentRes.error) {
            parentEventId = parentRes.id;
          } else {
             console.error("Failed to create parent event:", parentRes);
             return; 
          }
      }

      // B. CREATE THE SLOTS ("The 30-min Blocks")
      if (parentEventId) {
        // FIXED: Use DB.SCHEDULE_SLOTS
        const SLOT_DB = DB.SCHEDULE_SLOTS; 
        
        const slotPromises = dayItems.map(item => {
             const slotStartDateTime = `${date}T${formatTimeHHMM(item.startTime)}:00`;

             return fetchBaserow(`/database/rows/table/${SLOT_DB.ID}/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    [SLOT_DB.FIELDS.EVENT_LINK]: [parentEventId], 
                    [SLOT_DB.FIELDS.SCENE]: [item.sceneId],       
                    [SLOT_DB.FIELDS.TRACK]: item.track,           
                    [SLOT_DB.FIELDS.START_TIME]: slotStartDateTime,
                    [SLOT_DB.FIELDS.DURATION]: item.duration
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