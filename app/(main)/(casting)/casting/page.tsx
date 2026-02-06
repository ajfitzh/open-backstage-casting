import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchBaserow } from '@/app/lib/baserow';
import { DB } from '@/app/lib/schema';
import CastingClient from '@/app/components/casting/CastingClient';

export default async function CastingPage() {
  const cookieStore = await cookies();
  const productionId = cookieStore.get("active_production_id")?.value;

  if (!productionId) redirect("/");
  const prodIdNum = parseInt(productionId);

  // 1. FETCH PRODUCTION
  const production = await fetchBaserow(
    `/database/rows/table/${DB.PRODUCTIONS.ID}/${prodIdNum}/`
  );

  const masterShowId = production[DB.PRODUCTIONS.FIELDS.MASTER_SHOW_DATABASE]?.[0]?.id;
  if (!masterShowId) return <div>Error: No Master Show linked.</div>;

  // 2. PARALLEL FETCH (Now includes Scene Assignments!)
  const [assignmentsRaw, blueprintRaw, sceneAssignsRaw] = await Promise.all([
    // A. Role Assignments
    fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`, {}, {
      [`filter__${DB.ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: prodIdNum,
      "size": "200"
    }),
    // B. Blueprint Roles
    fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`, {}, {
      [`filter__${DB.BLUEPRINT_ROLES.FIELDS.MASTER_SHOW_DATABASE}__link_row_has`]: masterShowId,
      "size": "200"
    }),
    // C. Existing Scene Assignments (The missing link)
    fetchBaserow(`/database/rows/table/${DB.SCENE_ASSIGNMENTS.ID}/`, {}, {
      [`filter__${DB.SCENE_ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: prodIdNum,
      "size": "200",
      "user_field_names": "true" // Helps ensuring we get 'Scene' and 'Person' objects
    })
  ]);

  const rawAssigns = Array.isArray(assignmentsRaw) ? assignmentsRaw : [];
  const rawBlueprint = Array.isArray(blueprintRaw) ? blueprintRaw : [];
  const rawScenes = Array.isArray(sceneAssignsRaw) ? sceneAssignsRaw : [];

  // 3. MAP SCENES TO ACTORS
  // Create a lookup: PersonID -> Array of Scenes
  const personSceneMap = new Map();
  
  rawScenes.forEach((row: any) => {
    const personId = row['Person']?.[0]?.id;
    const sceneObj = row['Scene']?.[0]; // { id: 123, value: "1 - Opening" }
    
    if (personId && sceneObj) {
      const existing = personSceneMap.get(personId) || [];
      personSceneMap.set(personId, [...existing, sceneObj]);
    }
  });

  // 4. ADAPTER LAYER
  const F_ASSIGN = DB.ASSIGNMENTS.FIELDS;
  const F_BP = DB.BLUEPRINT_ROLES.FIELDS;

  const cleanAssignments = rawAssigns.map((row: any) => {
    const personObj = row[F_ASSIGN.PERSON]?.[0];
    const personId = personObj?.id;

    return {
      id: row.id,
      role: row[F_ASSIGN.PERFORMANCE_IDENTITY],
      person: row[F_ASSIGN.PERSON],
      production: row[F_ASSIGN.PRODUCTION],
      // Inject saved scenes here!
      savedScenes: personId ? (personSceneMap.get(personId) || []) : []
    };
  });

  const cleanBlueprint = rawBlueprint.map((row: any) => ({
    id: row.id,
    name: row[F_BP.ROLE_NAME],
    activeScenes: row[F_BP.ACTIVE_SCENES]
  }));

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white">
      <CastingClient 
        activeId={prodIdNum}
        assignments={cleanAssignments}
        blueprintRoles={cleanBlueprint}
      />
    </div>
  );
}