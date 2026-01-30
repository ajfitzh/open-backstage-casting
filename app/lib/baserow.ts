import { notFound } from "next/navigation";

// --- CONFIGURATION ---
const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");

// 1. UNIFIED TOKEN LOGIC
const API_TOKEN = process.env.BASEROW_API_KEY || process.env.BASEROW_API_TOKEN || process.env.NEXT_PUBLIC_BASEROW_TOKEN;

// --- TABLE MAP ---
// 🚨 Ensure these IDs match your Baserow URL exactly
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
  CLASSES: "633",
  SPACES: "638",
  RENTAL_RATES: "639",
  VENUES: "635",
  SESSIONS:"632"
};

// --- AUTH FIELDS ---
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
// 🛡️ HELPERS
// ==============================================================================

async function fetchBaserow(endpoint: string, params: any = {}, config: any = {}) {
  const { size = "100", ...fetchOptions } = config; 
  
  const queryString = new URLSearchParams({ 
    user_field_names: "true", 
    size, 
    ...params 
  }).toString();

  const url = `${BASE_URL}/api${endpoint}?${queryString}`;

  const res = await fetch(url, {
    ...fetchOptions, 
    headers: {
      "Authorization": `Token ${API_TOKEN}`,
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
    next: { revalidate: 0, ...fetchOptions.next }, // 🚨 Force No-Cache to debug missing data
  });

  if (!res.ok) {
    console.error(`Baserow Error [${endpoint}]: ${res.status} ${res.statusText}`);
    return [];
  }

  if (res.status === 204) return [];

  const data = await res.json();
  return data.results || data;
}

// ==============================================================================
// 🔐 AUTHENTICATION
// ==============================================================================

export async function findUserByEmail(email: string): Promise<BaserowUser | null> {
  const params = {
    filter_type: "OR",
    size: "1",
    [`filter__${AUTH_FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: email,
    [`filter__${AUTH_FIELDS.CYT_NATIONAL_INDIVIDUAL_EMAIL}__equal`]: email,
  };

  const results = await fetchBaserow(`/database/rows/table/${TABLES.PEOPLE}/`, params);
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

  const results = await fetchBaserow(`/database/rows/table/${TABLES.PEOPLE}/`, params);
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

function safeString(field: any, fallback: string = ""): string {
  if (!field) return fallback;
  if (typeof field === 'string') return field;
  if (Array.isArray(field)) {
    return field.length > 0 ? (field[0].value || field[0].name || fallback) : fallback;
  }
  if (typeof field === 'object') {
    return field.value || field.name || fallback;
  }
  return String(field); 
}

// 🚨 DEBUGGED CLASS FETCHER
export async function getClasses() {
  // Fetch raw rows without filters to see what we actually have
  const data = await fetchBaserow(`/database/rows/table/${TABLES.CLASSES}/`, {}, { size: "200" });

  if (!Array.isArray(data)) {
    console.error("❌ getClasses: Returned non-array data", data);
    return [];
  }

  console.log(`✅ getClasses: Fetched ${data.length} rows from Table ${TABLES.CLASSES}`);

  return data.map((row: any) => {
    // 1. Enrollment Logic
    let enrollment = 0;
    if (Array.isArray(row.Students)) {
      enrollment = row.Students.length;
    } else if (typeof row.Students === 'string' && row.Students.trim().length > 0) {
      enrollment = row.Students.split(',').length;
    }

    // 2. Space Logic
    const spaceLink = row['Space'] || row['SPACE'] || row['space']; 
    const spaceId = Array.isArray(spaceLink) && spaceLink.length > 0 ? spaceLink[0].id : null;
    const spaceName = Array.isArray(spaceLink) && spaceLink.length > 0 ? spaceLink[0].value : null;

    // 3. Name Fallback (Check 'Class Name', 'Name', 'Title')
    const className = safeString(row['Class Name']) || safeString(row['Name']) || safeString(row['Title']) || "Unnamed Class";

    return {
      id: row.id,
      name: className,
      session: safeString(row.Session, "Unknown"),
      teacher: safeString(row.Teacher, "TBA"),
      location: safeString(row.Location, "Main Campus"),
      day: safeString(row.Day, "TBD"),
      ageRange: safeString(row['Age Range'], "All Ages"),
      campus: safeString(row['Campus'], ""), 
      spaceId: spaceId,            
      spaceName: spaceName,
      students: enrollment,
    };
  });
}

export async function getVenueLogistics() {
  const [venuesData, spacesData, ratesData, classesData] = await Promise.all([
    fetchBaserow(`/database/rows/table/${TABLES.VENUES}/`, {}, { size: "100" }),
    fetchBaserow(`/database/rows/table/${TABLES.SPACES}/`, {}, { size: "2000" }),
    fetchBaserow(`/database/rows/table/${TABLES.RENTAL_RATES}/`, {}, { size: "500" }),
    getClasses()
  ]);

  if (!Array.isArray(venuesData) || !Array.isArray(spacesData)) return [];

  return venuesData.map((venue: any) => {
    const venueRates = Array.isArray(ratesData) ? ratesData.filter((r: any) => r.Venue?.some((v: any) => v.id === venue.id)) : [];
    
    const activeRate = venueRates.sort((a: any, b: any) => {
      const sessionA = safeString(a.Session);
      const sessionB = safeString(b.Session);
      const yearA = parseInt(sessionA.match(/\d{4}/)?.[0] || "0");
      const yearB = parseInt(sessionB.match(/\d{4}/)?.[0] || "0");
      return yearB - yearA; 
    })[0];

    const venueSpaces = spacesData
      .filter((space: any) => space.Venue?.some((v: any) => v.id === venue.id))
      .map((space: any) => {
        const occupiedBy = classesData.filter((cls: any) => cls.spaceId === space.id);
        
        return {
          id: space.id,
          name: safeString(space['Room Name'] || space['Full Room Name'], "Unnamed Room"),
          capacity: parseInt(space.Capacity) || 0,
          floorType: safeString(space['Floor Type'], "Unknown"),
          classes: occupiedBy
        };
      });

    return {
      id: venue.id,
      name: safeString(venue['Venue Name'], "Unknown Venue"),
      type: safeString(venue.Type, "General"),
      contact: safeString(venue['Contact Name'], "N/A"),
      spaces: venueSpaces, 
      rates: {
        hourly: parseFloat(activeRate?.['Hourly Rate'] || 0),
        weekend: parseFloat(activeRate?.['Weekend Rate'] || 0),
        flat: parseFloat(activeRate?.['Flat Rate'] || 0),
        session: safeString(activeRate?.Session, "Default")
      }
    };
  }).filter((venue: any) => venue.spaces.length > 0);
}

export async function getPerformanceAnalytics(productionId?: number) {
  const data = await fetchBaserow(`/database/rows/table/${TABLES.PERFORMANCES}/`, {}, { size: "200" });
  if (!Array.isArray(data)) return [];
  
  return data.map((row: any) => {
    const sold = parseFloat(row['Tickets Sold'] || row.field_6184 || 0);
    const capacity = parseFloat(row['Total Inventory'] || row.field_6183 || 0);
    return {
      name: row['Performance'] || row.field_6182 || "Show",
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

// ==============================================================================
// 📋 COMPLIANCE & CASTING
// ==============================================================================

/**
 * 🚨 CRITICAL CHANGE FOR HEADER CONTEXT SWITCHER
 * This now returns PRODUCTIONS (Instances) instead of Master Shows.
 * This fixes the issue where the header was showing generic titles.
 */
export async function getAllShows() {
  // Switched from TABLES.MASTER_SHOWS to TABLES.PRODUCTIONS
  return await fetchBaserow(`/database/rows/table/${TABLES.PRODUCTIONS}/`, {}, { size: "200" });
}

export async function getAllProductions() {
  return await getAllShows(); // Alias for safety
}

export async function getActiveProduction() {
  const productions = await getAllShows();
  if (!Array.isArray(productions)) return null;
  return productions.find((p: any) => p.Active?.value === true || p.Active === true) || productions[0];
}

export async function getShowById(showId: string | number) {
  if (!showId) return null;
  // This likely needs to fetch from PRODUCTIONS now if your pages are production-based
  return await fetchBaserow(`/database/rows/table/${TABLES.PRODUCTIONS}/${showId}/`);
}

export async function getTableRows(tableId: string, productionId?: number) {
    const params: any = { size: "200" };
    if (productionId) params[`filter__Production__link_row_has`] = productionId;
    return await fetchBaserow(`/database/rows/table/${tableId}/`, params);
}

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

export async function getCreativeTeam(productionId: number) {
  const params = { size: "100", filter__Productions__link_row_has: productionId };
  const data = await fetchBaserow(`/database/rows/table/${TABLES.SHOW_TEAM}/`, params);
  
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

// ==============================================================================
// ✍️ WRITE FUNCTIONS (ACTIONS)
// ==============================================================================

export async function updateAuditionSlot(rowId: number, data: any) {
  const cleanData = { ...data };
  ["Vocal Score", "Acting Score", "Dance Score"].forEach(key => {
      if (key in cleanData) cleanData[key] = Number(cleanData[key]) || 0; 
  });
  return await fetchBaserow(`/database/rows/table/${TABLES.AUDITIONS}/${rowId}/`, {}, { method: "PATCH", body: JSON.stringify(cleanData) });
}

export async function submitAudition(personId: number, productionId: number, data: any) {
  return await fetchBaserow(`/database/rows/table/${TABLES.AUDITIONS}/`, {}, { method: "POST", body: JSON.stringify({ ...data, "Performer": [personId], "Production": [productionId] }) });
}

export async function createCastAssignment(personId: number, roleId: number, productionId: number) {
  return await fetchBaserow(`/database/rows/table/${TABLES.ASSIGNMENTS}/`, {}, { method: "POST", body: JSON.stringify({ "Person": [personId], "Performance Identity": [roleId], "Production": [productionId] }) });
}

export async function updateRole(id: number, data: any) {
  return await fetchBaserow(`/database/rows/table/${TABLES.BLUEPRINT_ROLES}/${id}/`, {}, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteRow(tableId: string | number, rowId: number) {
  return await fetchBaserow(`/database/rows/table/${tableId}/${rowId}/`, {}, { method: "DELETE" });
}

export async function createProductionAsset(name: string, url: string, type: string, productionId: number) {
  return await fetchBaserow(`/database/rows/table/${TABLES.ASSETS}/`, {}, { method: "POST", body: JSON.stringify({ "Name": name, "Link": url, "Type": type, "Production": [productionId] }) });
}

// ==============================================================================
// 👨‍👩‍👧‍👦 FAMILY & HOUSEHOLD LOGIC
// ==============================================================================

const TABLE_FAMILIES = 634;
const FIELD_FAMILY_EMAIL = 'field_6126'; 
const FIELD_CYT_ID = 'field_6127';       

const TABLE_PEOPLE = 599;
const FIELD_LINK_TO_FAMILY = 'field_6153'; 
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
  
  try {
    const familyData = await fetchBaserow(
        `/database/rows/table/${TABLE_FAMILIES}/`, 
        { [`filter__${FIELD_FAMILY_EMAIL}__equal`]: userEmail },
        { next: { revalidate: 0 } }
    );

    if (!Array.isArray(familyData) || familyData.length === 0) {
        return null;
    }

    const familyRow = familyData[0];

    const peopleData = await fetchBaserow(
        `/database/rows/table/${TABLES.PEOPLE}/`,
        { [`filter__${FIELD_LINK_TO_FAMILY}__link_row_has`]: familyRow.id },
        { next: { revalidate: 0 } }
    );

    const peopleRows = Array.isArray(peopleData) ? peopleData : [];
    const headOfHouse = peopleRows.find((p: any) => p[FIELDS_PEOPLE.ROLE]?.value === 'Adult') || peopleRows[0];

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