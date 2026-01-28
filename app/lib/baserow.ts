// app/lib/baserow.ts

// --- 🛠️ DYNAMIC CONFIGURATION HELPER ---
/**
 * Ensures we pull fresh environment variables on every request.
 * This prevents "Authorization: Token undefined" errors on Vercel.
 */
const getAuth = () => {
  const url = process.env.NEXT_PUBLIC_BASEROW_URL || "https://open-backstage.org";
  const token = process.env.NEXT_PUBLIC_BASEROW_TOKEN;
  
  // Safety: Remove "Token " prefix if it was doubled up in the env variables
  const cleanToken = token?.replace("Token ", "").trim();

  return {
    baseUrl: url.endsWith('/') ? url.slice(0, -1) : url,
    headers: {
      "Authorization": `Token ${cleanToken}`,
      "Content-Type": "application/json",
    }
  };
};

// --- TABLE MAP ---
export const TABLES = {
  PEOPLE: "599",
  PRODUCTIONS: "600",
  MASTER_SHOWS: "601",
  ASSIGNMENTS: "603",
  BLUEPRINT_ROLES: "605",
  SIGNATURES: "607",
  PRODUCTION_STATS: "608",
  STAFF_POSITIONS: "609",
  SHOW_TEAM: "610",
  MEASUREMENTS: "616",
  GARMENT_INVENTORY: "617",
  STUDENT_BIO: "618",
  VOLUNTEERS: "619",
  COMMITTEE_PREFS: "620",
  ATTENDANCE: "622",
  CONFLICTS: "623",
  REQUIREMENTS: "624",
  EVENTS: "625",
  SCENES: "627",
  SCENE_ASSIGNMENTS: "628",
  AUDITIONS: "630",
  ASSETS: "631",
  SESSIONS: "632",
  CLASSES: "633",
  FAMILIES: "634",
  VENUES: "635",
  SEATS: "636",
  PERFORMANCES: "637" // 🎯 Historical Sales Data
};

// --- 🛡️ CENTRAL FETCH HELPER ---
export async function fetchBaserow(endpoint: string, options: RequestInit = {}) {
  const { baseUrl, headers } = getAuth();
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${baseUrl}${endpoint}${separator}user_field_names=true`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers },
      cache: "no-store", 
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`❌ Baserow API Error [${res.status}]: ${errorBody} at ${url}`);
      if (options.method === 'DELETE' && res.status === 204) return true;
      return []; 
    }

    const data = await res.json();
    if (data?.results && Array.isArray(data.results)) return data.results;
    return data;
  } catch (error) {
    console.error("🌐 Network/Fetch Error:", error);
    return [];
  }
}

// ==============================================================================
// 📈 BOX OFFICE & ANALYTICS
// ==============================================================================

export async function getPerformanceAnalytics(productionId?: number) {
  let endpoint = `/api/database/rows/table/${TABLES.PERFORMANCES}/?size=200&order_by=field_6186`;
  if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
  
  const data = await fetchBaserow(endpoint);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
    const sold = parseFloat(row['Tickets Sold'] || row.field_6184 || 0);
    const capacity = parseFloat(row['Total Inventory'] || row.field_6183 || 0);
    const label = row['Performance'] || row.field_6182 || "Show";

    return {
      name: label,
      sold: sold,
      capacity: capacity,
      empty: Math.max(0, capacity - sold),
      fillRate: capacity > 0 ? Math.round((sold / capacity) * 100) : 0,
    };
  });
}

export async function getGlobalSalesSummary() {
  const data = await getPerformanceAnalytics();
  if (data.length === 0) return { totalSold: 0, avgFill: 0, showCount: 0 };

  const totalSold = data.reduce((sum, p) => sum + p.sold, 0);
  const avgFill = Math.round(data.reduce((sum, p) => sum + p.fillRate, 0) / data.length);

  return { totalSold, avgFill, showCount: data.length };
}

// ==============================================================================
// 🎭 SHOWS & PRODUCTION CONTEXT
// ==============================================================================

export async function getActiveShows() {
  const data = await fetchBaserow(`/api/database/rows/table/${TABLES.PRODUCTIONS}/?size=200`);
  if (!Array.isArray(data)) return [];
  return data.filter((row: any) => row["Is Active"] === true).map((row: any) => ({
    id: row.id,
    title: row.Title || "Untitled Show",
    location: row.Location?.value || "Unknown",
    type: row.Type?.value || "Main Stage",
    season: row.Season?.value || "General", 
  }));
}

export async function getActiveProduction() {
  const data = await fetchBaserow(`/api/database/rows/table/${TABLES.PRODUCTIONS}/?size=50`);
  if (!Array.isArray(data)) return null;
  return data.find((r: any) => r["Is Active"] === true) || data[0];
}

export async function getShowById(id: number) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.PRODUCTIONS}/${id}/`);
}

// ==============================================================================
// 👥 ROSTER & CREATIVE TEAM
// ==============================================================================

export async function getCreativeTeam(productionId: number) {
  const endpoint = `/api/database/rows/table/${TABLES.SHOW_TEAM}/?size=100&filter__Productions__link_row_has=${productionId}`;
  const data = await fetchBaserow(endpoint);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
    const personName = row.Person?.[0]?.value || "Unknown Staff";
    const roleName = row.Position?.[0]?.value || "Volunteer";
    return {
      id: row.id,
      name: personName,
      role: roleName,
      initials: personName.split(' ').map((n:any) => n[0]).join('').substring(0, 2).toUpperCase(),
      color: getRoleColor(roleName)
    };
  });
}

function getRoleColor(role: string) {
  const r = (role || "").toLowerCase();
  if (r.includes('director') && !r.includes('music') && !r.includes('assistant')) return 'bg-blue-600';
  if (r.includes('music')) return 'bg-pink-600';
  if (r.includes('choreographer')) return 'bg-emerald-600';
  if (r.includes('stage manager')) return 'bg-amber-500';
  return 'bg-zinc-600';
}

// ==============================================================================
// 📋 COMPLIANCE & CASTING
// ==============================================================================

export async function getComplianceData(productionId: number) {
  const [auditions, assignments] = await Promise.all([
    fetchBaserow(`/api/database/rows/table/${TABLES.AUDITIONS}/?size=200&filter__Production__link_row_has=${productionId}`),
    fetchBaserow(`/api/database/rows/table/${TABLES.ASSIGNMENTS}/?size=200&filter__Production__link_row_has=${productionId}`)
  ]);

  if (!Array.isArray(auditions) || !Array.isArray(assignments)) return [];

  const castPersonIds = new Set(assignments.map((a: any) => a.Person?.[0]?.id).filter(Boolean));

  return auditions
    .filter((row: any) => castPersonIds.has(row.Performer?.[0]?.id))
    .map((row: any) => ({
      id: row.id,
      performerName: row.Performer?.[0]?.value || "Unknown",
      signedAgreement: row['Commitment to Character']?.value || false,
      paidFees: row['Paid Fees']?.value || false,
      measurementsTaken: row['Measurements Taken']?.value || false,
      headshotSubmitted: row['Headshot']?.length > 0,
    }));
}

// ==============================================================================
// ✍️ WRITE ACTIONS (PATCH / POST)
// ==============================================================================

export async function updateAuditionSlot(rowId: number, data: any) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.AUDITIONS}/${rowId}/`, {
    method: "PATCH", body: JSON.stringify(data),
  });
}

export async function createCastAssignment(personId: number, roleId: number, productionId: number) {
  return await fetchBaserow(`/api/database/rows/table/${TABLES.ASSIGNMENTS}/`, {
    method: "POST", 
    body: JSON.stringify({ "Person": [personId], "Performance Identity": [roleId], "Production": [productionId] }),
  });
}

export async function deleteRow(tableId: string | number, rowId: number) {
  return await fetchBaserow(`/api/database/rows/table/${tableId}/${rowId}/`, { method: "DELETE" });
}