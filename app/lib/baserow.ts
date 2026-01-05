/* eslint-disable @typescript-eslint/no-explicit-any */

// --- CONFIGURATION ---
const BASE_URL = process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io";
const HEADERS = {
  "Authorization": `Token ${process.env.NEXT_PUBLIC_BASEROW_TOKEN}`,
  "Content-Type": "application/json",
};

// TABLE IDS
// Ensure these match your actual Baserow Table IDs
const TABLES = {
  PEOPLE: process.env.NEXT_PUBLIC_BASEROW_TABLE_PEOPLE || "599",
  PRODUCTIONS: "600",
  ASSIGNMENTS: process.env.NEXT_PUBLIC_BASEROW_TABLE_ASSIGNMENTS || "603",
  ROLES: "605", // Blueprint Roles
  VOLUNTEERS: "619", // Volunteer Signup (Old/Backup)
  COMMITTEE_PREFS: "620", // The "Super Form" for Committees
  SCENES: "627",
  AUDITIONS: process.env.NEXT_PUBLIC_BASEROW_TABLE_AUDITIONS || "630",
  ASSETS: "631" 
};

// --- READ FUNCTIONS (AUDITIONS & CASTING) ---

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
  // Now pointing to Auditions table as the source of truth for current performers
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.AUDITIONS}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch auditionees");
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
  return {
    seasons: Array.from(new Set(data.results.map((r: any) => r.Season?.value).filter(Boolean))).sort().reverse(),
    productions: data.results
  };
}

export async function getActiveProduction() {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.PRODUCTIONS}/?user_field_names=true&size=50`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.results.find((r: any) => r["Is Active"] === true) || data.results[0];
}

// --- READ FUNCTIONS (COMMITTEES & PEOPLE) ---

// Used for linking volunteers to master records
export async function getPeople() {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.PEOPLE}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results;
}

// Used for the Committee Dashboard
export async function getCommitteePreferences() {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.COMMITTEE_PREFS}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch committee preferences");
  const data = await res.json();
  return data.results;
}

export async function getVolunteers() {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.VOLUNTEERS}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return []; // Don't throw error if empty, just return empty array
  const data = await res.json();
  return data.results;
}

// --- WRITE FUNCTIONS (AUDITIONS) ---

export async function updateAuditionSlot(rowId: number, data: any) {
  const cleanData = { ...data };
  ["Vocal Score", "Acting Score", "Dance Score", "Stage Presence Score"].forEach(key => {
      if (key in cleanData) cleanData[key] = Number(cleanData[key]) || 0; 
  });

  const response = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.AUDITIONS}/${rowId}/?user_field_names=true`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify(cleanData),
  });
  return await response.json();
}

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
  return await response.json();
}

// --- WRITE FUNCTIONS (CASTING / ROLES) ---

export async function createRole(name: string) {
  const response = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ROLES}/?user_field_names=true`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ "Role Name": name, "Scene Data": "{}" }) 
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
  // Note: Using Person ID for the assignment table
  const response = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ASSIGNMENTS}/?user_field_names=true`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      "Person": [actorId], 
      "Performance Identity": [roleId], 
      // "Production": [productionName] // You might need to link by ID instead of name depending on your setup
    }),
  });
  if (!response.ok) throw new Error("Failed to assign role");
  return await response.json();
}

// --- WRITE FUNCTIONS (COMMITTEES) ---

export async function linkVolunteerToPerson(preferenceRowId: number, personRowId: number) {
  // Patches Table 620 to link it to Table 599
  const response = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.COMMITTEE_PREFS}/${preferenceRowId}/?user_field_names=true`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({
      "Linked Person": [personRowId] 
    })
  });
  if (!response.ok) throw new Error("Failed to link volunteer profile");
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