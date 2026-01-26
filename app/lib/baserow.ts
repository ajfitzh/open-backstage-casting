// app/lib/baserow.ts

// --- CONFIGURATION ---
const BASE_URL = process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io";
const HEADERS = {
  "Authorization": `Token ${process.env.NEXT_PUBLIC_BASEROW_TOKEN}`,
  "Content-Type": "application/json",
};

// TABLE IDS
export const TABLES: Record<string, string> = {
  PEOPLE: process.env.NEXT_PUBLIC_BASEROW_TABLE_PEOPLE || "599",
  PRODUCTIONS: "600",
  ASSIGNMENTS: process.env.NEXT_PUBLIC_BASEROW_TABLE_ASSIGNMENTS || "603",
  ROLES: "605",
  VOLUNTEERS: "619", 
  SHOW_TEAM: process.env.NEXT_PUBLIC_BASEROW_TABLE_SHOW_TEAM || "632", // <--- NEW TABLE (Check ID!)
  COMMITTEE_PREFS: "620",
  EVENTS: "625",
  SCENES: "627",
  AUDITIONS: process.env.NEXT_PUBLIC_BASEROW_TABLE_AUDITIONS || "630",
  ASSETS: "631" 
};

// --- 🛡️ CENTRAL FETCH HELPER ---
export async function fetchBaserow(endpoint: string, options: RequestInit = {}) {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${endpoint}${separator}user_field_names=true`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...HEADERS, ...options.headers },
      cache: options.cache || "no-store", 
    });

    if (!res.ok) {
      console.error(`Baserow API Error [${res.status}]: ${res.statusText} at ${url}`);
      if (options.method === 'DELETE') return true; 
      return []; 
    }

    const data = await res.json();
    if (data && data.results && Array.isArray(data.results)) return data.results;
    return data;
  } catch (error) {
    console.error("Network/Fetch Error:", error);
    return [];
  }
}

// --- CREATIVE TEAM FETCHING ---
export async function getCreativeTeam(productionId: number) {
  // 1. Filter by the "Productions" column (Plural, based on your CSV)
  const endpoint = `/api/database/rows/table/${TABLES.SHOW_TEAM}/?size=100&filter__Productions__link_row_has=${productionId}`;
  
  const data = await fetchBaserow(endpoint);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
    // 2. Extract Name (Person Link)
    const personName = row.Person?.[0]?.value || row.Person || "Unknown Staff";
    const personId = row.Person?.[0]?.id || 0;

    // 3. Extract Role (Position Link or Text)
    // Supports both "Link to Table" (Array) and "Single Select" (Object) or "Text" (String)
    let roleName = "Volunteer";
    if (Array.isArray(row.Position)) roleName = row.Position[0]?.value;
    else if (typeof row.Position === 'object') roleName = row.Position?.value;
    else if (row.Position) roleName = row.Position;

    return {
      id: row.id,
      name: personName,
      personId: personId,
      role: roleName,
      initials: personName.split(' ').map((n:string) => n[0]).join('').substring(0, 2).toUpperCase(),
      color: getRoleColor(roleName)
    };
  });
}

function getRoleColor(role: string) {
  const r = (role || "").toLowerCase();
  if (r.includes('director') && !r.includes('music') && !r.includes('assistant')) return 'bg-blue-600'; // Director
  if (r.includes('music') || r.includes('vocal')) return 'bg-pink-600'; // MD
  if (r.includes('choreographer')) return 'bg-emerald-600'; // Choreo
  if (r.includes('stage manager') && !r.includes('assistant')) return 'bg-amber-500'; // SM
  if (r.includes('assistant')) return 'bg-cyan-600'; // AD/ASM
  if (r.includes('light') || r.includes('sound') || r.includes('tech')) return 'bg-indigo-600'; // Tech
  return 'bg-zinc-600';
}

// --- SHOW & CONTEXT ---
export async function getActiveShows() {
  const data = await fetchBaserow(`/api/database/rows/table/${TABLES.PRODUCTIONS}/?size=200`);
  if (!Array.isArray(data)) return [];
  return data.filter((row: any) => row["Is Active"] === true).map((row: any) => ({
    id: row.id,
    title: row.Title || "Untitled Show",
    location: row.Location?.value || row.Branch?.value || "Unknown",
    type: row.Type?.value || "Main Stage",
    season: row.Season?.value || "General", 
  }));
}

export async function getShowById(id: number) {
  if (!id) return null;
  return await fetchBaserow(`/api/database/rows/table/${TABLES.PRODUCTIONS}/${id}/`);
}

export async function getActiveProduction() {
  const data = await fetchBaserow(`/api/database/rows/table/${TABLES.PRODUCTIONS}/?size=50`);
  if (!Array.isArray(data)) return null;
  return data.find((r: any) => r["Is Active"] === true) || data[0];
}

// --- DATA GETTERS ---
export async function getAssignments(productionId?: number) {
  let endpoint = `/api/database/rows/table/${TABLES.ASSIGNMENTS}/?size=200`;
  if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
  return await fetchBaserow(endpoint);
}

export async function getAuditionees(productionId?: number) {
  // We fetch from Auditions table to check Status/Tenure for statistics
  let endpoint = `/api/database/rows/table/${TABLES.AUDITIONS}/?size=200`;
  if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
  return await fetchBaserow(endpoint);
}

export async function getScenes(productionId?: number) {
  let endpoint = `/api/database/rows/table/${TABLES.SCENES}/?size=200`;
  if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
  return await fetchBaserow(endpoint);
}

export async function getRoles() {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.ROLES}/?size=200`);
}

export async function getPeople() {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.PEOPLE}/?size=200`);
}

export async function getCommitteePreferences(activeId: number) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.COMMITTEE_PREFS}/?size=200`);
}

// --- ACTIONS (Writes) ---
export async function updateAuditionSlot(rowId: number, data: any) {
  const cleanData = { ...data };
  ["Vocal Score", "Acting Score", "Dance Score"].forEach(key => {
      if (key in cleanData) cleanData[key] = Number(cleanData[key]) || 0; 
  });
  return await fetchBaserow(`/api/database/rows/table/${TABLES.AUDITIONS}/${rowId}/`, {
    method: "PATCH", body: JSON.stringify(cleanData),
  });
}

export async function submitAudition(personId: number, productionId: number, data: any) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.AUDITIONS}/`, {
    method: "POST", body: JSON.stringify({ ...data, "Performer": [personId], "Production": [productionId] }),
  });
}

export async function createCastAssignment(personId: number, roleId: number, productionId: number) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.ASSIGNMENTS}/`, {
    method: "POST", body: JSON.stringify({ "Person": [personId], "Performance Identity": [roleId], "Production": [productionId] }),
  });
}

export async function updateRole(id: number, data: any) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.ROLES}/${id}/`, {
    method: "PATCH", body: JSON.stringify(data)
  });
}

export async function deleteRow(tableId: string | number, rowId: number) {
  return await fetchBaserow(`/api/database/rows/table/${tableId}/${rowId}/`, { method: "DELETE" });
}

export async function createProductionAsset(name: string, url: string, type: string, productionId: number) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.ASSETS}/`, {
    method: "POST", body: JSON.stringify({ "Name": name, "Link": url, "Type": type, "Production": [productionId] })
  });
}

export async function getProductionAssets(productionId: number) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.ASSETS}/?size=200&filter__Production__link_row_has=${productionId}`);
}

export async function getAuditionSlots(productionId?: number) {
  let endpoint = `/api/database/rows/table/${TABLES.AUDITIONS}/?size=200`;
  if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
  return await fetchBaserow(endpoint);
}

export async function getConflicts(productionId?: number) {
  let endpoint = `/api/database/rows/table/${TABLES.CONFLICTS || "623"}/?size=200`;
  if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
  return await fetchBaserow(endpoint);
}

export async function getProductionEvents(productionId?: number) {
  let endpoint = `/api/database/rows/table/${TABLES.EVENTS}/?size=200`;
  if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
  return await fetchBaserow(endpoint);
}