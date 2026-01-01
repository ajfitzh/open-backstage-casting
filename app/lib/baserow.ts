/* eslint-disable @typescript-eslint/no-explicit-any */

const getConfig = () => ({
  // Using your specific domain
  baseUrl: process.env.NEXT_PUBLIC_BASEROW_URL || "https://open-backstage.org",
  token: process.env.NEXT_PUBLIC_BASEROW_TOKEN,
});

// Internal helper to keep headers consistent
const getHeaders = (token: string | undefined) => ({
  "Authorization": `Token ${token}`,
  "Content-Type": "application/json",
});

// --- HELPER FUNCTIONS ---

export async function getSeasonsAndShows() {
  const { baseUrl, token } = getConfig();
  const url = `${baseUrl}/api/database/rows/table/600/?user_field_names=true`;
  const res = await fetch(url, { headers: getHeaders(token) });
  const data = await res.json();
  const productions = data.results;
  const seasons = Array.from(new Set(productions.map((p: any) => p.Season?.value).filter(Boolean)));
  return { seasons, productions };
}

// --- AUDITION SLOTS (For the Casting Deck) ---

/**
 * FETCH: Get all audition records (Table 630)
 * Used by: AuditionsPage
 */
export async function getAuditionSlots() {
  const { baseUrl, token } = getConfig();
  const url = `${baseUrl}/api/database/rows/table/630/?user_field_names=true`;
  
  const res = await fetch(url, { 
    headers: getHeaders(token),
    cache: 'no-store' 
  });
  
  if (!res.ok) throw new Error(`Baserow GET Failed: ${res.status}`);
  const data = await res.json();
  return data.results;
}

/**
 * UPDATE: Patch an existing audition record (Table 630)
 * Used by: AuditionsPage (when grading a specific slot)
 */
export async function updateAuditionSlot(rowId: number, grades: any) {
  const { baseUrl, token } = getConfig();
  const url = `${baseUrl}/api/database/rows/table/630/${rowId}/?user_field_names=true`;
  
  const res = await fetch(url, {
    method: "PATCH",
    headers: getHeaders(token),
    body: JSON.stringify({
      "Vocal Score": grades.vocal,
      "Acting Score": grades.acting,
      "Dance Score": grades.dance,
      "Stage Presence Score": grades.presence,
      "Notes": grades.notes,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Update Failed: ${errorText}`);
  }
  return res.json();
}

// --- PEOPLE & CREATION (For CastingContext / Admin usage) ---

/**
 * FETCH: Get all Performers directly (Table 599)
 * Used by: CastingContext
 */
export async function getAuditionees() {
  const { baseUrl, token } = getConfig();
  const url = `${baseUrl}/api/database/rows/table/599/?user_field_names=true`;
  
  const res = await fetch(url, { headers: getHeaders(token) });
  
  if (!res.ok) throw new Error(`Baserow GET Failed: ${res.status}`);
  const data = await res.json();
  return data.results;
}

/**
 * CREATE: Create a NEW audition record (Table 630)
 * Used by: CastingContext (if adding a walk-in audition)
 */
export async function submitAudition(performerId: number, productionId: number, grades: any) {
  const { baseUrl, token } = getConfig();
  const url = `${baseUrl}/api/database/rows/table/630/?user_field_names=true`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify({
      "Performer": [performerId], // Link to Person
      "Production": [productionId], // Link to Show
      "Vocal Score": grades.vocal,
      "Acting Score": grades.acting,
      "Dance Score": grades.dance,
      "Stage Presence Score": grades.presence,
      "Notes": grades.notes,
      "Date": new Date().toISOString() // Sets current timestamp
    }),
  });

  if (!res.ok) throw new Error("Failed to create new audition record.");
  return res.json();
}
// --- SCENES (For the Casting Mission Control) ---

/**
 * FETCH: Get all scenes for the show
 */
export async function getScenes() {
  const { baseUrl, token } = getConfig();
  // REPLACE 'YOUR_SCENES_TABLE_ID' WITH THE REAL ID (e.g., 631)
  const tableId = "627"; 
  const url = `${baseUrl}/api/database/rows/table/${tableId}/?user_field_names=true`;
  
  const res = await fetch(url, { 
    headers: getHeaders(token),
    cache: 'no-store' 
  });
  
  if (!res.ok) throw new Error(`Baserow GET Scenes Failed: ${res.status}`);
  const data = await res.json();
  return data.results;
}
// --- ROLES (Table 605) ---
// Inside app/lib/baserow.tsx

export async function getRoles() {
  const { baseUrl, token } = getConfig();
  const tableId = "605"; 
  
  // FIX: Add '&size=200' to fetch up to 200 roles (default is 100)
  const url = `${baseUrl}/api/database/rows/table/${tableId}/?user_field_names=true&size=200`;
  
  const res = await fetch(url, { 
    headers: getHeaders(token),
    cache: 'no-store' 
  });
  
  if (!res.ok) throw new Error(`Baserow GET Roles Failed: ${res.status}`);
  const data = await res.json();
  return data.results;
}

// ... existing functions (getAuditionSlots, getScenes, etc.)