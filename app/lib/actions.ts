"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { 
  getClassRoster, 
  fetchBaserow, 
  getSeasons, 
  submitClassProposal, 
  claimBounty
} from "@/app/lib/baserow";
import { DB } from "@/app/lib/schema";

// --- HELPERS ---

export async function getSeasonBoard(seasonId: string) {
  try {
    const seasonRes = await fetchBaserow(
      `/database/rows/table/${DB.SEASONS.ID}/${seasonId}/?user_field_names=true`
    );
    
    if (!seasonRes || seasonRes.error) {
      console.error("Season Fetch Error:", seasonRes);
      return null;
    }

    const staffRes = await fetchBaserow(
      `/database/rows/table/${DB.STAFF_INTEREST.ID}/?user_field_names=true&filter__field_${DB.STAFF_INTEREST.FIELDS.SEASON}__link_row_has=${seasonId}`
    );
    const talentPool = Array.isArray(staffRes) ? staffRes : (staffRes.results || []);

    const prodRes = await fetchBaserow(
      `/database/rows/table/${DB.PRODUCTIONS.ID}/?user_field_names=true&filter__field_${DB.PRODUCTIONS.FIELDS.SEASON_LINKED}__link_row_has=${seasonId}`
    );
    const productions = Array.isArray(prodRes) ? prodRes : (prodRes.results || []);

    return {
      season: seasonRes,
      talentPool: talentPool,
      productions: productions
    };
  } catch (error) {
    console.error("Failed to load Season Board:", error);
    return null;
  }
}

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
  return await getClassRoster(classId);
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

// --- WORKFLOW ACTIONS ---

export async function toggleWorkflowTag(productionId: number, tagKey: string) {
  if (!productionId) return;

  const keyMap: Record<string, string> = {
    'auditions': 'Auditions',
    'callbacks': 'Callbacks',
    'casting': 'Casting',
    'first_reh': 'FirstRehearsal',
    'superSat': 'SuperSaturday',
    'tech_mon': 'Tech_Mon',
    'tech_tue': 'Tech_Tue',
    'tech_wed': 'Tech_Wed',
    'tech_thu': 'Tech_Thu',
    'tech_fri': 'Tech_Fri',
    'weekend1': 'ShowWeekend1',
    'weekend2': 'ShowWeekend2',
  };
  
  const targetTag = keyMap[tagKey] || tagKey;

  try {
    const freshRow = await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/${productionId}/?user_field_names=true`);
    if (!freshRow || freshRow.error) throw new Error("Fetch failed");

    const currentTags = freshRow[DB.PRODUCTIONS.FIELDS.WORKFLOW_OVERRIDES] || [];
    const currentValues = currentTags.map((t: any) => t.value);

    const newValues = currentValues.includes(targetTag)
      ? currentValues.filter((v: string) => v !== targetTag)
      : [...currentValues, targetTag];

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
  await toggleWorkflowTag(productionId, stepKey); 
}

// --- SCENE ANALYSIS ACTIONS ---

type SceneLoadUpdate = {
  id: number;
  load: { music: number; dance: number; block: number; };
};

export async function updateSceneLoads(updates: SceneLoadUpdate[]) {
  const F = DB.SCENES.FIELDS;
  const promises = updates.map(async (update) => {
    await fetchBaserow(`/database/rows/table/${DB.SCENES.ID}/${update.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [F.MUSIC_LOAD]: update.load.music,
        [F.DANCE_LOAD]: update.load.dance,
        [F.BLOCKING_LOAD]: update.load.block,
      }),
    });
  });
  await Promise.all(promises);
  revalidatePath("/analysis");
  return { success: true };
}

export async function updateSceneStatus(sceneId: number, field: 'music' | 'dance' | 'block', status: string) {
  const F = DB.SCENES.FIELDS;
  const fieldMap = {
    'music': F.MUSIC_STATUS,
    'dance': F.DANCE_STATUS,
    'block': F.BLOCKING_STATUS 
  };
  await fetchBaserow(`/database/rows/table/${DB.SCENES.ID}/${sceneId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [fieldMap[field]]: status }),
  });
  revalidatePath("/production");
}

// --- SCHEDULING ACTIONS ---

export async function saveScheduleBatch(productionId: number, items: any[]) {
  const itemsByDate: Record<string, any[]> = {};
  items.forEach(item => {
      if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
      itemsByDate[item.date].push(item);
  });

  const promises = Object.entries(itemsByDate).map(async ([date, dayItems]) => {
      let parentEventId = dayItems[0].existingParentEventId; 

      if (!parentEventId) {
          const minTime = Math.min(...dayItems.map((i:any) => i.startTime)); 
          const maxTime = Math.max(...dayItems.map((i:any) => i.startTime + (i.duration/60))); 
          
          const parentRes = await fetchBaserow(`/database/rows/table/${DB.EVENTS.ID}/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  [DB.EVENTS.FIELDS.PRODUCTION]: [productionId],
                  [DB.EVENTS.FIELDS.EVENT_DATE]: date,
                  [DB.EVENTS.FIELDS.START_TIME]: `${date}T${formatTimeHHMM(minTime)}:00`,
                  [DB.EVENTS.FIELDS.END_TIME]: `${date}T${formatTimeHHMM(maxTime)}:00`,
                  [DB.EVENTS.FIELDS.EVENT_TYPE]: "Rehearsal" 
              })
          });
          if (parentRes && !parentRes.error) parentEventId = parentRes.id;
      }

      if (parentEventId) {
        const SLOT_DB = DB.SCHEDULE_SLOTS; 
        const slotPromises = dayItems.map(item => {
             return fetchBaserow(`/database/rows/table/${SLOT_DB.ID}/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    [SLOT_DB.FIELDS.EVENT_LINK]: [parentEventId], 
                    [SLOT_DB.FIELDS.SCENE]: [item.sceneId],       
                    [SLOT_DB.FIELDS.TRACK]: item.track,           
                    [SLOT_DB.FIELDS.START_TIME]: `${date}T${formatTimeHHMM(item.startTime)}:00`,
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

// --- CASTING ACTIONS (FIXED) ---

// 1. TOGGLE CHICLET
export async function toggleSceneAssignment(
  studentId: number, sceneId: number, productionId: number, isActive: boolean
) {
  const TABLE_ID = DB.SCENE_ASSIGNMENTS.ID;
  const F = DB.SCENE_ASSIGNMENTS.FIELDS;

  if (isActive) {
    // CREATE (Double Prefix Removed ✅)
    await fetchBaserow(`/database/rows/table/${TABLE_ID}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [F.PERSON]: [studentId],      
        [F.SCENE]: [sceneId],        
        [F.PRODUCTION]: [productionId],
        [F.SLOT_TYPE]: 3009 
      })
    });
  } else {
    // DELETE
    const existing = await fetchBaserow(`/database/rows/table/${TABLE_ID}/`, {}, {
      filter_type: "AND",
      [`filter__${F.PERSON}__link_row_has`]: studentId,
      [`filter__${F.SCENE}__link_row_has`]: sceneId,
      [`filter__${F.PRODUCTION}__link_row_has`]: productionId
    });

    if (Array.isArray(existing) && existing.length > 0) {
      await fetchBaserow(`/database/rows/table/${TABLE_ID}/${existing[0].id}/`, { method: "DELETE" });
    }
  }
  revalidatePath("/casting");
}

// 2. AUTO-ASSIGN SCENES (The "Big Button")
export async function initializeSceneAssignments(productionId: number) {
  // A. Fetch Blueprint
  const blueprintRes = await fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`, {}, { size: "200" });
  
  // B. Fetch Cast
  const castRes = await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`, {}, {
    [`filter__${DB.ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: productionId,
    size: "200"
  });

  if (!Array.isArray(blueprintRes) || !Array.isArray(castRes)) return { success: false, count: 0 };

  const blueprintMap = new Map();
  blueprintRes.forEach((role: any) => {
    // Get scene IDs linked in Blueprint
    const sceneIds = role[DB.BLUEPRINT_ROLES.FIELDS.ACTIVE_SCENES]?.map((s: any) => s.id) || [];
    blueprintMap.set(role.id, sceneIds);
  });

  const operations = [];
  for (const assignment of castRes) {
    const roleId = assignment[DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY]?.[0]?.id;
    const studentId = assignment[DB.ASSIGNMENTS.FIELDS.PERSON]?.[0]?.id;

    if (roleId && studentId && blueprintMap.has(roleId)) {
      const sceneIds = blueprintMap.get(roleId);
      for (const sceneId of sceneIds) {
        operations.push({
          [DB.SCENE_ASSIGNMENTS.FIELDS.PERSON]: [studentId],
          [DB.SCENE_ASSIGNMENTS.FIELDS.SCENE]: [sceneId],
          [DB.SCENE_ASSIGNMENTS.FIELDS.PRODUCTION]: [productionId],
          [DB.SCENE_ASSIGNMENTS.FIELDS.SLOT_TYPE]: 3007 // "Lead"
        });
      }
    }
  }

  let count = 0;
  for (const op of operations) {
    await fetchBaserow(`/database/rows/table/${DB.SCENE_ASSIGNMENTS.ID}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(op)
    });
    count++;
  }

  revalidatePath("/casting");
  return { success: true, count };
}

// 3. GENERATE EMPTY ROWS (Initialize Grid)
export async function generateCastingRows(productionId: number) {
  const blueprintRoles = await fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`, {}, { size: "200" });
  if (!Array.isArray(blueprintRoles)) return { success: false };

  const existing = await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`, {}, {
    [`filter__${DB.ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: productionId,
    size: "200"
  });
  
  const existingRoleIds = new Set(
    Array.isArray(existing) 
      ? existing.map((r: any) => r[DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY]?.[0]?.id) 
      : []
  );

  let count = 0;
  for (const role of blueprintRoles) {
    if (!existingRoleIds.has(role.id)) {
      await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [DB.ASSIGNMENTS.FIELDS.PRODUCTION]: [productionId],
          [DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY]: [role.id]
        })
      });
      count++;
    }
  }

  revalidatePath("/casting");
  return { success: true, count };
}

// 4. CLEAR CASTING DATA
export async function clearCastingData(productionId: number) {
  const sceneAssigns = await fetchBaserow(`/database/rows/table/${DB.SCENE_ASSIGNMENTS.ID}/`, {}, {
    [`filter__${DB.SCENE_ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: productionId,
    size: "200"
  });

  if (Array.isArray(sceneAssigns)) {
    for (const row of sceneAssigns) {
      await fetchBaserow(`/database/rows/table/${DB.SCENE_ASSIGNMENTS.ID}/${row.id}/`, { method: "DELETE" });
    }
  }

  const castAssigns = await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`, {}, {
    [`filter__${DB.ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: productionId,
    size: "200"
  });

  if (Array.isArray(castAssigns)) {
    for (const row of castAssigns) {
      await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/${row.id}/`, { method: "DELETE" });
    }
  }

  revalidatePath("/casting");
  return { success: true };
}
// app/lib/actions.ts

// ... (previous imports)

// 🟢 NEW: BULK SAVE ACTION
export async function syncCastingChanges(productionId: number, changes: any[]) {
  const TABLE_ID = DB.SCENE_ASSIGNMENTS.ID;
  const F = DB.SCENE_ASSIGNMENTS.FIELDS;

  // We process sequentially to avoid rate limits, but you could Promise.all() small batches
  for (const change of changes) {
      if (!change.studentId) continue;

      // 1. Handle ADDITIONS
      for (const sceneId of change.addedSceneIds) {
          await fetchBaserow(`/database/rows/table/${TABLE_ID}/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  [F.PERSON]: [change.studentId],
                  [F.SCENE]: [sceneId],
                  [F.PRODUCTION]: [productionId],
                  [F.SLOT_TYPE]: 3007 // Default to Lead/Cast
              })
          });
      }

      // 2. Handle REMOVALS
      for (const sceneId of change.removedSceneIds) {
          // We must find the Row ID first. 
          // Optimization: In a real app, we'd cache these IDs on the client, 
          // but for now we fetch to be safe.
          const existing = await fetchBaserow(`/database/rows/table/${TABLE_ID}/`, {}, {
              filter_type: "AND",
              [`filter__${F.PERSON}__link_row_has`]: change.studentId,
              [`filter__${F.SCENE}__link_row_has`]: sceneId,
              [`filter__${F.PRODUCTION}__link_row_has`]: productionId
          });

          if (Array.isArray(existing) && existing.length > 0) {
              await fetchBaserow(`/database/rows/table/${TABLE_ID}/${existing[0].id}/`, { 
                  method: "DELETE" 
              });
          }
      }
  }

  revalidatePath("/casting");
  return { success: true };
}