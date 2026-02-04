// app/casting/page.tsx
import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchBaserow } from '@/app/lib/baserow';
import { DB } from '@/app/lib/schema';
import CastingClient from '@/app/components/casting/CastingClient';

export default async function CastingPage() {
  // 1. SECURITY & CONTEXT: Get Active Production
  const cookieStore = await cookies();
  const productionId = cookieStore.get("active_production_id")?.value;

  if (!productionId) {
    redirect("/"); // Or your login/dashboard route
  }

  const prodIdNum = parseInt(productionId);

  // 2. FETCH PRODUCTION METADATA (Need Master Show ID)
  const production = await fetchBaserow(
    `/database/rows/table/${DB.PRODUCTIONS.ID}/${prodIdNum}/?user_field_names=true`
  );

  const masterShowId = production['Master Show Database']?.[0]?.id;

  if (!masterShowId) {
    return <div>Error: This production is not linked to a Master Show blueprint.</div>;
  }

  // 3. PARALLEL DATA FETCHING
  // We use Promise.all to fetch both tables at the same time for speed
  const [assignmentsData, blueprintData] = await Promise.all([
    // A. Fetch Current Assignments (The Grid Rows)
    fetchBaserow(
      `/database/rows/table/${DB.ASSIGNMENTS.ID}/`, 
      {}, 
      {
        [`filter__${DB.ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: prodIdNum,
        "size": "200",
        "user_field_names": "true" 
        // We need user_field_names=true so the JSON keys match what CastingClient expects
      }
    ),
    
    // B. Fetch Blueprint Roles (The Rules/Defaults)
    fetchBaserow(
      `/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`, 
      {}, 
      {
        // STRICT FILTER: Only load roles for THIS show (No Ghost Data)
        [`filter__${DB.BLUEPRINT_ROLES.FIELDS.MASTER_SHOW_DATABASE}__link_row_has`]: masterShowId,
        "size": "200",
        "user_field_names": "true" 
      }
    )
  ]);

  // 4. DATA SANITIZATION (Handle Baserow API quirks)
  const assignments = Array.isArray(assignmentsData) ? assignmentsData : [];
  const blueprintRoles = Array.isArray(blueprintData) ? blueprintData : [];

  // 5. RENDER CLIENT
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Casting Dashboard</h1>
      
      <CastingClient 
        activeId={prodIdNum}
        assignments={assignments}
        blueprintRoles={blueprintRoles}
      />
    </div>
  );
}