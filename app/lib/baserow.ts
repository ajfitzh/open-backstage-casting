/* eslint-disable @typescript-eslint/no-explicit-any */

// 1. DYNAMIC BASE URL (This fixes the 401 Error)
const BASE_URL = process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io";
const HEADERS = {
  "Authorization": `Token ${process.env.NEXT_PUBLIC_BASEROW_TOKEN}`,
  "Content-Type": "application/json",
};

// --- READ FUNCTIONS ---

export async function getAuditionSlots() {
  const tableId = process.env.NEXT_PUBLIC_BASEROW_TABLE_AUDITIONS || "630";
  // We use user_field_names=true so we get "Acting Score" instead of "field_123"
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${tableId}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store", 
  });
  if (!res.ok) throw new Error("Failed to fetch audition slots");
  const data = await res.json();
  return data.results;
}

export async function getAuditionees() {
  const tableId = process.env.NEXT_PUBLIC_BASEROW_TABLE_PEOPLE || "599";
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${tableId}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch people");
  const data = await res.json();
  return data.results;
}

export async function getScenes() {
  // Add a new env variable for Scenes if you want, or hardcode the ID if it's stable
  const res = await fetch(`${BASE_URL}/api/database/rows/table/627/?user_field_names=true&size=200`, {
    headers: HEADERS,
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results;
}

export async function getRoles() {
  // Table 605 is Blueprint Roles
  const res = await fetch(`${BASE_URL}/api/database/rows/table/605/?user_field_names=true&size=200`, {
    headers: HEADERS,
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results;
}

// --- WRITE FUNCTIONS ---

export async function updateAuditionSlot(rowId: number, data: any) {
  const tableId = process.env.NEXT_PUBLIC_BASEROW_TABLE_AUDITIONS || "630";

  // Sanitize Data (Baserow hates empty strings for Numbers)
  const cleanData = { ...data };
  ["Vocal Score", "Acting Score", "Dance Score", "Stage Presence Score"].forEach(key => {
      if (key in cleanData) {
          cleanData[key] = Number(cleanData[key]) || 0; 
      }
  });

  console.log(`📤 Sending Update to ${BASE_URL}...`);

  const response = await fetch(`${BASE_URL}/api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`, {
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

export async function submitAudition(personId: number, productionId: number, data: any) {
  const tableId = process.env.NEXT_PUBLIC_BASEROW_TABLE_AUDITIONS || "630";
  
  // Prepare payload for creating a NEW row
  const payload = {
    ...data,
    "Performer": [personId],   // Link to Person Table
    "Production": [productionId], // Link to Production Table
    "Date": new Date().toISOString() // Timestamp the walk-in
  };

  const response = await fetch(`${BASE_URL}/api/database/rows/table/${tableId}/?user_field_names=true`, {
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

export async function createCastAssignment(actorId: number, roleId: number, productionName: string) {
  const tableId = process.env.NEXT_PUBLIC_BASEROW_TABLE_ASSIGNMENTS || "603";
  
  const response = await fetch(`${BASE_URL}/api/database/rows/table/${tableId}/?user_field_names=true`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      "Person": [actorId], 
      "Performance Identity": [roleId], 
      "Production": [productionName] // Baserow smart-matches text for links
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to assign role");
  }
  return await response.json();
}

export async function updateRoleAssignment(roleId: string, actorName: string) {
    // Legacy function support if needed, but createCastAssignment is preferred
    // ...
}

// app/lib/baserow.ts

// ... existing imports and constants

// --- READ FUNCTIONS ---

// ... existing read functions (getAuditionSlots, etc)

export async function getSeasonsAndShows() {
  const tableId = "600"; // Productions Table ID
  
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${tableId}/?user_field_names=true&size=200`, {
    headers: HEADERS,
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to fetch productions");
  
  const data = await res.json();
  const rows = data.results;

  // Extract unique seasons from the Single Select field
  // Baserow returns Single Select as: { id: 123, value: "2025-2026", color: "blue" }
  const uniqueSeasons = Array.from(
    new Set(rows.map((r: any) => r.Season?.value).filter(Boolean))
  ).sort() as string[];

  // Sort seasons in descending order (newest first) usually looks best
  uniqueSeasons.reverse();

  return {
    seasons: uniqueSeasons,
    productions: rows
  };
}

// app/lib/baserow.ts

export async function getActiveProduction() {
  const tableId = "600"; 
  // We filter specifically for the boolean true
  // Note: Baserow API filters might vary, usually "filter__field_ID__boolean=true"
  // But searching client-side for the one active show is safer if you have few shows.
  
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${tableId}/?user_field_names=true&size=50`, {
    headers: HEADERS,
    cache: "no-store",
  });
  
  if (!res.ok) return null;
  const data = await res.json();
  
  // Find the one where "Is Active" is true
  const activeShow = data.results.find((r: any) => r["Is Active"] === true);
  
  if (!activeShow) return data.results[0]; // Fallback to first show if none marked active
  return activeShow;
}