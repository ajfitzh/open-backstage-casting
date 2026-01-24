/* eslint-disable @typescript-eslint/no-explicit-any */

// --- CONFIGURATION ---
const BASE_URL = process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io";
const HEADERS = {
  "Authorization": `Token ${process.env.NEXT_PUBLIC_BASEROW_TOKEN}`,
  "Content-Type": "application/json",
};

// TABLE IDS
const TABLES = {
  PEOPLE: process.env.NEXT_PUBLIC_BASEROW_TABLE_PEOPLE || "599",
  PRODUCTIONS: "600",
  ASSIGNMENTS: process.env.NEXT_PUBLIC_BASEROW_TABLE_ASSIGNMENTS || "603",
  ROLES: "605",
  VOLUNTEERS: "619",
  COMMITTEE_PREFS: "620",
  SCENES: "627",
  AUDITIONS: process.env.NEXT_PUBLIC_BASEROW_TABLE_AUDITIONS || "630",
  ASSETS: "631" 
};
// app/lib/baserow.ts

export async function getAssignments() {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ASSIGNMENTS}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results;
}
// --- HELPER: NAME MAPPER ---
// This function fixes the "Digital ID" issue by creating a dictionary of ID -> Name
async function getPersonNameMap() {
  // Fetch up to 200 people (Increase size if you have more actors)
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.PEOPLE}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store",
  });
  
  if (!res.ok) return new Map(); // Return empty map on fail
  
  const data = await res.json();
  // Create a Map: Row ID (e.g. 195) => "Jackson Smith"
  // Note: We map the internal 'id', not the 'Digital ID'
  return new Map(data.results.map((p: any) => [p.id, p["Full Name"]]));
}

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
  // 1. Fetch the raw Audition data (which currently has numbers like "1" in the name field)
  const auditionRes = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.AUDITIONS}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!auditionRes.ok) throw new Error("Failed to fetch auditionees");
  const auditionData = await auditionRes.json();

  // 2. Fetch the People data to get the real names
  const nameMap = await getPersonNameMap();

  // 3. "Hydrate" the data: Replace the number with the name
  const hydratedResults = auditionData.results.map((row: any) => {
    // Check if there is a Performer linked
    if (row.Performer && row.Performer.length > 0) {
      const personId = row.Performer[0].id; // This is the Row ID (e.g. 195)
      const realName = nameMap.get(personId); // Look up "Jackson Smith"
      
      // If we found a name, overwrite the "1" with "Jackson Smith"
      if (realName) {
        row.Performer[0].value = realName;
      }
    }
    return row;
  });

  return hydratedResults;
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

export async function getPeople() {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.PEOPLE}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results;
}

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
  if (!res.ok) return []; 
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
    // Note: Baserow always expects the Row ID (e.g. 195) for links, NOT the primary field.
    // As long as personId is the Row ID, this will work regardless of the Primary Field change.
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
  const response = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ASSIGNMENTS}/?user_field_names=true`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      "Person": [actorId], // Must be Row ID (195), not Digital ID (1)
      "Performance Identity": [roleId], 
    }),
  });
  if (!response.ok) throw new Error("Failed to assign role");
  return await response.json();
}

// --- WRITE FUNCTIONS (COMMITTEES) ---

export async function linkVolunteerToPerson(preferenceRowId: number, personRowId: number) {
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