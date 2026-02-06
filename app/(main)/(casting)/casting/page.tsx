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

  // 1. PARALLEL FETCH
  // We fetch assignments/blueprints/scenes as usual
  // BUT we replace the raw Auditions fetch with a targeted filtered list
  const [assignmentsRaw, blueprintRaw, sceneAssignsRaw, allScenesRaw, auditioneesRaw] = await Promise.all([
    fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`, {}, {
      [`filter__${DB.ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: prodIdNum,
      "size": "200"
    }),
    fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`, {}, { "size": "200" }),
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
    // ✅ FILTERED AUDITIONEES (Only for this show)
    fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/`, {}, {
      [`filter__${DB.AUDITIONS.FIELDS.PRODUCTION}__link_row_has`]: prodIdNum,
      "size": "200",
      "user_field_names": "true"
    })
  ]);

  // 2. MAP ROSTER
  // We create a clean "Roster" object for the sidebar
  const roster = (Array.isArray(auditioneesRaw) ? auditioneesRaw : []).map((row: any) => {
    // Safety check for performer linkage
    const studentId = row['Performer']?.[0]?.id;
    const name = row['Performer']?.[0]?.value || "Unknown Actor";
    
    return {
      id: studentId || Math.random(), // Fallback ID
      name: name,
      avatar: row['Headshot']?.[0]?.url || null,
      
      // Scores for Sorting
      vocalScore: parseFloat(row['Vocal Score'] || 0),
      actingScore: parseFloat(row['Acting Score'] || 0),
      danceScore: parseFloat(row['Dance Score'] || 0),
      
      // Full Data for Modal
      auditionInfo: {
        avatar: row['Headshot']?.[0]?.url,
        height: row['Height'],
        age: row['Age'],
        vocalRange: row['Vocal Range'],
        song: row['Audition Song'],
        monologue: row['Monologue'],
        conflicts: row['Conflicts'],
        tenure: "5 Shows", // Placeholder or fetch from People table
        dob: "Unknown", 
        pastRoles: [] 
      },
      auditionGrades: {
        vocal: parseFloat(row['Vocal Score'] || 0),
        acting: parseFloat(row['Acting Score'] || 0),
        dance: parseFloat(row['Dance Score'] || 0),
        presence: parseFloat(row['Stage Presence Score'] || 0),
        vocalNotes: row['Music Notes'],
        actingNotes: row['Acting Notes'],
        choreoNotes: row['Choreography Notes'],
        adminNotes: row['Admin Notes']
      }
    };
  });

  // 3. MAP GRID (Standard logic)
  const personSceneMap = new Map();
  (Array.isArray(sceneAssignsRaw) ? sceneAssignsRaw : []).forEach((row: any) => {
    const personId = row['Person']?.[0]?.id;
    const sceneObj = row['Scene']?.[0]; 
    if (personId && sceneObj) {
      const existing = personSceneMap.get(personId) || [];
      personSceneMap.set(personId, [...existing, sceneObj]);
    }
  });

  // We also create a lookup map to inject audition data into the grid cards
  const auditionMap = new Map(roster.map((r: any) => [r.id, r]));

  const F_ASSIGN = DB.ASSIGNMENTS.FIELDS;
  const F_BP = DB.BLUEPRINT_ROLES.FIELDS;

  const cleanAssignments = (Array.isArray(assignmentsRaw) ? assignmentsRaw : []).map((row: any) => {
    const personObj = row[F_ASSIGN.PERSON]?.[0];
    const personId = personObj?.id;
    const rosterData: any = personId ? auditionMap.get(personId) : null;

    return {
      id: row.id,
      role: row[F_ASSIGN.PERFORMANCE_IDENTITY],
      person: row[F_ASSIGN.PERSON],
      production: row[F_ASSIGN.PRODUCTION],
      savedScenes: personId ? (personSceneMap.get(personId) || []) : [],
      
      // Inject Roster Data
      auditionInfo: rosterData ? rosterData.auditionInfo : null,
      auditionGrades: rosterData ? rosterData.auditionGrades : null
    };
  });

  const cleanBlueprint = (Array.isArray(blueprintRaw) ? blueprintRaw : []).map((row: any) => ({
    id: row.id,
    name: row[F_BP.ROLE_NAME],
    type: row[F_BP.ROLE_TYPE]?.value || "Role",
    activeScenes: row[F_BP.ACTIVE_SCENES]
  }));

  const allScenes = (Array.isArray(allScenesRaw) ? allScenesRaw : []).map((row: any) => ({
    id: row.id,
    name: row[DB.SCENES.FIELDS.SCENE_NAME] || "Scene",
    order: parseFloat(row[DB.SCENES.FIELDS.ORDER] || row.id)
  }));

  return (
    <CastingClient 
      activeId={prodIdNum}
      assignments={cleanAssignments}
      blueprintRoles={cleanBlueprint}
      allScenes={allScenes}
      roster={roster} // <--- Passing the filtered roster
    />
  );
}