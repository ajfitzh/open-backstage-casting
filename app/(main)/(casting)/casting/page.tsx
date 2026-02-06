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

  // 2. PARALLEL FETCH (Assignments, Blueprints, Scenes, AND Auditions)
  const [assignmentsRaw, blueprintRaw, sceneAssignsRaw, allScenesRaw, auditionsRaw] = await Promise.all([
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
    fetchBaserow(`/database/rows/table/${DB.SCENES.ID}/`, {}, {
      [`filter__${DB.SCENES.FIELDS.PRODUCTION}__link_row_has`]: prodIdNum,
      "order_by": `field_${DB.SCENES.FIELDS.ORDER}`, 
      "size": "200"
    }),
    // E. AUDITIONS (New!)
    fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/`, {}, {
      [`filter__${DB.AUDITIONS.FIELDS.PRODUCTION}__link_row_has`]: prodIdNum,
      "size": "200",
      "user_field_names": "true"
    })
  ]);

  // 3. MAP SCENES & AUDITIONS
  const allScenes = (Array.isArray(allScenesRaw) ? allScenesRaw : []).map((row: any) => ({
    id: row.id,
    name: row[DB.SCENES.FIELDS.SCENE_NAME] || "Scene",
    order: parseFloat(row[DB.SCENES.FIELDS.ORDER] || row.id)
  }));

  // Audition Lookup: StudentID -> AuditionRow
  const auditionMap: Record<number, any> = {};
  (Array.isArray(auditionsRaw) ? auditionsRaw : []).forEach((row: any) => {
    const studentId = row['Performer']?.[0]?.id;
    if (studentId) auditionMap[studentId] = row;
  });

  // Scene Assignments Lookup
  const personSceneMap = new Map();
  (Array.isArray(sceneAssignsRaw) ? sceneAssignsRaw : []).forEach((row: any) => {
    const personId = row['Person']?.[0]?.id;
    const sceneObj = row['Scene']?.[0]; 
    if (personId && sceneObj) {
      const existing = personSceneMap.get(personId) || [];
      personSceneMap.set(personId, [...existing, sceneObj]);
    }
  });

  // 4. CLEAN DATA
  const F_ASSIGN = DB.ASSIGNMENTS.FIELDS;
  const F_BP = DB.BLUEPRINT_ROLES.FIELDS;

  const cleanAssignments = (Array.isArray(assignmentsRaw) ? assignmentsRaw : []).map((row: any) => {
    const personObj = row[F_ASSIGN.PERSON]?.[0];
    const personId = personObj?.id;
    
    // Inject Audition Data if exists
    const auditionData = personId ? auditionMap[personId] : null;

    return {
      id: row.id,
      role: row[F_ASSIGN.PERFORMANCE_IDENTITY],
      person: row[F_ASSIGN.PERSON],
      production: row[F_ASSIGN.PRODUCTION],
      savedScenes: personId ? (personSceneMap.get(personId) || []) : [],
      
      // Pass clean audition data for the Modal
      auditionInfo: auditionData ? {
        avatar: auditionData['Headshot']?.[0]?.url,
        height: auditionData['Height'],
        age: auditionData['Age'],
        vocalRange: auditionData['Vocal Range'], // Check your DB field name for this
        song: auditionData['Audition Song'],
        monologue: auditionData['Monologue'],
        conflicts: auditionData['Conflicts'],
        tenure: "5 Shows", // You might need to calc this from DB.PEOPLE
        dob: "Unknown",    // You might need to fetch from DB.PEOPLE
        pastRoles: []      // Fetch from DB.PEOPLE if needed
      } : null,
      
      auditionGrades: auditionData ? {
        vocal: parseInt(auditionData['Vocal Score'] || 0),
        acting: parseInt(auditionData['Acting Score'] || 0),
        dance: parseInt(auditionData['Dance Score'] || 0),
        presence: parseInt(auditionData['Stage Presence Score'] || 0),
        vocalNotes: auditionData['Music Notes'],
        actingNotes: auditionData['Acting Notes'],
        choreoNotes: auditionData['Choreography Notes'],
        adminNotes: auditionData['Admin Notes']
      } : null
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
        allScenes={allScenes}
      />
    </div>
  );
}