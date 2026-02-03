import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { 
  getActiveProduction, 
  fetchBaserow, 
  DB 
} from "@/app/lib/baserow"; 
import CastingClient from "@/app/components/casting/CastingClient";

export const dynamic = 'force-dynamic';

// 🛠️ HELPERS
const getField = (row: any, fieldId: string, fieldName: string) => {
  return row[`${fieldId}`] || row[fieldId] || row[fieldName];
};

const getLinkValue = (row: any, fieldId: string, fieldName: string) => {
  const val = getField(row, fieldId, fieldName);
  if (Array.isArray(val) && val.length > 0) return val[0].value || "";
  if (val && typeof val === 'object' && val.value) return val.value;
  return "";
};

const getLinkId = (row: any, fieldId: string, fieldName: string) => {
  const val = getField(row, fieldId, fieldName);
  if (Array.isArray(val) && val.length > 0) return val[0].id;
  if (val && typeof val === 'object' && val.id) return val.id;
  return null;
};

const getSelectValue = (row: any, fieldId: string, fieldName: string) => {
  const val = getField(row, fieldId, fieldName);
  if (val && typeof val === 'object' && val.value) return val.value;
  if (typeof val === 'string') return val;
  return "Any";
};

const getLookupValue = (row: any, fieldId: string, fieldName: string) => {
  const val = getField(row, fieldId, fieldName);
  if (Array.isArray(val)) {
     if (val.length === 0) return "";
     const item = val[0];
     if (item && typeof item === 'object') {
         if (item.url) return item.url;
         if (item.value !== undefined) {
             if (typeof item.value === 'object' && item.value !== null && item.value.value) {
                 return item.value.value; 
             }
             return String(item.value);
         }
     }
     return String(item);
  }
  return "";
};

export default async function CastingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const show = await getActiveProduction();
  if (!show) return <div className="p-12 text-center text-white">No Active Production</div>;

  console.log(`\n🚀 CASTING LOAD: ${show.title || 'Show'} (ID: ${show.id})`);

  // 1. GET MASTER SHOW ID (To filter roles)
  // We need to know which Blueprint to load. 
  // Production (Table 600) -> Master Show DB (field_5774)
  let masterShowId = null;
  
  // Try to find it in the 'show' object if it was already fetched with user_field_names
  if (show['Master Show Database'] && Array.isArray(show['Master Show Database'])) {
      masterShowId = show['Master Show Database'][0]?.id;
  } 
  // Fallback: Check raw field ID
  else if (show[DB.PRODUCTIONS.FIELDS.MASTER_SHOW_DATABASE]) {
      const raw = show[DB.PRODUCTIONS.FIELDS.MASTER_SHOW_DATABASE];
      masterShowId = Array.isArray(raw) ? raw[0]?.id : raw?.id;
  }

  // If still missing (unlikely), we might need to fetch the raw production row
  if (!masterShowId) {
      console.log("⚠️ Master Show ID missing in session. Fetching fresh...");
      const freshShow = await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/${show.id}/`);
      const raw = freshShow[DB.PRODUCTIONS.FIELDS.MASTER_SHOW_DATABASE];
      masterShowId = Array.isArray(raw) ? raw[0]?.id : null;
  }

  console.log(`   -> Master Show ID: ${masterShowId}`);

  // 2. PREPARE FILTERS
  const rolesFilter = masterShowId 
      ? { [`filter__${DB.BLUEPRINT_ROLES.FIELDS.MASTER_SHOW_DATABASE}__link_row_has`]: masterShowId } 
      : {}; // Fallback to "All" if no master show linked (dangerous but better than crash)


  // 3. FETCH DATA PARALLEL
  const [rawAssignments, rawRoles, rawAuditions, rawScenes, rawSceneLinks] = await Promise.all([
      fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`, {}, {
        [`filter__${DB.ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: show.id,
        "size": "200"
      }),
      // 🟢 SMART FETCH: Only get roles for THIS show
      fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`, {}, {
        ...rolesFilter,
        "size": "200"
      }),
      fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/`, {}, {
        [`filter__${DB.AUDITIONS.FIELDS.PRODUCTION}__link_row_has`]: show.id,
        "size": "200"
      }),
      fetchBaserow(`/database/rows/table/${DB.SCENES.ID}/`, {}, {
        [`filter__field_6023__link_row_has`]: show.id,
        "size": "200",
        "order_by": `${DB.SCENES.FIELDS.ORDER}`
      }),
      fetchBaserow(`/database/rows/table/${DB.SCENE_ASSIGNMENTS.ID}/`, {}, { 
        [`filter__${DB.SCENE_ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: show.id,
        "size": "200"
      })
  ]);

  // 4. TRANSFORM DATA
  
  // A. Chiclets Map
  const studentSceneMap: Record<number, number[]> = {};
  if (Array.isArray(rawSceneLinks)) {
    rawSceneLinks.forEach((link: any) => {
        const pId = getLinkId(link, DB.SCENE_ASSIGNMENTS.FIELDS.PERSON, "Person"); 
        const sId = getLinkId(link, DB.SCENE_ASSIGNMENTS.FIELDS.SCENE, "Scene"); 
        if (pId && sId) {
            if (!studentSceneMap[pId]) studentSceneMap[pId] = [];
            studentSceneMap[pId].push(sId);
        }
    });
  }

  // B. Assignments
  const assignments = Array.isArray(rawAssignments) ? rawAssignments.map((a: any) => {
      const studentId = getLinkId(a, DB.ASSIGNMENTS.FIELDS.PERSON, "Person");
      return {
        id: a.id,
        roleId: getLinkId(a, DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY, "Performance Identity"),
        roleName: getLinkValue(a, DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY, "Performance Identity"),
        studentId,
        studentName: getLinkValue(a, DB.ASSIGNMENTS.FIELDS.PERSON, "Person"),
        activeSceneIds: studentId ? (studentSceneMap[studentId] || []) : []
      };
  }) : [];

  // C. Roles (Now correctly filtered!)
  const roles = Array.isArray(rawRoles) ? rawRoles.map((r: any) => ({
      id: r.id,
      name: getField(r, DB.BLUEPRINT_ROLES.FIELDS.ROLE_NAME, "Role Name") || "Unknown",
      category: getField(r, DB.BLUEPRINT_ROLES.FIELDS.ROLE_TYPE, "Role Type") || "Ensemble",
      gender: getSelectValue(r, DB.BLUEPRINT_ROLES.FIELDS.CASTING_CONSTRAINTS, "Casting Constraints"),
      defaultSceneIds: getField(r, DB.BLUEPRINT_ROLES.FIELDS.ACTIVE_SCENES, "Active Scenes")?.map((s:any) => s.id) || [] 
  })) : [];

  // DEBUG: Check if we found the right roles
  console.log(`   -> Loaded ${roles.length} Roles for this show.`);
  if (roles.length > 0) {
      console.log(`   -> Sample Role: ${roles[0].name} (Scenes: ${roles[0].defaultSceneIds.length})`);
  } else {
      console.log(`   ⚠️ WARNING: No roles found. Check Master Show ID link.`);
  }

  // D. Scenes
  const scenes = Array.isArray(rawScenes) ? rawScenes.map((s: any) => ({
      id: s.id,
      name: getField(s, DB.SCENES.FIELDS.SCENE_NAME, "Scene Name") || `Scene ${s.id}`,
      order: parseFloat(getField(s, DB.SCENES.FIELDS.ORDER, "Order")) || s.id,
      act: getSelectValue(s, DB.SCENES.FIELDS.ACT, "Act") 
  })) : [];

  // E. Auditionees
  const auditionees = Array.isArray(rawAuditions) ? rawAuditions.map((s: any) => ({
      id: getLinkId(s, DB.AUDITIONS.FIELDS.PERFORMER, "Performer"),
      name: getLinkValue(s, DB.AUDITIONS.FIELDS.PERFORMER, "Performer") || "Unknown Auditionee",
      headshot: getLookupValue(s, DB.AUDITIONS.FIELDS.HEADSHOT, "Headshot"),
      gender: getLookupValue(s, DB.AUDITIONS.FIELDS.GENDER, "Gender"),
      age: getLookupValue(s, DB.AUDITIONS.FIELDS.AGE, "Age"),
      actingNotes: !!getField(s, DB.AUDITIONS.FIELDS.ACTING_NOTES, "Acting Notes"),
      musicNotes: !!getField(s, DB.AUDITIONS.FIELDS.MUSIC_NOTES, "Music Notes"),
      totalScore: (
        parseFloat(getField(s, DB.AUDITIONS.FIELDS.VOCAL_SCORE, "Vocal Score") || "0") +
        parseFloat(getField(s, DB.AUDITIONS.FIELDS.ACTING_SCORE, "Acting Score") || "0") +
        parseFloat(getField(s, DB.AUDITIONS.FIELDS.DANCE_SCORE, "Dance Score") || "0")
      )
  })).filter(a => a.id) : [];

  return (
    <main className="h-full overflow-hidden">
      <CastingClient 
        assignments={assignments}
        roles={roles}
        auditionees={auditionees}
        scenes={scenes}
        activeId={show.id}
        showStatus={typeof show.status === 'object' ? show.status?.value : show.status || "Pre-Production"} 
      />
    </main>
  );
}