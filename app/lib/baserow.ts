/* eslint-disable @typescript-eslint/no-explicit-any */

// --- CONFIGURATION ---
const BASE_URL = process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io";
const HEADERS = {
  "Authorization": `Token ${process.env.NEXT_PUBLIC_BASEROW_TOKEN}`,
  "Content-Type": "application/json",
};

// TABLE IDS (Based on your provided code)
const TABLES = {
  AUDITIONS: process.env.NEXT_PUBLIC_BASEROW_TABLE_AUDITIONS || "630",
  PEOPLE: process.env.NEXT_PUBLIC_BASEROW_TABLE_PEOPLE || "599",
  SCENES: "627",
  ROLES: "605", // The Blueprint Roles table
  ASSIGNMENTS: process.env.NEXT_PUBLIC_BASEROW_TABLE_ASSIGNMENTS || "603",
  ASSETS: "631" // Assuming 631 based on context, check your DB
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

export async function getRoles() {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ROLES}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results;
}

// --- WRITE FUNCTIONS (ROLES / CASTING) ---

// 1. Create a new Role
export async function createRole(name: string) {
  const response = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ROLES}/?user_field_names=true`, {
    method: "POST",
    headers: HEADERS,
    // "Scene Data" is a Long Text field in Baserow to store the colors/grid
    body: JSON.stringify({ "Name": name, "Scene Data": "{}" }) 
  });
  return await response.json();
}

// 2. Update Role (Scenes or Assigned Actor)
export async function updateRole(rowId: number, data: any) {
  await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ROLES}/${rowId}/?user_field_names=true`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify(data),
  });
}

// 3. Delete Role
export async function deleteRole(rowId: number) {
  await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ROLES}/${rowId}/`, {
    method: "DELETE",
    headers: HEADERS,
  });
}

// 4. Create Formal Assignment (Optional History)
export async function createCastAssignment(actorId: number, roleId: number, productionName: string) {
  await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ASSIGNMENTS}/?user_field_names=true`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      "Person": [actorId], 
      "Performance Identity": [roleId], 
      "Production": [productionName]
    }),
  });
}

// --- WRITE FUNCTIONS (AUDITIONS) ---

export async function updateAuditionSlot(rowId: number, data: any) {
  const cleanData = { ...data };
  // Ensure numbers are numbers
  ["Vocal Score", "Acting Score", "Dance Score"].forEach(key => {
      if (key in cleanData) cleanData[key] = Number(cleanData[key]) || 0; 
  });

  const response = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.AUDITIONS}/${rowId}/?user_field_names=true`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify(cleanData),
  });
  return await response.json();
}

// --- ASSETS ---

export async function getProductionAssets(productionId: number) {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ASSETS}/?user_field_names=true&size=200`, { headers: HEADERS });
  if(!res.ok) return [];
  const data = await res.json();
  return data.results.filter((row: any) => row.Production && row.Production.some((p: any) => p.id === productionId));
}

export async function createProductionAsset(name: string, url: string, type: string, productionId: number) {
  await fetch(`${BASE_URL}/api/database/rows/table/${TABLES.ASSETS}/?user_field_names=true`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ "Name": name, "Link": url, "Type": type, "Production": [productionId] })
  });
}