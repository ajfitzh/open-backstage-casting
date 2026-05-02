"use server";
import { signOut } from "@/auth" // Import the SERVER version from your auth config

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { 
  getClassRoster, 
  fetchBaserow, 
  submitClassProposal, 
  claimBounty
} from "@/app/lib/baserow";
import { DB } from "@/app/lib/schema";
// 🎯 HARDCODED IDs
const TBL_CLASSES = 633;
const FLD_CLASS_NAME = 'field_6115';
const FLD_CLASS_TEACHER = 'field_6117'; // Notice this is a Link Row field
const FLD_CLASS_STATUS = 'field_6241';  // Single Select
const FLD_CLASS_DESC = 'field_6242';
const FLD_CLASS_OBJ = 'field_6243';
const FLD_CLASS_TYPE = 'field_6217';    // Single Select
const FLD_CLASS_SESSION = 'field_6116'; // Link Row
const TBL_SESSIONS = 632;
const TBL_PEOPLE = 599;
// --- HELPERS ---

export async function handleLogout() {
  // Use 'redirectTo' instead of 'callbackUrl' for the server-side signOut
  await signOut({ redirectTo: "/login" });
}
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
  // 1. We must find the Session ID for the string "Winter 2025"
  const sessionRes = await fetchBaserow(`/database/rows/table/${TBL_SESSIONS}/?user_field_names=true&filter__field_6109__equal=${data.session}&size=1`);
  const sessionId = Array.isArray(sessionRes) && sessionRes.length > 0 ? sessionRes[0].id : null;

  // 2. We must find the Person ID for the teacher name
  const teacherRes = await fetchBaserow(`/database/rows/table/${TBL_PEOPLE}/?user_field_names=true&filter__field_5735__equal=${data.teacher}&size=1`);
  const teacherId = Array.isArray(teacherRes) && teacherRes.length > 0 ? teacherRes[0].id : null;

  try {
      await fetchBaserow(`/database/rows/table/${TBL_CLASSES}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [FLD_CLASS_NAME]: data.name,
          [FLD_CLASS_DESC]: data.description,
          [FLD_CLASS_OBJ]: data.objectives,
          // Since these are link_row fields, we must send an array containing the ID
          ...(sessionId && { [FLD_CLASS_SESSION]: [sessionId] }),
          ...(teacherId && { [FLD_CLASS_TEACHER]: [teacherId] }),
          // Send the string values for Single Selects
          [FLD_CLASS_TYPE]: data.type, 
          [FLD_CLASS_STATUS]: "Proposed" 
        })
      });
      revalidatePath("/education/portal");
      return { success: true };
  } catch (e) {
      console.error("Failed to submit proposal:", e);
      return { success: false };
  }
}


export async function claimBountyAction(classId: number, teacherName: string) {
  // 1. Find the Person ID for the teacher claiming it
  const teacherRes = await fetchBaserow(`/database/rows/table/${TBL_PEOPLE}/?user_field_names=true&filter__field_5735__equal=${teacherName}&size=1`);
  const teacherId = Array.isArray(teacherRes) && teacherRes.length > 0 ? teacherRes[0].id : null;

  if (!teacherId) return { success: false, error: "Teacher not found in database" };

  try {
      await fetchBaserow(`/database/rows/table/${TBL_CLASSES}/${classId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [FLD_CLASS_TEACHER]: [teacherId], // Link the teacher
          [FLD_CLASS_STATUS]: "Proposed"    // Change status from Seeking to Proposed
        })
      });
      revalidatePath("/education/portal");
      revalidatePath("/education/proposals");
      return { success: true };
  } catch (e) {
      console.error("Failed to claim bounty:", e);
      return { success: false };
  }
}
export async function updateApplicantStatus(personId: number, oldTags: string[], newTag: string) {
  // Table 599 is PEOPLE
  // Field 5782 is Status (Multiple Select)
  const TBL_PEOPLE = 599;
  const FLD_STATUS = 'field_5782';

  const hiringTags = ["Faculty Applicant", "Faculty Interviewing", "Active Faculty"];
  
  // Keep all tags that AREN'T hiring tags (e.g. keep "Parent", "Student")
  const keptTags = oldTags.filter(t => !hiringTags.includes(t));
  
  // Add the new hiring column tag
  const newTags = [...keptTags, newTag];

  try {
    await fetchBaserow(`/database/rows/table/${TBL_PEOPLE}/${personId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Baserow Multiple Select fields expect an array of strings
        [FLD_STATUS]: newTags 
      })
    });
    
    revalidatePath("/education/hiring");
    return { success: true };
  } catch (error) {
    console.error("Failed to update applicant status:", error);
    return { success: false };
  }
}

export async function fetchRosterAction(classId: number) {
  // 🟢 THE FIX: Grab the correct URL from your environment variables!
  const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");
  
  // Table 599 is PEOPLE. Field 6151 is Classes.
  const url = `${BASE_URL}/api/database/rows/table/599/?user_field_names=true&filter__field_6151__link_row_has=${classId}&size=200`;
  
  try {
    const res = await fetch(url, {
      headers: { 
        "Authorization": `Token ${process.env.BASEROW_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      cache: 'no-store'
    });
    
    if (!res.ok) {
        console.error("❌ [fetchRosterAction] Failed:", res.status, res.statusText);
        return [];
    }
    
    const data = await res.json();
    const students = data.results || data;
    
    return students.map((row: any) => ({
      id: row.id,
      name: row['Full Name'] || 'Unknown Student',
      age: row['Age'] || '?',
      email: row['CYT Account Personal Email'] || '',
      phone: row['Phone Number'] || ''
    }));
  } catch (error) {
    console.error("❌ [fetchRosterAction] Network Error:", error);
    return [];
  }
}


export async function updateClassSchedule(
  classId: number, 
  payload: { day: string; time: string; location: string; status: string }
) {
  // Table 633 is CLASSES
  const TBL_CLASSES = 633;
  
  // Field IDs from schema dump
  const FLD_CLASS_DAY = 'field_6119';    // Single Select
  const FLD_CLASS_TIME = 'field_6120';   // Single Select
  const FLD_CLASS_LOC = 'field_6118';    // Single Select
  const FLD_CLASS_STATUS = 'field_6241'; // Single Select

  await fetchBaserow(`/database/rows/table/${TBL_CLASSES}/${classId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // Because these are Single Select fields in Baserow, we pass the string value.
      // Baserow is smart enough to match the string to the correct select option ID.
      // If we pass an empty string "", it clears the field.
      [FLD_CLASS_DAY]: payload.day || "",
      [FLD_CLASS_TIME]: payload.time || "",
      [FLD_CLASS_LOC]: payload.location || "",
      [FLD_CLASS_STATUS]: payload.status 
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

export async function updateSceneLoads(updates: {id: number, load: {music: number, dance: number, block: number}}[]) {
  // Table 627 is SCENES
  const promises = updates.map(async (update) => {
    await fetchBaserow(`/database/rows/table/627/${update.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        'field_6222': update.load.music, // Music Load
        'field_6223': update.load.dance, // Dance Load
        'field_6224': update.load.block, // Blocking Load
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

// ============================================================================
// --- SCHEDULING ACTIONS ---
// ============================================================================

// 🎯 HARDCODED IDs FOR STABILITY
const TBL_EVENTS = 625;
const FLD_EV_PROD = 'field_6007';
const FLD_EV_DATE = 'field_6008';
const FLD_EV_START = 'field_6010';
const FLD_EV_END = 'field_6011';

const TBL_SLOTS = 640;
const FLD_SL_EVENT = 'field_6230';
const FLD_SL_SCENE = 'field_6233';
const FLD_SL_TRACK = 'field_6235';
const FLD_SL_START = 'field_6236';
const FLD_SL_DURATION = 'field_6238';


export async function saveScheduleBatch(productionId: number, items: any[]) {
  console.log(`[Save] Schedule Batch for Prod ${productionId}: ${items.length} items`);
  
  // Group slots by day so we can create one parent Event per day
  const itemsByDate: Record<string, any[]> = {};
  items.forEach(item => {
      if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
      itemsByDate[item.date].push(item);
  });

  const promises = Object.entries(itemsByDate).map(async ([date, dayItems]) => {
      let parentEventId = dayItems[0].existingParentEventId; 
      
      // 1. CREATE PARENT EVENT (If it doesn't exist)
      if (!parentEventId) {
          const minTime = Math.min(...dayItems.map((i:any) => i.startTime)); 
          const maxTime = Math.max(...dayItems.map((i:any) => i.startTime + (i.duration/60))); 
          
          const parentRes = await fetchBaserow(`/database/rows/table/${TBL_EVENTS}/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  [FLD_EV_PROD]: [productionId],
                  [FLD_EV_DATE]: date,
                  [FLD_EV_START]: `${date}T${formatTimeHHMM(minTime)}:00`,
                  [FLD_EV_END]: `${date}T${formatTimeHHMM(maxTime)}:00`,
              })
          });
          if (parentRes && !parentRes.error) parentEventId = parentRes.id;
      }

      // 2. CREATE CHILD SLOTS
      if (parentEventId) {
        const slotPromises = dayItems.map(item => {
             return fetchBaserow(`/database/rows/table/${TBL_SLOTS}/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    [FLD_SL_EVENT]: [parentEventId], 
                    [FLD_SL_SCENE]: [item.sceneId],       
                    [FLD_SL_TRACK]: item.track,           
                    [FLD_SL_START]: `${date}T${formatTimeHHMM(item.startTime)}:00`,
                    [FLD_SL_DURATION]: item.duration
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


// ============================================================================
// --- CASTING ACTIONS ---
// ============================================================================

// 🎯 HARDCODED IDs FOR STABILITY
// Pulled directly from the schema dump to prevent "undefined field" errors during saves.
const TBL_ASSIGNMENTS = 603;
const FLD_ASSIGN_PERSON = 'field_5786';
const FLD_ASSIGN_PROD = 'field_5787';
const FLD_ASSIGN_ROLE = 'field_5796'; // Performance Identity

const TBL_SCENE_ASSIGNMENTS = 628;
const FLD_SA_PERSON = 'field_6032';
const FLD_SA_SCENE = 'field_6033';
const FLD_SA_PROD = 'field_6036';

const TBL_ROLES = 605;
const TBL_SCENES = 627;

// 1. GENERATE EMPTY ROWS (Initialize Grid)
export async function generateCastingRows(productionId: number) {
  console.log(`[Action] Generating rows for Production ${productionId}`);
  
  // A. Get Master Show ID from the Production
  const production = await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/${productionId}/?user_field_names=true`);
  if (!production) return { success: false, error: "Production not found" };
  
  const masterShowId = production['Master Show Database']?.[0]?.id;
  if (!masterShowId) return { success: false, error: "No Master Show linked" };

  // B. Fetch Blueprint Roles for this specific Master Show
  const blueprintRoles = await fetchBaserow(`/database/rows/table/${TBL_ROLES}/`, {}, { 
      [`filter__field_5794__link_row_has`]: masterShowId, // 5794 is 'Master Show Database' on Roles
      size: "200" 
  });
  if (!Array.isArray(blueprintRoles)) return { success: false, error: "Failed to fetch blueprint" };

  // C. Fetch Existing Assignments to avoid creating duplicates
  const existing = await fetchBaserow(`/database/rows/table/${TBL_ASSIGNMENTS}/`, {}, {
      [`filter__${FLD_ASSIGN_PROD}__link_row_has`]: productionId,
      size: "200"
  });
  
  const existingRoleIds = new Set(
    Array.isArray(existing) ? existing.map((r: any) => r[FLD_ASSIGN_ROLE]?.[0]?.id) : []
  );

  // D. Create Missing Rows
  const rolesToCreate = blueprintRoles.filter(role => !existingRoleIds.has(role.id));
  if (rolesToCreate.length === 0) return { success: true, count: 0, message: "Already up to date" };

  const createPromises = rolesToCreate.map(role => 
    fetchBaserow(`/database/rows/table/${TBL_ASSIGNMENTS}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [FLD_ASSIGN_PROD]: [productionId],
        [FLD_ASSIGN_ROLE]: [role.id]
      })
    })
  );

  await Promise.all(createPromises);
  revalidatePath("/casting");
  return { success: true, count: rolesToCreate.length };
}

// 2. THE MAIN SAVE FUNCTION
export async function saveCastingGrid(
  productionId: number, 
  actorChanges: any[], 
  sceneChanges: any[],
  deletedRowIds: number[] = [],
  createdRows: any[] = []
) {
  console.log(`[Save] Prod: ${productionId} | Actors: ${actorChanges.length} | Scenes: ${sceneChanges.length} | Del: ${deletedRowIds.length} | New: ${createdRows.length}`);

  // 🧹 PHASE 1: HANDLE DELETIONS
  if (deletedRowIds.length > 0) {
    await Promise.all(deletedRowIds.map(id => 
      fetchBaserow(`/database/rows/table/${TBL_ASSIGNMENTS}/${id}/`, { method: "DELETE" })
    ));
  }

  // 🏗️ PHASE 2: HANDLE CREATED ROWS (Custom Roles added in UI)
  if (createdRows.length > 0) {
    await Promise.all(createdRows.map(row => 
      fetchBaserow(`/database/rows/table/${TBL_ASSIGNMENTS}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [FLD_ASSIGN_PROD]: [productionId],
          [FLD_ASSIGN_PERSON]: row.assignedStudentIds || [],
          // Note: If you want the custom name to save, you'd need a text field on Assignments for "Custom Role Name"
        })
      })
    ));
  }

  // 🎭 PHASE 3: UPDATE ACTORS IN EXISTING ROLES
  for (const change of actorChanges) {
    await fetchBaserow(`/database/rows/table/${TBL_ASSIGNMENTS}/${change.assignmentId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [FLD_ASSIGN_PERSON]: change.studentIds // Baserow expects an array of IDs: [1, 2]
      })
    });
  }

  // 🎬 PHASE 4: UPDATE SCENE ASSIGNMENTS (The Junction Table)
  for (const change of sceneChanges) {
    const { assignmentId, addedSceneIds, removedSceneIds } = change;
    
    // We need to know who is in the role to assign them to the scene.
    // Check if we just updated them in Phase 3, otherwise fetch the current row.
    let studentIds: number[] = [];
    const actorUpdate = actorChanges.find(a => a.assignmentId === assignmentId);
    
    if (actorUpdate) {
      studentIds = actorUpdate.studentIds;
    } else {
      const row = await fetchBaserow(`/database/rows/table/${TBL_ASSIGNMENTS}/${assignmentId}/?user_field_names=true`);
      if (row && row.Person) studentIds = row.Person.map((p: any) => p.id);
    }

    if (studentIds.length === 0) continue; 

    // For every Actor in this Role, Add/Remove the specific Scene Links
    for (const studentId of studentIds) {
      
      // ADDITIONS
      for (const sceneId of addedSceneIds) {
         await fetchBaserow(`/database/rows/table/${TBL_SCENE_ASSIGNMENTS}/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                [FLD_SA_PERSON]: [studentId],
                [FLD_SA_SCENE]: [sceneId],
                [FLD_SA_PROD]: [productionId]
            })
         });
      }

      // REMOVALS
      for (const sceneId of removedSceneIds) {
        // Find the specific junction row linking this Person to this Scene
        const existing = await fetchBaserow(`/database/rows/table/${TBL_SCENE_ASSIGNMENTS}/`, {}, {
            filter_type: "AND",
            [`filter__${FLD_SA_PERSON}__link_row_has`]: studentId,
            [`filter__${FLD_SA_SCENE}__link_row_has`]: sceneId,
            [`filter__${FLD_SA_PROD}__link_row_has`]: productionId
        });

        if (Array.isArray(existing) && existing.length > 0) {
            // Delete it (and clean up duplicates if they exist)
            for (const item of existing) {
                await fetchBaserow(`/database/rows/table/${TBL_SCENE_ASSIGNMENTS}/${item.id}/`, { method: "DELETE" });
            }
        }
      }
    }
  }

  // Tell Next.js to clear the cache so the page reloads with fresh data
  revalidatePath("/casting");
  return { success: true };
}

// 3. CLEAR ALL CASTING DATA (Nuke button)
export async function clearCastingData(productionId: number) {
  // A. Delete Scene Assignments
  const sceneAssigns = await fetchBaserow(`/database/rows/table/${TBL_SCENE_ASSIGNMENTS}/`, {}, {
    [`filter__${FLD_SA_PROD}__link_row_has`]: productionId,
    size: "200"
  });
  if (Array.isArray(sceneAssigns)) {
    await Promise.all(sceneAssigns.map(row => 
      fetchBaserow(`/database/rows/table/${TBL_SCENE_ASSIGNMENTS}/${row.id}/`, { method: "DELETE" })
    ));
  }

  // B. Delete Roles/Assignments
  const castAssigns = await fetchBaserow(`/database/rows/table/${TBL_ASSIGNMENTS}/`, {}, {
    [`filter__${FLD_ASSIGN_PROD}__link_row_has`]: productionId,
    size: "200"
  });
  if (Array.isArray(castAssigns)) {
    await Promise.all(castAssigns.map(row => 
      fetchBaserow(`/database/rows/table/${TBL_ASSIGNMENTS}/${row.id}/`, { method: "DELETE" })
    ));
  }

  revalidatePath("/casting");
  return { success: true };
}
