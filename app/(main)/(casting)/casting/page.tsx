import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { 
  getActiveProduction, 
  fetchBaserow, 
  DB 
} from "@/app/lib/baserow"; 
import CastingClient from "@/app/components/casting/CastingClient";

export const dynamic = 'force-dynamic'; // Ensure we don't cache stale casting data

// 🛠️ HELPERS FOR RAW BASEROW DATA
// 1. Link Fields (returns Array of objects: [{id: 1, value: "Name"}])
const getLinkValue = (field: any) => Array.isArray(field) && field.length > 0 ? field[0].value : "";
const getLinkId = (field: any) => Array.isArray(field) && field.length > 0 ? field[0].id : null;

// 2. Select Fields (returns Object: {id: 1, value: "Option", color: "blue"})
const getSelectValue = (field: any) => field?.value || "Any";

export default async function CastingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const show = await getActiveProduction();
  
  if (!show) {
    return (
      <div className="p-12 text-center text-zinc-500">
        <h2 className="text-xl font-bold text-white">No Active Production</h2>
        <p>Please select a production in the global header.</p>
      </div>
    );
  }

  // 1. Fetch Data in RAW MODE (No "user_field_names: true")
  // This ensures the API returns 'field_xxxx' keys that match your DB Schema constants.
  const [rawAssignments, rawRoles, rawAuditions, rawScenes, rawSceneLinks] = await Promise.all([
      
      // A. CAST ASSIGNMENTS
      fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`, {}, {
        [`filter__field_${DB.ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: show.id,
        "size": "200"
      }),
      
      // B. BLUEPRINT ROLES
      // Note: We don't filter by production here, we get the templates
      fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`, {}, {
        "size": "200"
      }),
      
      // C. AUDITIONS (The Talent Pool)
      fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/`, {}, {
        [`filter__field_${DB.AUDITIONS.FIELDS.PRODUCTION}__link_row_has`]: show.id,
        "size": "200"
      }),

// D. SCENES (The Fix is Here 🔍)
      fetchBaserow(`/database/rows/table/${DB.SCENES.ID}/`, {}, {
        // Explicitly using the ID from your schema export for "PRODUCTION" in SCENES table
        [`filter__field_6023__link_row_has`]: show.id, 
        "size": "200",
        "order_by": `field_${DB.SCENES.FIELDS.ORDER}`
      }),

      // E. SCENE ASSIGNMENTS (The Chiclet Data - Table 628)
      fetchBaserow(`/database/rows/table/${DB.SCENE_ASSIGNMENTS.ID}/`, {}, { 
        [`filter__field_${DB.SCENE_ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: show.id,
        "size": "200"
      })
  ]);

  // 2. Transform Data using Schema Constants
  
  // A. Map Chiclets: { [studentId]: [sceneId, sceneId] }
  const studentSceneMap: Record<number, number[]> = {};
  if (Array.isArray(rawSceneLinks)) {
    rawSceneLinks.forEach((link: any) => {
        // Raw Mode Access: Use the DB constants
        const pId = getLinkId(link[DB.SCENE_ASSIGNMENTS.FIELDS.PERSON]); 
        const sId = getLinkId(link[DB.SCENE_ASSIGNMENTS.FIELDS.SCENE]); 
        if (pId && sId) {
            if (!studentSceneMap[pId]) studentSceneMap[pId] = [];
            studentSceneMap[pId].push(sId);
        }
    });
  }

  // B. Transform Assignments
  const assignments = Array.isArray(rawAssignments) ? rawAssignments.map((a: any) => ({
      id: a.id,
      // Field 5796: Performance Identity
      roleId: getLinkId(a[DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY]), 
      roleName: getLinkValue(a[DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY]), 
      
      // Field 5786: Person
      studentId: getLinkId(a[DB.ASSIGNMENTS.FIELDS.PERSON]),
      studentName: getLinkValue(a[DB.ASSIGNMENTS.FIELDS.PERSON]),
      
      // Map the computed scenes from Table 628
      activeSceneIds: studentSceneMap[getLinkId(a[DB.ASSIGNMENTS.FIELDS.PERSON])] || [] 
  })) : [];

  // C. Transform Roles (Blueprint)
  const roles = Array.isArray(rawRoles) ? rawRoles.map((r: any) => ({
      id: r.id,
      // Field 5791: Role Name
      name: r[DB.BLUEPRINT_ROLES.FIELDS.ROLE_NAME] || "Unknown Role", 
      
      // Field 5792: Role Type
      category: r[DB.BLUEPRINT_ROLES.FIELDS.ROLE_TYPE] || "Ensemble", 
      
      // Field 5793: Casting Constraints
      gender: getSelectValue(r[DB.BLUEPRINT_ROLES.FIELDS.CASTING_CONSTRAINTS]), 
      
      // Field 6077: Active Scenes (Link to Scenes table)
      // Note: This link might be tricky if Blueprint roles link to "Template Scenes" vs "Production Scenes".
      // Usually, Blueprint Roles link to a generic list. If your DB links them to specific production scenes, this works.
      // If not, we might need logic to match "Scene 1" template to "Scene 1" production.
      // For now, assuming direct link or handled ID match:
      defaultSceneIds: r[DB.BLUEPRINT_ROLES.FIELDS.ACTIVE_SCENES]?.map((s:any) => s.id) || [] 
  })) : [];

  // D. Transform Scenes
  const scenes = Array.isArray(rawScenes) ? rawScenes.map((s: any) => ({
      id: s.id,
      // Field 6022: Scene Name
      name: s[DB.SCENES.FIELDS.SCENE_NAME] || `Scene ${s.id}`,
      // Field 6218: Order
      order: parseFloat(s[DB.SCENES.FIELDS.ORDER]) || s.id 
  })) : [];

  // E. Transform Auditionees
  const auditionees = Array.isArray(rawAuditions) ? rawAuditions.map((s: any) => ({
      id: s.id,
      // Field 6052: Performer (Link)
      name: getLinkValue(s[DB.AUDITIONS.FIELDS.PERFORMER]) || "Unknown Auditionee"
  })) : [];
console.log(`🎭 CastingPage: Fetched ${Array.isArray(rawScenes) ? rawScenes.length : 0} scenes for Production ${show.id}`);
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