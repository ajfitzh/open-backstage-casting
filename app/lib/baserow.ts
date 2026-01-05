/* eslint-disable @typescript-eslint/no-explicit-any */

// --- CONFIGURATION ---
// 1. Dynamic Base URL (Fixes 401 errors if using self-hosted vs cloud)
const BASE_URL = process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io";

// 2. Table IDs (Centralized for easy changing)
// Check these IDs match your Baserow Database!
const TABLES = {
  AUDITIONS: process.env.NEXT_PUBLIC_BASEROW_TABLE_AUDITIONS || "630",
  PEOPLE: process.env.NEXT_PUBLIC_BASEROW_TABLE_PEOPLE || "599",
  SCENES: "627",
  ROLES: "605", // The Blueprint Roles table
  PRODUCTIONS: "600",
  ASSIGNMENTS: process.env.NEXT_PUBLIC_BASEROW_TABLE_ASSIGNMENTS || "603",
  ASSETS: "631" // "Production Resources" table
};

// 3. Auth Headers
const HEADERS = {
  "Authorization": `Token ${process.env.NEXT_PUBLIC_BASEROW_TOKEN}`,
  "Content-Type": "application/json",
};

// --- READ FUNCTIONS ---

export async function getAuditionSlots() {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.AUDITIONS}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store", 
  });
  if (!res.ok) throw new Error("Failed to fetch audition slots");
  const data = await res.json();
  return data.results;
}

export async function getAuditionees() {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.PEOPLE}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch people");
  const data = await res.json();
  return data.results;
}

export async function getScenes() {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.SCENES}/?user_field_names=true&size=200`, {
    headers: HEADERS,
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results;
}

export async function getRoles() {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ROLES}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results;
}

export async function getSeasonsAndShows() {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.PRODUCTIONS}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to fetch productions");
  
  const data = await res.json();
  const rows = data.results;

  // Extract unique seasons
  const uniqueSeasons = Array.from(
    new Set(rows.map((r: any) => r.Season?.value).filter(Boolean))
  ).sort() as string[];

  uniqueSeasons.reverse();

  return {
    seasons: uniqueSeasons,
    productions: rows
  };
}

export async function getActiveProduction() {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.PRODUCTIONS}/?user_field_names=true&size=50`, {
    headers: HEADERS,
    cache: "no-store",
  });
  
  if (!res.ok) return null;
  const data = await res.json();
  
  const activeShow = data.results.find((r: any) => r["Is Active"] === true);
  return activeShow || data.results[0];
}

// --- WRITE FUNCTIONS (AUDITIONS) ---

export async function updateAuditionSlot(rowId: number, data: any) {
  const cleanData = { ...data };
  ["Vocal Score", "Acting Score", "Dance Score", "Stage Presence Score"].forEach(key => {
      if (key in cleanData) {
          cleanData[key] = Number(cleanData[key]) || 0; 
      }
  });

  const response = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.AUDITIONS}/${rowId}/?user_field_names=true`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify(cleanData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("❌ Baserow Update Failed:", errorData);
    throw new Error(errorData.error || "Baserow update failed");
  }

  return await response.json();
}

// THIS WAS MISSING
export async function submitAudition(personId: number, productionId: number, data: any) {
  const payload = {
    ...data,
    "Performer": [personId],
    "Production": [productionId],
    "Date": new Date().toISOString()
  };

  const response = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.AUDITIONS}/?user_field_names=true`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to submit walk-in");
  }
  return await response.json();
}

// --- WRITE FUNCTIONS (CASTING / ROLES) ---

export async function createRole(name: string) {
  const response = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ROLES}/?user_field_names=true`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ "Name": name, "Scene Data": "{}" }) 
  });
  return await response.json();
}

export async function updateRole(id: number, data: any) {
  await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ROLES}/${id}/?user_field_names=true`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify(data)
  });
}

export async function deleteRole(id: number) {
  await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ROLES}/${id}/`, {
    method: "DELETE",
    headers: HEADERS
  });
}

export async function createCastAssignment(actorId: number, roleId: number, productionName: string) {
  const response = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ASSIGNMENTS}/?user_field_names=true`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      "Person": [actorId], 
      "Performance Identity": [roleId], 
      "Production": [productionName]
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to assign role");
  }
  return await response.json();
}

// --- ASSET LIBRARY FUNCTIONS ---

export async function getProductionAssets(productionId: number) {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ASSETS}/?user_field_names=true&size=200`, {
    headers: HEADERS
  });
  if(!res.ok) return [];
  const data = await res.json();
  
  return data.results.filter((row: any) => 
    row.Production && row.Production.some((p: any) => p.id === productionId)
  );
}

export async function createProductionAsset(name: string, url: string, type: string, productionId: number) {
  await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ASSETS}/?user_field_names=true`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      "Name": name,
      "Link": url,
      "Type": type, 
      "Production": [productionId] 
    })
  });
}