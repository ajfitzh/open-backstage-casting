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

  // 2. PARALLEL FETCH (Added Scenes!)
  const [assignmentsRaw, blueprintRaw, sceneAssignsRaw, allScenesRaw] = await Promise.all([
    fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`, {}, {
      [`filter__${DB.ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: prodIdNum,
      "size": "200"
    }),
    fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`, {}, {
      [`filter__${DB.BLUEPRINT_ROLES.FIELDS.MASTER_SHOW_DATABASE}__link_row_has`]: masterShowId,
      "size": "200"
    }),
    fetchBaserow(`/database/rows/table/${DB.SCENE_ASSIGNMENTS.ID}/`, {}, {
      [`filter__${DB.SCENE_ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: prodIdNum,
      "size": "200",
      "user_field_names": "true" 
    }),
    // D. Master Scene List (For the Matrix)
    fetchBaserow(`/database/rows/table/${DB.SCENES.ID}/`, {}, {
      [`filter__${DB.SCENES.FIELDS.PRODUCTION}__link_row_has`]: prodIdNum,
      "order_by": `field_${DB.SCENES.FIELDS.ORDER}`, // Ensure chronological order
      "size": "200"
    })
  ]);

  // ... (Existing mapping logic for assignments/blueprint/scenes) ...
  // Reuse your existing mapping logic here for `cleanAssignments` and `cleanBlueprint`
  
  // 3. MAP SCENES
  const allScenes = (Array.isArray(allScenesRaw) ? allScenesRaw : []).map((row: any) => ({
    id: row.id,
    name: row[DB.SCENES.FIELDS.SCENE_NAME] || "Scene",
    order: parseFloat(row[DB.SCENES.FIELDS.ORDER] || row.id)
  }));

  // Re-map assignments (Copy your previous logic here)
  const personSceneMap = new Map();
  (Array.isArray(sceneAssignsRaw) ? sceneAssignsRaw : []).forEach((row: any) => {
    const personId = row['Person']?.[0]?.id;
    const sceneObj = row['Scene']?.[0]; 
    if (personId && sceneObj) {
      const existing = personSceneMap.get(personId) || [];
      personSceneMap.set(personId, [...existing, sceneObj]);
    }
  });

  const F_ASSIGN = DB.ASSIGNMENTS.FIELDS;
  const F_BP = DB.BLUEPRINT_ROLES.FIELDS;

  const cleanAssignments = (Array.isArray(assignmentsRaw) ? assignmentsRaw : []).map((row: any) => {
    const personObj = row[F_ASSIGN.PERSON]?.[0];
    const personId = personObj?.id;
    return {
      id: row.id,
      role: row[F_ASSIGN.PERFORMANCE_IDENTITY],
      person: row[F_ASSIGN.PERSON],
      production: row[F_ASSIGN.PRODUCTION],
      savedScenes: personId ? (personSceneMap.get(personId) || []) : []
    };
  });

  const cleanBlueprint = (Array.isArray(blueprintRaw) ? blueprintRaw : []).map((row: any) => ({
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
        allScenes={allScenes} // <--- PASS THIS NEW PROP
      />
    </div>
  );
}