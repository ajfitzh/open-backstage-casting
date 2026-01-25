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
  COMMITTEE_PREFS: "620",
  SCENES: "627",
  AUDITIONS: process.env.NEXT_PUBLIC_BASEROW_TABLE_AUDITIONS || "630",
  ASSETS: "631" 
};

// --- 🛡️ CENTRAL FETCH HELPER (The Crash Preventer) ---
export async function fetchBaserow(endpoint: string, options: RequestInit = {}) {
  // Ensure user_field_names is always true
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${endpoint}${separator}user_field_names=true`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...HEADERS,
        ...options.headers,
      },
      cache: options.cache || "no-store", // Default to fresh data
    });

    if (!res.ok) {
      console.error(`Baserow API Error [${res.status}]: ${res.statusText} at ${url}`);
      // Return null or empty array depending on context, or throw
      if (options.method === 'DELETE') return true; 
      return []; 
    }

    const data = await res.json();

    // 🌟 MAGIC FIX: Automatically unwrap 'results' if it exists
    // This stops the "filter is not a function" crashes in your UI
    if (data && data.results && Array.isArray(data.results)) {
      return data.results;
    }

    return data;
  } catch (error) {
    console.error("Network/Fetch Error:", error);
    return [];
  }
}


// --- SHOW & CONTEXT FUNCTIONS ---

export async function getActiveShows() {
  const data = await fetchBaserow(`/api/database/rows/table/${TABLES.PRODUCTIONS}/?size=200`);
  
  if (!Array.isArray(data)) return [];

  // Filter for Active
  const activeRows = data.filter((row: any) => row["Is Active"] === true);

  return activeRows.map((row: any) => ({
    id: row.id,
    title: row.Title || "Untitled Show",
    location: row.Location?.value || row.Branch?.value || "Unknown Loc",
    type: row.Type?.value || "Main Stage",
    status: row.Status?.value,
    season: row.Season?.value || "General", 
    session: row.Session?.value || "" 
  }));
}

export async function getShowById(id: number) {
  if (!id) return null;
  // We fetch specific row, so no unwrapping needed (returns object, not array)
  return await fetchBaserow(`/api/database/rows/table/${TABLES.PRODUCTIONS}/${id}/`);
}

export async function getSeasonsAndShows() {
  const data = await fetchBaserow(`/api/database/rows/table/${TABLES.PRODUCTIONS}/?size=200`);
  if (!Array.isArray(data)) return { seasons: [], productions: [] };

  return {
    seasons: Array.from(new Set(data.map((r: any) => r.Season?.value).filter(Boolean))).sort().reverse(),
    productions: data
  };
}

export async function getActiveProduction() {
  const data = await fetchBaserow(`/api/database/rows/table/${TABLES.PRODUCTIONS}/?size=50`);
  if (!Array.isArray(data)) return null;
  return data.find((r: any) => r["Is Active"] === true) || data[0];
}

// --- HELPER: NAME MAPPER ---
async function getPersonNameMap() {
  const data = await fetchBaserow(`/api/database/rows/table/${TABLES.PEOPLE}/?size=200`);
  if (!Array.isArray(data)) return new Map();
  return new Map(data.map((p: any) => [p.id, p["Full Name"]]));
}


// --- COMPLIANCE & DASHBOARD FUNCTIONS ---

export async function getComplianceData(productionId?: number) {
  if (!productionId) return [];

  // Use the smart getters below (which now handle filtering)
  const [auditions, assignments] = await Promise.all([
    getAuditionSlots(productionId),
    getAssignments(productionId)
  ]);

  if (!Array.isArray(auditions) || !Array.isArray(assignments)) return [];

  const nameMap = await getPersonNameMap();

  // Create a "Set" of Person IDs who are Cast
  const castPersonIds = new Set();
  assignments.forEach((a: any) => {
    if (a.Person && a.Person.length > 0) {
      castPersonIds.add(a.Person[0].id);
    }
  });

  const castAuditions = auditions.filter((row: any) => {
    const personId = row.Performer?.[0]?.id;
    return personId && castPersonIds.has(personId);
  });

  return castAuditions.map((row: any) => {
    const personId = row.Performer?.[0]?.id;
    const performerName = nameMap.get(personId) || "Unknown Student";
    const hasFile = row['Headshot'] && row['Headshot'].length > 0;
    const manualCheck = row['Headshot Received']?.value || false;

    return {
      id: row.id,
      performerName: performerName,
      signedAgreement: row['Commitment to Character']?.value || false,
      paidFees: row['Paid Fees']?.value || false,
      measurementsTaken: row['Measurements Taken']?.value || false,
      headshotSubmitted: hasFile || manualCheck,
    };
  });
}


// --- SMART READ FUNCTIONS (Now with Server-Side Filtering!) ---

// 1. ASSIGNMENTS: Fixes the "Blank Cast" bug by filtering on server
export async function getAssignments(productionId?: number) {
  let endpoint = `/api/database/rows/table/${TABLES.ASSIGNMENTS}/?size=200`;
  if (productionId) {
    endpoint += `&filter__Production__link_row_has=${productionId}`;
  }
  return await fetchBaserow(endpoint);
}

// 2. AUDITIONS: Filter by Production ID
export async function getAuditionSlots(productionId?: number) {
  let endpoint = `/api/database/rows/table/${TABLES.AUDITIONS}/?size=200`;
  if (productionId) {
    endpoint += `&filter__Production__link_row_has=${productionId}`;
  }
  return await fetchBaserow(endpoint);
}

export async function getAuditionees(productionId?: number) {
  const data = await getAuditionSlots(productionId);
  if (!Array.isArray(data)) return [];

  const nameMap = await getPersonNameMap();

  return data.map((row: any) => {
    if (row.Performer && row.Performer.length > 0) {
      const personId = row.Performer[0].id;
      const realName = nameMap.get(personId);
      if (realName) row.Performer[0].value = realName;
    }
    return row;
  });
}

// 3. SCENES: Filter by Production ID
export async function getScenes(productionId?: number) {
  let endpoint = `/api/database/rows/table/${TABLES.SCENES}/?size=200`;
  if (productionId) {
    endpoint += `&filter__Production__link_row_has=${productionId}`;
  }
  return await fetchBaserow(endpoint);
}

export async function getRoles() {
  // Roles are often generic (Master Show), so we fetch more rows but filter client-side
  return await fetchBaserow(`/api/database/rows/table/${TABLES.ROLES}/?size=200`);
}

export async function getPeople() {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.PEOPLE}/?size=200`);
}

export async function getCommitteePreferences() {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.COMMITTEE_PREFS}/?size=200`);
}

export async function getVolunteers() {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.VOLUNTEERS}/?size=200`);
}

export async function getProductionAssets(productionId: number) {
  let endpoint = `/api/database/rows/table/${TABLES.ASSETS}/?size=200`;
  if (productionId) {
    endpoint += `&filter__Production__link_row_has=${productionId}`;
  }
  return await fetchBaserow(endpoint);
}


// --- WRITE FUNCTIONS (ACTIONS) ---

export async function updateAuditionSlot(rowId: number, data: any) {
  const cleanData = { ...data };
  ["Vocal Score", "Acting Score", "Dance Score", "Stage Presence Score"].forEach(key => {
      if (key in cleanData) cleanData[key] = Number(cleanData[key]) || 0; 
  });

  return await fetchBaserow(`/api/database/rows/table/${TABLES.AUDITIONS}/${rowId}/`, {
    method: "PATCH",
    body: JSON.stringify(cleanData),
  });
}

export async function submitAudition(personId: number, productionId: number, data: any) {
  const payload = {
    ...data,
    "Performer": [personId], 
    "Production": [productionId],
    "Date": new Date().toISOString()
  };

  return await fetchBaserow(`/api/database/rows/table/${TABLES.AUDITIONS}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createRole(name: string) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.ROLES}/`, {
    method: "POST",
    body: JSON.stringify({ "Role Name": name, "Scene Data": "{}" }) 
  });
}

export async function updateRole(id: number, data: any) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.ROLES}/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export async function deleteRole(id: number) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.ROLES}/${id}/`, {
    method: "DELETE"
  });
}

export async function deleteRow(tableId: string | number, rowId: number) {
  return await fetchBaserow(`/api/database/rows/table/${tableId}/${rowId}/`, {
    method: "DELETE"
  });
}

export async function linkVolunteerToPerson(preferenceRowId: number, personRowId: number) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.COMMITTEE_PREFS}/${preferenceRowId}/`, {
    method: "PATCH",
    body: JSON.stringify({ "Linked Person": [personRowId] })
  });
}

export async function createProductionAsset(name: string, url: string, type: string, productionId: number) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.ASSETS}/`, {
    method: "POST",
    body: JSON.stringify({
      "Name": name,
      "Link": url,
      "Type": type, 
      "Production": [productionId] 
    })
  });
}

export async function createCastAssignment(personId: number, roleId: number, productionId: number) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.ASSIGNMENTS}/`, {
    method: "POST",
    body: JSON.stringify({
      "Person": [personId],
      "Performance Identity": [roleId],
      "Production": [productionId] 
    }),
  });
}