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

  // 1. FETCH PRODUCTION (Raw ID: field_5774 = Master Show)
  const production = await fetchBaserow(
    `/database/rows/table/${DB.PRODUCTIONS.ID}/${prodIdNum}/` 
    // No user_field_names param! Defaults to false (stable).
  );

  const masterShowId = production[DB.PRODUCTIONS.FIELDS.MASTER_SHOW_DATABASE]?.[0]?.id;

  if (!masterShowId) {
    return <div>Error: No Master Show linked.</div>;
  }

  // 2. PARALLEL FETCH (Using Raw IDs)
  const [assignmentsRaw, blueprintRaw] = await Promise.all([
    // A. Assignments
    fetchBaserow(
      `/database/rows/table/${DB.ASSIGNMENTS.ID}/`, 
      {}, 
      {
        [`filter__${DB.ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: prodIdNum,
        "size": "200"
      }
    ),
    // B. Blueprint Roles
    fetchBaserow(
      `/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`, 
      {}, 
      {
        [`filter__${DB.BLUEPRINT_ROLES.FIELDS.MASTER_SHOW_DATABASE}__link_row_has`]: masterShowId,
        "size": "200"
      }
    )
  ]);

  const rawAssigns = Array.isArray(assignmentsRaw) ? assignmentsRaw : [];
  const rawBlueprint = Array.isArray(blueprintRaw) ? blueprintRaw : [];

  // 3. ADAPTER LAYER (The Fix)
  // We map dirty DB IDs -> Clean, Stable CamelCase Props
  // This solves the "missing apostrophe" bug forever.
  
  const F_ASSIGN = DB.ASSIGNMENTS.FIELDS;
  const F_BP = DB.BLUEPRINT_ROLES.FIELDS;

  const cleanAssignments = rawAssigns.map((row: any) => ({
    id: row.id,
    role: row[F_ASSIGN.PERFORMANCE_IDENTITY], // field_5796
    person: row[F_ASSIGN.PERSON],             // field_5786
    production: row[F_ASSIGN.PRODUCTION]      // field_5787
  }));

  const cleanBlueprint = rawBlueprint.map((row: any) => ({
    id: row.id,
    name: row[F_BP.ROLE_NAME],                // field_5799
    activeScenes: row[F_BP.ACTIVE_SCENES]     // field_6077 (The Chiclets)
  }));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Casting Dashboard</h1>
      <CastingClient 
        activeId={prodIdNum}
        assignments={cleanAssignments}
        blueprintRoles={cleanBlueprint}
      />
    </div>
  );
}