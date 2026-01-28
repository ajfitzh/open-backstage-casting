// app/lib/baserow.ts

// --- CONFIGURATION ---
const BASE_URL = process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io";
const HEADERS = {
  "Authorization": `Token ${process.env.NEXT_PUBLIC_BASEROW_TOKEN}`,
  "Content-Type": "application/json",
};

// --- TABLE MAP (Complete based on your Docs) ---
// We define all of them here so they are ready when you expand the app.
export const TABLES = {
  PEOPLE: "599",
  PRODUCTIONS: "600",
  MASTER_SHOWS: "601",
  ASSIGNMENTS: "603", // Cast/Crew Assignments
  BLUEPRINT_ROLES: "605", // Roles specific to a show's script
  SIGNATURES: "607",
  PRODUCTION_STATS: "608",
  STAFF_POSITIONS: "609", // Generic Job Titles (Director, etc.)
  SHOW_TEAM: "610", // Linking People <-> Positions <-> Production
  MEASUREMENTS: "616",
  GARMENT_INVENTORY: "617",
  STUDENT_BIO: "618",
  VOLUNTEERS: "619", // Legacy/General Volunteer pool
  COMMITTEE_PREFS: "620",
  ATTENDANCE: "622",
  CONFLICTS: "623",
  REQUIREMENTS: "624",
  EVENTS: "625",
  SCENES: "627",
  SCENE_ASSIGNMENTS: "628",
  AUDITIONS: "630",
  ASSETS: "631",
  PERFORMANCES: "637", // The table you just created!
  SALES_HISTORY: "637", //
};
// --- 📈 BOX OFFICE & ANALYTICS ---

/**
 * Fetches performance data and calculates financial/attendance metrics.
 * Designed for use with Recharts on the Analytics page.
 */
export async function getPerformanceAnalytics(productionId?: number) {
  // Fetch up to 100 performances. Order by Date (field_6186)
  let endpoint = `/api/database/rows/table/${TABLES.PERFORMANCES}/?size=100&order_by=field_6186`;
  
  // Optional: Filter for a specific show if provided
  if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
  
  const data = await fetchBaserow(endpoint);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
    const sold = parseFloat(row['Tickets Sold'] || row.field_6184 || 0);
    const capacity = parseFloat(row['Total Inventory'] || row.field_6183 || 0);
    
    // We use the "Performance" formula field (field_6182) as the label
    const label = row['Performance'] || row.field_6182 || "Unknown Date";

    return {
      name: label,
      sold: sold,
      capacity: capacity,
      empty: capacity - sold,
      // Calculate fill rate percentage for the line chart
      fillRate: capacity > 0 ? Math.round((sold / capacity) * 100) : 0,
      // You can add revenue logic here if you store ticket prices!
    };
  });
}

/**
 * Gets high-level stats (Total sold across all shows, average fill rate, etc.)
 */
export async function getGlobalSalesSummary() {
  const data = await getPerformanceAnalytics();
  if (data.length === 0) return { totalSold: 0, avgFill: 0 };

  const totalSold = data.reduce((sum, p) => sum + p.sold, 0);
  const avgFill = Math.round(data.reduce((sum, p) => sum + p.fillRate, 0) / data.length);

  return {
    totalSold,
    avgFill,
    performanceCount: data.length
  };
}
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
    // Auto-unwrap results if paginated
    if (data && data.results && Array.isArray(data.results)) return data.results;
    return data;
  } catch (error) {
    console.error("Network/Fetch Error:", error);
    return [];
  }
}

// --- 🛠️ GENERIC HELPER (The "Lazy" Way) ---
// Use this for simple tables (like Garments) without writing a specific function
export async function getTableRows(tableId: string, productionId?: number) {
    let endpoint = `/api/database/rows/table/${tableId}/?size=200`;
    // Try to filter by production if the table likely has that link
    if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
    return await fetchBaserow(endpoint);
}

// ==============================================================================
// 🎭 COMPLEX / SPECIFIC GETTERS
// These require specific logic (joining names, calculating stats, etc)
// ==============================================================================

// --- CREATIVE TEAM (Using Table 610) ---
export async function getCreativeTeam(productionId: number) {
  // 1. Filter Table 610 by Production
  const endpoint = `/api/database/rows/table/${TABLES.SHOW_TEAM}/?size=100&filter__Productions__link_row_has=${productionId}`;
  
  const data = await fetchBaserow(endpoint);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
    // 2. Extract Person Name
    // API returns array: [{id: 123, value: "Austin Fitzhugh"}]
    const personName = row.Person?.[0]?.value || "Unknown Staff";
    const personId = row.Person?.[0]?.id || 0;

    // 3. Extract Position Name
    // API returns array: [{id: 456, value: "Director"}]
    const roleName = row.Position?.[0]?.value || "Volunteer";

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

// Helper: Colors for Dashboard
function getRoleColor(role: string) {
  const r = (role || "").toLowerCase();
  if (r.includes('director') && !r.includes('music') && !r.includes('assistant')) return 'bg-blue-600';
  if (r.includes('music') || r.includes('vocal')) return 'bg-pink-600';
  if (r.includes('choreographer')) return 'bg-emerald-600';
  if (r.includes('stage manager')) return 'bg-amber-500';
  if (r.includes('assistant')) return 'bg-cyan-600';
  if (r.includes('tech') || r.includes('light') || r.includes('sound')) return 'bg-indigo-600';
  return 'bg-zinc-600';
}

// --- CONTEXT & SHOWS ---
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

// --- COMPLIANCE & CASTING ---

export async function getAuditionees(productionId?: number) {
  // We use Auditions (630) for casting logic because it contains the Scores/Notes/Status
  let endpoint = `/api/database/rows/table/${TABLES.AUDITIONS}/?size=200`;
  if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
  
  const data = await fetchBaserow(endpoint);
  if (!Array.isArray(data)) return [];

  // Helper to map Person ID to Name if needed, though Auditions table usually has "Performer" link
  return data.map((row: any) => {
      // Normalize Performer Name for UI
      if (row.Performer && row.Performer.length > 0) {
          row.performerName = row.Performer[0].value;
      }
      return row;
  });
}

export async function getAssignments(productionId?: number) {
  let endpoint = `/api/database/rows/table/${TABLES.ASSIGNMENTS}/?size=200`;
  if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
  return await fetchBaserow(endpoint);
}

export async function getComplianceData(productionId?: number) {
    if (!productionId) return [];
  
    const [auditions, assignments] = await Promise.all([
      getAuditionSlots(productionId), // 630
      getAssignments(productionId)    // 603
    ]);
  
    if (!Array.isArray(auditions) || !Array.isArray(assignments)) return [];
  
    // Identify who is actually CAST
    const castPersonIds = new Set();
    assignments.forEach((a: any) => {
      if (a.Person && a.Person.length > 0) castPersonIds.add(a.Person[0].id);
    });
  
    // Filter Auditions list to only show Cast Members
    const castAuditions = auditions.filter((row: any) => {
      const personId = row.Performer?.[0]?.id;
      return personId && castPersonIds.has(personId);
    });
  
    return castAuditions.map((row: any) => {
      const performerName = row.Performer?.[0]?.value || "Unknown";
      const hasFile = row['Headshot'] && row['Headshot'].length > 0;
  
      return {
        id: row.id,
        performerName: performerName,
        signedAgreement: row['Commitment to Character']?.value || false,
        paidFees: row['Paid Fees']?.value || false,
        measurementsTaken: row['Measurements Taken']?.value || false,
        headshotSubmitted: hasFile,
      };
    });
}

// --- STANDARD GETTERS (Cleaned up) ---
export async function getScenes(productionId?: number) {
  let endpoint = `/api/database/rows/table/${TABLES.SCENES}/?size=200`;
  if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
  return await fetchBaserow(endpoint);
}

// We use Blueprint Roles (605) for Casting Grid, not Staff Positions (609)
export async function getRoles() {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.BLUEPRINT_ROLES}/?size=200`);
}

export async function getPeople() {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.PEOPLE}/?size=200`);
}

export async function getCommitteePreferences(activeId: number) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.COMMITTEE_PREFS}/?size=200`);
}

export async function getProductionEvents(productionId?: number) {
  let endpoint = `/api/database/rows/table/${TABLES.EVENTS}/?size=200`;
  if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
  return await fetchBaserow(endpoint);
}

export async function getAuditionSlots(productionId?: number) {
    let endpoint = `/api/database/rows/table/${TABLES.AUDITIONS}/?size=200`;
    if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
    return await fetchBaserow(endpoint);
}

export async function getConflicts(productionId?: number) {
    let endpoint = `/api/database/rows/table/${TABLES.CONFLICTS}/?size=200`;
    if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
    return await fetchBaserow(endpoint);
}

export async function getProductionAssets(productionId: number) {
    let endpoint = `/api/database/rows/table/${TABLES.ASSETS}/?size=200`;
    if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
    return await fetchBaserow(endpoint);
}

// ==============================================================================
// ✍️ WRITE FUNCTIONS (ACTIONS)
// Only add these as you implement the buttons in the UI
// ==============================================================================

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
  // Note: 'Performance Identity' links to Blueprint Roles (605)
  return await fetchBaserow(`/api/database/rows/table/${TABLES.ASSIGNMENTS}/`, {
    method: "POST", body: JSON.stringify({ "Person": [personId], "Performance Identity": [roleId], "Production": [productionId] }),
  });
}

export async function updateRole(id: number, data: any) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.BLUEPRINT_ROLES}/${id}/`, {
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