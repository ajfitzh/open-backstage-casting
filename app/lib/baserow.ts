import { notFound } from "next/navigation";

// --- CONFIGURATION ---
// Removes trailing slash to ensure clean URL construction
const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");
const API_TOKEN = process.env.NEXT_PUBLIC_BASEROW_TOKEN || process.env.BASEROW_API_TOKEN;

const HEADERS = {
  "Authorization": `Token ${API_TOKEN}`,
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
const AUTH_FIELDS = {
  FULL_NAME: "field_5735",
  HEADSHOT: "field_5776",
  STATUS: "field_5782",
  APP_PASSWORD_NAME: "App Password",
  CYT_NATIONAL_USER_ID: "field_6128",
  CYT_NATIONAL_INDIVIDUAL_EMAIL: "field_6131",
  CYT_ACCOUNT_PERSONAL_EMAIL: "field_6132",
};

// --- TYPES ---
export interface BaserowUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  cytId: string;
}

export interface FamilyData {
  id: string; 
  cytId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  familyMembers: Person[];
}

export interface Person {
  id: number;
  name: string;
  role: string;
  age: number;
  image: string | null;
}

// ==============================================================================
// 🛡️ CENTRAL FETCH HELPER (CRITICAL FIX)
// ==============================================================================

/**
 * Universal fetch wrapper for Baserow.
 * 1. Automatically prepends '/api' if missing.
 * 2. Checks for HTML responses (404 pages) to prevent crashes.
 * 3. Handles Query Params.
 */
export async function fetchBaserow(endpoint: string, options: RequestInit = {}, queryParams: Record<string, any> = {}) {
  try {
    // 1. Construct Query String
    const params = new URLSearchParams({
      user_field_names: "true", 
      ...queryParams
    });

    // 2. FORCE /api PREFIX logic
    // If the endpoint doesn't start with /api, and it's not a full URL, add it.
    let path = endpoint;
    if (!path.startsWith("http") && !path.startsWith("/api")) {
        // Ensure leading slash
        if (!path.startsWith("/")) path = `/${path}`;
        path = `/api${path}`;
    }

    const separator = path.includes('?') ? '&' : '?';
    const finalUrl = `${BASE_URL}${path}${separator}${params.toString()}`;

    // 3. Fetch
    const res = await fetch(finalUrl, {
      ...options,
      headers: { ...HEADERS, ...options.headers },
      cache: options.cache || "no-store", 
    });

    // 4. Safety Check: Detect HTML (Webpage) responses
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        console.error(`❌ [Baserow] Critical Error: Received HTML instead of JSON from ${finalUrl}.`);
        console.error("   This usually means the URL is pointing to the website, not the API.");
        return null; // Return null so we don't crash JSON.parse
    }

if (!res.ok) {
      // ATTEMPT TO READ ERROR BODY
      let errorBody = "";
      try {
        const jsonError = await res.json();
        errorBody = JSON.stringify(jsonError, null, 2);
      } catch {
        errorBody = await res.text();
      }

      console.error(`❌ [Baserow] API Error [${res.status}] at ${finalUrl}`);
      console.error(`   Server Response: ${errorBody}`); // <--- THIS IS THE GOLDEN TICKET
      
      if (options.method === 'DELETE') return true; 
      return []; 
    }

    const data = await res.json();
    
    // 5. Normalize Return
    if (data && data.results && Array.isArray(data.results)) return data.results;
    return data;

  } catch (error) {
    console.error("❌ [Baserow] Network/Fetch Error:", error);
    return [];
  }
}


// ==============================================================================
// 🔐 AUTHENTICATION LOGIC
// ==============================================================================

export async function findUserByEmail(email: string): Promise<BaserowUser | null> {
  const params = {
    filter_type: "OR",
    size: "1",
    [`filter__${AUTH_FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: email,
    [`filter__${AUTH_FIELDS.CYT_NATIONAL_INDIVIDUAL_EMAIL}__equal`]: email,
  };

  const results = await fetchBaserow(`/database/rows/table/${TABLES.PEOPLE}/`, {}, params);

  if (!results || results.length === 0) return null;
  return formatUser(results[0], email);
}

export async function verifyUserCredentials(email: string, passwordInput: string): Promise<BaserowUser | null> {
  const params = {
    filter_type: "OR",
    size: "5",
    [`filter__${AUTH_FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: email,
    [`filter__${AUTH_FIELDS.CYT_NATIONAL_INDIVIDUAL_EMAIL}__equal`]: email,
  };

  const results = await fetchBaserow(`/database/rows/table/${TABLES.PEOPLE}/`, {}, params);

  if (!results || results.length === 0) return null;

  const userRecord = results.find((row: any) => {
      const storedPass = String(row[AUTH_FIELDS.APP_PASSWORD_NAME] || "").trim();
      return storedPass === passwordInput.trim();
  });

  if (!userRecord) return null;

  return formatUser(userRecord, email);
}

function formatUser(row: any, email: string) {
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
// 📈 ANALYTICS & GETTERS
// ==============================================================================

export async function getPerformanceAnalytics(productionId?: number) {
  const data = await fetchBaserow(`/database/rows/table/${TABLES.PERFORMANCES}/`, {}, { size: "200", order_by: "field_6186" });
  
  if (!Array.isArray(data) || data.length === 0) return [];

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
  return { totalSold, avgFill, performanceCount: data.length };
}

export async function getTableRows(tableId: string, productionId?: number) {
    const params: any = { size: "200" };
    if (productionId) params[`filter__Production__link_row_has`] = productionId;
    return await fetchBaserow(`/database/rows/table/${tableId}/`, {}, params);
}

export async function getCreativeTeam(productionId: number) {
  const params = { size: "100", filter__Productions__link_row_has: productionId };
  const data = await fetchBaserow(`/database/rows/table/${TABLES.SHOW_TEAM}/`, {}, params);
  
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
    const personName = row.Person?.[0]?.value || "Unknown Staff";
    return {
      id: row.id,
      name: personName,
      personId: row.Person?.[0]?.id || 0,
      role: row.Position?.[0]?.value || "Volunteer",
      initials: personName.split(' ').map((n:string) => n[0]).join('').substring(0, 2).toUpperCase(),
      color: getRoleColor(row.Position?.[0]?.value)
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
  const data = await fetchBaserow(`/database/rows/table/${TABLES.PRODUCTIONS}/`, {}, { size: "200" });
  if (!Array.isArray(data)) return [];
  return data
    .filter((row: any) => row["Is Active"] === true)
    .map((row: any) => ({
      id: row.id,
      title: row.Title || "Untitled Show",
      location: row.Location?.value || row.Branch?.value || "Unknown",
      type: row.Type?.value || "Main Stage",
      season: row.Season?.value || "General", 
    }));
}
// app/lib/baserow.ts

export async function getAllShows() {
  // CLEANER: Pass params as object. 
  // This automatically handles 'user_field_names', 'size', and 'order_by'
  const data = await fetchBaserow(
    `/database/rows/table/${TABLES.PRODUCTIONS}/`, 
    {}, // options
    { 
      size: "200", 
      order_by: "-id" // "-id" means descending (newest first)
    } 
  );
  
  if (!Array.isArray(data)) return [];
  
  return data.map((row: any) => ({
    id: row.id,
    title: row.Title || "Untitled Show",
    location: row.Location?.value || row.Branch?.value || "Unknown",
    type: row.Type?.value || "Main Stage",
    season: row.Season?.value || "Unknown Season",
    isActive: row["Is Active"]
  }));
}
export async function getShowById(id: number) {
  if (!id) return null;
  return await fetchBaserow(`/database/rows/table/${TABLES.PRODUCTIONS}/${id}/`);
}

export async function getActiveProduction() {
  const data = await fetchBaserow(`/database/rows/table/${TABLES.PRODUCTIONS}/`, {}, { size: "50" });
  if (!Array.isArray(data)) return null;
  return data.find((r: any) => r["Is Active"] === true) || data[0];
}

// --- COMPLIANCE & CASTING ---

export async function getAuditionees(productionId?: number) { return await getTableRows(TABLES.AUDITIONS, productionId); }
export async function getAssignments(productionId?: number) { return await getTableRows(TABLES.ASSIGNMENTS, productionId); }

export async function getComplianceData(productionId?: number) {
    if (!productionId) return [];
    const [auditions, assignments] = await Promise.all([ getAuditionSlots(productionId), getAssignments(productionId) ]);
  
    if (!Array.isArray(auditions) || !Array.isArray(assignments)) return [];
  
    const castPersonIds = new Set();
    assignments.forEach((a: any) => { if (a.Person && a.Person.length > 0) castPersonIds.add(a.Person[0].id); });
  
    return auditions
      .filter((row: any) => row.Performer?.[0]?.id && castPersonIds.has(row.Performer[0].id))
      .map((row: any) => ({
        id: row.id,
        performerName: row.Performer?.[0]?.value || "Unknown",
        signedAgreement: row['Commitment to Character']?.value || false,
        paidFees: row['Paid Fees']?.value || false,
        measurementsTaken: row['Measurements Taken']?.value || false,
        headshotSubmitted: (row['Headshot'] && row['Headshot'].length > 0),
      }));
}

// --- STANDARD GETTERS ---

export async function getScenes(productionId?: number) { return await getTableRows(TABLES.SCENES, productionId); }
export async function getRoles() { return await fetchBaserow(`/database/rows/table/${TABLES.BLUEPRINT_ROLES}/`, {}, { size: "200" }); }
export async function getPeople() { return await fetchBaserow(`/database/rows/table/${TABLES.PEOPLE}/`, {}, { size: "200" }); }
export async function getCommitteePreferences(activeId: number) { return await fetchBaserow(`/database/rows/table/${TABLES.COMMITTEE_PREFS}/`, {}, { size: "200" }); }
export async function getProductionEvents(productionId?: number) { return await getTableRows(TABLES.EVENTS, productionId); }
export async function getAuditionSlots(productionId?: number) { return await getTableRows(TABLES.AUDITIONS, productionId); }
export async function getConflicts(productionId?: number) { return await getTableRows(TABLES.CONFLICTS, productionId); }
export async function getProductionAssets(productionId: number) { return await getTableRows(TABLES.ASSETS, productionId); }

// ==============================================================================
// ✍️ WRITE FUNCTIONS (ACTIONS)
// ==============================================================================

export async function updateAuditionSlot(rowId: number, data: any) {
  const cleanData = { ...data };
  ["Vocal Score", "Acting Score", "Dance Score"].forEach(key => {
      if (key in cleanData) cleanData[key] = Number(cleanData[key]) || 0; 
  });
  return await fetchBaserow(`/database/rows/table/${TABLES.AUDITIONS}/${rowId}/`, { method: "PATCH", body: JSON.stringify(cleanData) });
}

export async function submitAudition(personId: number, productionId: number, data: any) {
  return await fetchBaserow(`/database/rows/table/${TABLES.AUDITIONS}/`, { method: "POST", body: JSON.stringify({ ...data, "Performer": [personId], "Production": [productionId] }) });
}

export async function createCastAssignment(personId: number, roleId: number, productionId: number) {
  return await fetchBaserow(`/database/rows/table/${TABLES.ASSIGNMENTS}/`, { method: "POST", body: JSON.stringify({ "Person": [personId], "Performance Identity": [roleId], "Production": [productionId] }) });
}

export async function updateRole(id: number, data: any) {
  return await fetchBaserow(`/database/rows/table/${TABLES.BLUEPRINT_ROLES}/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteRow(tableId: string | number, rowId: number) {
  return await fetchBaserow(`/database/rows/table/${tableId}/${rowId}/`, { method: "DELETE" });
}

export async function createProductionAsset(name: string, url: string, type: string, productionId: number) {
  return await fetchBaserow(`/database/rows/table/${TABLES.ASSETS}/`, { method: "POST", body: JSON.stringify({ "Name": name, "Link": url, "Type": type, "Production": [productionId] }) });
}

// ==============================================================================
// 👨‍👩‍👧‍👦 FAMILY & HOUSEHOLD LOGIC
// ==============================================================================

// Table: FAMILIES (634)
const TABLE_FAMILIES = 634;
const FIELD_FAMILY_EMAIL = 'field_6126'; // "Email"
const FIELD_CYT_ID = 'field_6127';       // "CYT National ID"

// Table: PEOPLE (599)
const TABLE_PEOPLE = 599;
const FIELD_LINK_TO_FAMILY = 'field_6153'; // Link to FAMILIES
const FIELDS_PEOPLE = {
  FULL_NAME: 'Full Name',
  ROLE: 'Status',        
  DOB: 'Date of Birth',  
  HEADSHOT: 'Headshot',  
  PHONE: 'Phone Number', 
  ADDRESS: 'Address',    
  CITY: 'City',          
  STATE: 'State',        
  ZIP: 'Zipcode',        
  EMAIL_PERSONAL: 'CYT Account Personal Email' 
};

export async function getFamilyMembers(userEmail: string | null | undefined): Promise<FamilyData | null> {
  if (!userEmail) return null;
  
  console.log(`\n🔍 [Baserow] STARTING LOOKUP FOR: ${userEmail}`);

  try {
    // 1. Fetch Family
    const familyData = await fetchBaserow(
        `/database/rows/table/${TABLE_FAMILIES}/`, 
        { next: { revalidate: 0 } },
        { [`filter__${FIELD_FAMILY_EMAIL}__equal`]: userEmail }
    );

    if (!Array.isArray(familyData) || familyData.length === 0) {
        console.warn(`⚠️ [Baserow] No family found for email: ${userEmail}`);
        return null;
    }

    const familyRow = familyData[0];
    console.log(`✅ [Baserow] Family Found: ID ${familyRow.id}`);

    // 2. Fetch Linked People
    const peopleData = await fetchBaserow(
        `/database/rows/table/${TABLES.PEOPLE}/`,
        { next: { revalidate: 0 } },
        { [`filter__${FIELD_LINK_TO_FAMILY}__link_row_has`]: familyRow.id }
    );

    const peopleRows = Array.isArray(peopleData) ? peopleData : [];
    console.log(`✅ [Baserow] People Found: ${peopleRows.length}`);

    // 3. Identify Head of Household
    const headOfHouse = peopleRows.find((p: any) => p[FIELDS_PEOPLE.ROLE]?.value === 'Adult') || peopleRows[0];

    // Map Address safely
    const addr = headOfHouse?.[FIELDS_PEOPLE.ADDRESS] || '';
    const city = headOfHouse?.[FIELDS_PEOPLE.CITY] || '';
    const fullAddress = addr ? `${addr}, ${city}` : '';

    return {
      id: familyRow.id.toString(),
      cytId: familyRow[FIELD_CYT_ID] || "",
      name: headOfHouse ? headOfHouse[FIELDS_PEOPLE.FULL_NAME] : "Family Account",
      email: userEmail,
      phone: headOfHouse?.[FIELDS_PEOPLE.PHONE] || "", 
      address: fullAddress, 
      role: "Family Administrator", 
      
      familyMembers: peopleRows.map((p: any) => {
        // Calculate Age
        const dob = p[FIELDS_PEOPLE.DOB] ? new Date(p[FIELDS_PEOPLE.DOB]) : null;
        let age = 0;
        if (dob) {
           const ageDifMs = Date.now() - dob.getTime();
           const ageDate = new Date(ageDifMs);
           age = Math.abs(ageDate.getUTCFullYear() - 1970);
        }

        const headshotArray = p[FIELDS_PEOPLE.HEADSHOT];
        const imageUrl = (Array.isArray(headshotArray) && headshotArray.length > 0) ? headshotArray[0].url : null;

        return {
          id: p.id,
          name: p[FIELDS_PEOPLE.FULL_NAME],
          role: p[FIELDS_PEOPLE.ROLE]?.value || "Student",
          age: age,
          image: imageUrl
        };
      })
    };
  } catch (error) {
    console.error("❌ [Baserow] Critical Error in getFamilyMembers:", error);
    return null;
  }
}