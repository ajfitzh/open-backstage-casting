import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { 
  getActiveProduction, 
  fetchBaserow, 
  DB 
} from "@/app/lib/baserow"; 
import CastingClient from "@/app/components/casting/CastingClient";

// Helpers
const safeValue = (field: any) => field?.value || field || "";
const safeId = (field: any) => field?.[0]?.id || null;
const safeName = (field: any) => field?.[0]?.value || "";

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

  // 1. Fetch Data
  const [rawAssignments, rawRoles, rawAuditions, rawScenes] = await Promise.all([
     
     // A. ASSIGNMENTS
     fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`, {}, {
        [`filter__${DB.ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: show.id,
        "user_field_names": "true"
     }),
     
     // B. ROLES (Using BLUEPRINT_ROLES)
     fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`, {}, {
        "user_field_names": "true",
        "size": "200"
     }),
     
     // C. AUDITIONS
     fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/`, {}, {
        [`filter__${DB.AUDITIONS.FIELDS.PRODUCTION}__link_row_has`]: show.id,
        "user_field_names": "true"
     }),

     // D. SCENES
     fetchBaserow(`/database/rows/table/${DB.SCENES.ID}/`, {}, {
        [`filter__${DB.SCENES.FIELDS.PRODUCTION}__link_row_has`]: show.id,
        "user_field_names": "true"
     })
  ]);

  // 2. Transform Data using EXACT Schema Keys
  const assignments = rawAssignments.map((a: any) => ({
      id: a.id,
      // 🟢 Mapping 'Performance Identity'
      roleId: safeId(a[DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY]), 
      roleName: safeName(a[DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY]), 
      
      // 🟢 Mapping 'Person'
      studentId: safeId(a[DB.ASSIGNMENTS.FIELDS.PERSON]),
      studentName: safeName(a[DB.ASSIGNMENTS.FIELDS.PERSON]),
      
      // 🟢 Mapping 'Scene Assignments'
      sceneIds: a[DB.ASSIGNMENTS.FIELDS.SCENE_ASSIGNMENTS]?.map((s:any) => s.id) || []
  }));

  const roles = rawRoles.map((r: any) => ({
      id: r.id,
      name: r['Role Name'] || "Unknown Role", 
      category: safeValue(r['Role Type']), // Schema field 5792
      gender: "Any", // Blueprint Roles doesn't seem to have a Gender field in your schema, defaulting
      // 🟢 Mapping 'Active Scenes' from Blueprint
      defaultSceneIds: r['Active Scenes']?.map((s:any) => s.id) || [] 
  }));

  const scenes = rawScenes.map((s: any) => ({
      id: s.id,
      name: s['Scene Name'] || `Scene ${s.id}`
  }));

  const auditionees = rawAuditions.map((s: any) => ({
      id: s.id,
      // 🟢 Auditions table links to 'Performer' (field_6052)
      name: safeName(s[DB.AUDITIONS.FIELDS.PERFORMER]) || "Unknown Auditionee"
  }));

  const showStatus = typeof show.status === 'object' ? show.status?.value : show.status;

  return (
    <main className="h-full overflow-hidden">
      <CastingClient 
        assignments={assignments}
        roles={roles}
        auditionees={auditionees}
        scenes={scenes}
        activeId={show.id}
        showStatus={showStatus || "Pre-Production"} 
      />
    </main>
  );
}