// app/lib/baserow.ts
import axios from "axios";

// --- CONFIGURATION ---
const BASE_URL = process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io";
const HEADERS = {
  "Authorization": `Token ${process.env.NEXT_PUBLIC_BASEROW_TOKEN || process.env.BASEROW_API_TOKEN}`,
  "Content-Type": "application/json",
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
  PERFORMANCES: "637",
  SALES_HISTORY: "637", 
};

// --- AUTHENTICATION FIELDS ---
// We use IDs for stability, but the Password field is looked up by name
const AUTH_FIELDS = {
  FULL_NAME: "field_5735",
  HEADSHOT: "field_5776",
  STATUS: "field_5782",
  APP_PASSWORD_NAME: "App Password", // The new text field you created
  CYT_NATIONAL_USER_ID: "field_6128",
  CYT_NATIONAL_INDIVIDUAL_EMAIL: "field_6131",
  CYT_ACCOUNT_PERSONAL_EMAIL: "field_6132",
};

export interface BaserowUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  cytId: string;
}

// ==============================================================================
// 🔐 AUTHENTICATION LOGIC (HYBRID)
// ==============================================================================

/**
 * 1. GOOGLE SSO: Finds a user by email only.
 * Returns null if email exists in Google but NOT in your Roster (Security Check).
 */
export async function findUserByEmail(email: string): Promise<BaserowUser | null> {
  try {
     const params = {
      user_field_names: false,
      filter_type: "OR",
      size: 1,
      [`filter__${AUTH_FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: email,
      [`filter__${AUTH_FIELDS.CYT_NATIONAL_INDIVIDUAL_EMAIL}__equal`]: email,
    };

    const response = await axios.get(`${BASE_URL}/api/database/rows/table/${TABLES.PEOPLE}/`, {
      headers: HEADERS, params
    });

    const results = response.data.results;
    if (!results || results.length === 0) return null;

    return formatUser(results[0], email);
  } catch (error) {
    console.error("SSO Lookup Error:", error);
    return null;
  }
}

/**
 * 2. CREDENTIALS: Verifies Email + Custom Password
 */
export async function verifyUserCredentials(email: string, passwordInput: string): Promise<BaserowUser | null> {
  try {
    // We request user_field_names: true so we can find "App Password" by readable name
    const params = {
      user_field_names: true, 
      filter_type: "OR",
      size: 5,
      [`filter__${AUTH_FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: email,
      [`filter__${AUTH_FIELDS.CYT_NATIONAL_INDIVIDUAL_EMAIL}__equal`]: email,
    };

    const response = await axios.get(`${BASE_URL}/api/database/rows/table/${TABLES.PEOPLE}/`, {
      headers: HEADERS, params
    });

    const results = response.data.results;
    if (!results || results.length === 0) return null;

    // Find the specific user where the password matches
    const userRecord = results.find((row: any) => {
        // Check the new "App Password" field
        const storedPass = String(row[AUTH_FIELDS.APP_PASSWORD_NAME] || "").trim();
        return storedPass === passwordInput.trim();
    });

    if (!userRecord) return null;

    return formatUser(userRecord, email);
  } catch (error) {
    console.error("Credentials Auth Error:", error);
    return null;
  }
}

// Helper to format raw Baserow data into a User Session
function formatUser(row: any, email: string) {
    // Handle both ID-based keys (from SSO) and Name-based keys (from Credentials)
    const headshotArray = row[AUTH_FIELDS.HEADSHOT] || row["Headshot"];
    const headshotUrl = Array.isArray(headshotArray) && headshotArray.length > 0 ? headshotArray[0].url : null;
    const statusObj = row[AUTH_FIELDS.STATUS] || row["Status"];

    return {
      id: row.id.toString(),
      name: row[AUTH_FIELDS.FULL_NAME] || row["Full Name"] || "Unknown",
      email: email,
      image: headshotUrl,
      role: statusObj?.value || "Guest",
      cytId: row[AUTH_FIELDS.CYT_NATIONAL_USER_ID] || row["CYT National User ID"] || "",
    };
}


// ==============================================================================
// 📈 BOX OFFICE & ANALYTICS (Existing)
// ==============================================================================

export async function getPerformanceAnalytics(productionId?: number) {
  const endpoint = `/api/database/rows/table/${TABLES.PERFORMANCES}/?size=200&order_by=field_6186`;
  const data = await fetchBaserow(endpoint);
  
  if (!Array.isArray(data) || data.length === 0) {
    console.error("⚠️ No data returned from Baserow or unauthorized.");
    return [];
  }

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
    if (data && data.results && Array.isArray(data.results)) return data.results;
    return data;
  } catch (error) {
    console.error("Network/Fetch Error:", error);
    return [];
  }
}

export async function getTableRows(tableId: string, productionId?: number) {
    let endpoint = `/api/database/rows/table/${tableId}/?size=200`;
    if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
    return await fetchBaserow(endpoint);
}

// ==============================================================================
// 🎭 COMPLEX / SPECIFIC GETTERS
// ==============================================================================

export async function getCreativeTeam(productionId: number) {
  const endpoint = `/api/database/rows/table/${TABLES.SHOW_TEAM}/?size=100&filter__Productions__link_row_has=${productionId}`;
  
  const data = await fetchBaserow(endpoint);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
    const personName = row.Person?.[0]?.value || "Unknown Staff";
    const personId = row.Person?.[0]?.id || 0;
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
  let endpoint = `/api/database/rows/table/${TABLES.AUDITIONS}/?size=200`;
  if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
  
  const data = await fetchBaserow(endpoint);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
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
      getAuditionSlots(productionId),
      getAssignments(productionId)
    ]);
  
    if (!Array.isArray(auditions) || !Array.isArray(assignments)) return [];
  
    const castPersonIds = new Set();
    assignments.forEach((a: any) => {
      if (a.Person && a.Person.length > 0) castPersonIds.add(a.Person[0].id);
    });
  
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

// --- STANDARD GETTERS ---

export async function getScenes(productionId?: number) {
  let endpoint = `/api/database/rows/table/${TABLES.SCENES}/?size=200`;
  if (productionId) endpoint += `&filter__Production__link_row_has=${productionId}`;
  return await fetchBaserow(endpoint);
}

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