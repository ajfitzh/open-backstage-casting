import { notFound } from "next/navigation";
import { DB } from "@/app/lib/schema"; // 👈 Your new Source of Truth

// --- CONFIGURATION ---
const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");

// 🚨 FIX: Added NEXT_PUBLIC_BASEROW_TOKEN to the list so it finds your .env value
const API_TOKEN = process.env.NEXT_PUBLIC_BASEROW_TOKEN || process.env.BASEROW_API_TOKEN || process.env.BASEROW_API_KEY;

const HEADERS = {
  "Authorization": `Token ${API_TOKEN}`,
  "Content-Type": "application/json",
};

// --- LEGACY TABLE MAP ---
export const TABLES = {
  PEOPLE: DB.PEOPLE.ID,
  PRODUCTIONS: DB.PRODUCTIONS.ID,
  CLASSES: DB.CLASSES.ID,
  VENUES: DB.VENUES.ID,
  SPACES: DB.SPACES.ID,
  RENTAL_RATES: DB.RENTAL_RATES.ID,
  AUDITIONS: DB.AUDITIONS.ID,
  ASSIGNMENTS: DB.ASSIGNMENTS.ID,
  BLUEPRINT_ROLES: DB.BLUEPRINT_ROLES.ID,
  SCENES: DB.SCENES.ID,
  EVENTS: DB.EVENTS.ID,
  CONFLICTS: DB.CONFLICTS.ID,
  COMMITTEE_PREFS: DB.COMMITTEE_PREFS.ID,
  ASSETS: DB.ASSETS.ID,
  SHOW_TEAM: DB.SHOW_TEAM.ID,
};

// ==============================================================================
// 🛡️ HELPERS (The "Adapter" Layer)
// ==============================================================================

// Central Fetcher - NO user_field_names
export async function fetchBaserow(endpoint: string, options: RequestInit = {}, queryParams: Record<string, any> = {}) {
  try {
    // 🚨 KEY CHANGE: removed user_field_names: "true"
    const params = new URLSearchParams(queryParams);

    let path = endpoint;
    if (!path.startsWith("http") && !path.startsWith("/api")) {
        if (!path.startsWith("/")) path = `/${path}`;
        path = `/api${path}`;
    }

    const finalUrl = `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}${params.toString()}`;

    const res = await fetch(finalUrl, {
      ...options,
      headers: { ...HEADERS, ...options.headers },
      cache: options.cache || "no-store", 
    });

    if (!res.ok) {
      if (res.status === 404) return []; // Graceful fail for empty lookups
      console.error(`❌ [Baserow] API Error [${res.status}] at ${finalUrl}`);
      return []; 
    }

    const data = await res.json();
    if (data && data.results && Array.isArray(data.results)) return data.results;
    return data;

  } catch (error) {
    console.error("❌ [Baserow] Network/Fetch Error:", error);
    return [];
  }
}

/**
 * Robust Getter for Raw Baserow Data
 * Handles:
 * - String/Number: Returns value
 * - Single Select: Returns value property
 * - Link Row: Returns value of first item (or name)
 */
function safeGet(field: any, fallback: string | number = ""): any {
  if (field === null || field === undefined) return fallback;
  
  // Primitive types (Text, Number, Boolean)
  if (typeof field === 'string' || typeof field === 'number' || typeof field === 'boolean') return field;
  
  // Arrays (Link Row, File) - Return first item's value/name/url
  if (Array.isArray(field)) {
    if (field.length === 0) return fallback;
    const first = field[0];
    return first.value || first.name || first.url || fallback;
  }
  
  // Objects (Single Select)
  if (typeof field === 'object') {
    return field.value || field.name || fallback;
  }
  
  return fallback;
}

// Extract ID from a Linked Row array safely
function safeId(field: any): number | null {
  if (Array.isArray(field) && field.length > 0) return field[0].id;
  return null;
}

// Generic Delete
export async function deleteRow(tableId: string, rowId: number | string) {
  const url = `/database/rows/table/${tableId}/${rowId}/`;
  const res = await fetchBaserow(url, { method: "DELETE" });
  return res !== null;
}

// ==============================================================================
// 🎓 EDUCATION (CLASSES & VENUES) - REFACTORED
// ==============================================================================

export async function getClasses() {
  let allRows: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const rawData = await fetchBaserow(
      `/database/rows/table/${DB.CLASSES.ID}/`, 
      {}, 
      { page: page.toString(), size: "200" } 
    );

    if (!Array.isArray(rawData) || rawData.length === 0) {
      hasMore = false;
    } else {
      allRows = [...allRows, ...rawData];
      if (rawData.length < 200) hasMore = false; 
      else page++;
    }
  }

  return allRows.map((row: any) => {
    const students = row[DB.CLASSES.FIELDS.STUDENTS] || []; 
    const enrollment = Array.isArray(students) ? students.length : 0;

    return {
      id: row.id,
      name: safeGet(row[DB.CLASSES.FIELDS.CLASS_NAME], "Unnamed Class"),
      session: safeGet(row[DB.CLASSES.FIELDS.SESSION], "Unknown"),
      teacher: safeGet(row[DB.CLASSES.FIELDS.TEACHER], "TBA"),
      location: safeGet(row[DB.CLASSES.FIELDS.LOCATION], "Main Campus"),
      spaceId: safeId(row[DB.CLASSES.FIELDS.SPACE]),
      spaceName: safeGet(row[DB.CLASSES.FIELDS.SPACE]),
      day: safeGet(row[DB.CLASSES.FIELDS.DAY], "TBD"),
      students: enrollment,
      ageRange: safeGet(row[DB.CLASSES.FIELDS.AGE_RANGE], "All Ages"),
    };
  });
}

export async function getClassById(classId: string) {
  const row = await fetchBaserow(`/database/rows/table/${DB.CLASSES.ID}/${classId}/`);

  if (!row || row.error) return null;

  const students = row[DB.CLASSES.FIELDS.STUDENTS] || []; 
  
  return {
    id: row.id,
    name: safeGet(row[DB.CLASSES.FIELDS.CLASS_NAME], "Unnamed Class"),
    session: safeGet(row[DB.CLASSES.FIELDS.SESSION], "Unknown"),
    teacher: safeGet(row[DB.CLASSES.FIELDS.TEACHER], "TBA"),
    location: safeGet(row[DB.CLASSES.FIELDS.LOCATION], "Main Campus"),
    day: safeGet(row[DB.CLASSES.FIELDS.DAY], "TBD"),
    time: safeGet(row[DB.CLASSES.FIELDS.TIME_SLOT], "TBD"),
    description: "", // Add Description to schema if exists, else empty
    ageRange: safeGet(row[DB.CLASSES.FIELDS.AGE_RANGE], "All Ages"),
    spaceName: safeGet(row[DB.CLASSES.FIELDS.SPACE]),
    students: Array.isArray(students) ? students.length : 0,
  };
}

// app/lib/baserow.ts

export async function getClassRoster(classId: string) {
  const params = {
    // API Filter (Primary)
    [`filter__${DB.PEOPLE.FIELDS.CLASSES}__link_row_has`]: classId, 
    size: "200"
  };

  const students = await fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/`, {}, params);

  if (!Array.isArray(students)) return [];

  // 🚨 CRITICAL FIX: Manual JS Filter (Secondary)
  // Ensures we ONLY return students actually linked to this class ID.
  const verifiedStudents = students.filter((s: any) => {
    const linkedClasses = s[DB.PEOPLE.FIELDS.CLASSES] || [];
    // Check if any linked class matches our current ID
    return linkedClasses.some((c: any) => c.id.toString() === classId.toString());
  });

  return verifiedStudents.map((s: any) => ({
    id: s.id,
    name: safeGet(s[DB.PEOPLE.FIELDS.FULL_NAME] || s[DB.PEOPLE.FIELDS.FIRST_NAME]),
    age: parseInt(safeGet(s[DB.PEOPLE.FIELDS.AGE], 0)),
    email: safeGet(s[DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL] || s[DB.PEOPLE.FIELDS.CYT_NATIONAL_INDIVIDUAL_EMAIL]),
    phone: safeGet(s[DB.PEOPLE.FIELDS.PHONE_NUMBER]),
    photo: s[DB.PEOPLE.FIELDS.HEADSHOT]?.[0]?.url || null,
    status: safeGet(s[DB.PEOPLE.FIELDS.STATUS], "Student"),
    medical: safeGet(s[DB.PEOPLE.FIELDS.MEDICAL_NOTES], "None"),
  }));
}

export async function getVenueLogistics() {
  const [venuesData, spacesData, ratesData, classesData] = await Promise.all([
    fetchBaserow(`/database/rows/table/${DB.VENUES.ID}/`, {}, { size: "200" }),
    fetchBaserow(`/database/rows/table/${DB.SPACES.ID}/`, {}, { size: "200" }),
    fetchBaserow(`/database/rows/table/${DB.RENTAL_RATES.ID}/`, {}, { size: "200" }),
    getClasses()
  ]);

  if (!Array.isArray(venuesData) || !Array.isArray(spacesData)) return [];

  return venuesData.map((venue: any) => {
    // Note: Checking linkage using ID logic. 
    // We look for rates where the 'VENUE' link row contains this venue's ID
    const activeRate = ratesData.find((r: any) => {
        const linkedVenues = r[DB.RENTAL_RATES.FIELDS.VENUE] || [];
        return linkedVenues.some((v: any) => v.id === venue.id);
    });

    const venueSpaces = spacesData
      .filter((space: any) => {
          const linkedVenues = space[DB.SPACES.FIELDS.VENUE] || [];
          return linkedVenues.some((v: any) => v.id === venue.id);
      })
      .map((space: any) => {
        // Classes already processed via getClasses, so we filter normally
        const occupiedBy = classesData.filter((cls: any) => cls.spaceId === space.id);
        return {
          id: space.id,
          name: safeGet(space[DB.SPACES.FIELDS.ROOM_NAME] || space[DB.SPACES.FIELDS.FULL_ROOM_NAME], "Unnamed Room"),
          capacity: parseInt(safeGet(space[DB.SPACES.FIELDS.CAPACITY], 0)),
          floorType: safeGet(space[DB.SPACES.FIELDS.FLOOR_TYPE], "Unknown"),
          classes: occupiedBy
        };
      });

    return {
      id: venue.id,
      name: safeGet(venue[DB.VENUES.FIELDS.VENUE_NAME], "Unknown Venue"),
      type: safeGet(venue[DB.VENUES.FIELDS.TYPE], "General"),
      contact: safeGet(venue[DB.VENUES.FIELDS.CONTACT_NAME], "N/A"),
      spaces: venueSpaces,
      rates: {
        hourly: parseFloat(safeGet(activeRate?.[DB.RENTAL_RATES.FIELDS.HOURLY_RATE], 0)),
        weekend: parseFloat(safeGet(activeRate?.[DB.RENTAL_RATES.FIELDS.WEEKEND_RATE], 0)),
        flat: parseFloat(safeGet(activeRate?.[DB.RENTAL_RATES.FIELDS.FLAT_RATE], 0)),
      }
    };
  });
}

// ==============================================================================
// 🎭 PRODUCTION & CASTING - REFACTORED
// ==============================================================================
// --- Helper to clean up Show Data ---
function mapShow(row: any) {
  const rawStatus = safeGet(row[DB.PRODUCTIONS.FIELDS.STATUS], "Archived");
  return {
    id: row.id,
    title: safeGet(row[DB.PRODUCTIONS.FIELDS.TITLE] || row[DB.PRODUCTIONS.FIELDS.FULL_TITLE], "Untitled Show"),
    season: safeGet(row[DB.PRODUCTIONS.FIELDS.SEASON], "Unknown Season"),
    status: rawStatus,
    isActive: safeGet(row[DB.PRODUCTIONS.FIELDS.IS_ACTIVE]) === true || rawStatus === "Active",
    image: row[DB.PRODUCTIONS.FIELDS.SHOW_IMAGE]?.[0]?.url || null,
    // Add location mapping if needed for the dashboard
    location: safeGet(row[DB.PRODUCTIONS.FIELDS.LOCATION]) || safeGet(row[DB.PRODUCTIONS.FIELDS.VENUE]) || "TBD",
  };
}

export async function getActiveProduction() {
  const data = await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/`, {}, { size: "50" });
  if (!Array.isArray(data)) return null;
  
  // Find the active row
  const activeRow = data.find((r: any) => 
    safeGet(r[DB.PRODUCTIONS.FIELDS.IS_ACTIVE]) === true || 
    safeGet(r[DB.PRODUCTIONS.FIELDS.STATUS]) === 'Active'
  ) || data[0];

  // 🚨 FIX: Clean it before returning!
  return activeRow ? mapShow(activeRow) : null;
}

export async function getShowById(showId: string | number) {
  const row = await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/${showId}/`);
  // 🚨 FIX: Clean it here too!
  return row && !row.error ? mapShow(row) : null;
}

export async function getAllShows() {
  const data = await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/`, {}, { size: "200" });
  if (!Array.isArray(data)) return [];
  // Reuse the helper
  return data.map(mapShow).sort((a: any, b: any) => b.id - a.id);
}
// --- Casting ---

export async function getRoles() {
  return fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`);
}

export async function getAuditionSlots(productionId?: number) {
  const params: any = { size: "200" };
  if(productionId) params[`filter__${DB.AUDITIONS.FIELDS.PRODUCTION}__link_row_has`] = productionId;
  return fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/`, {}, params); 
}

export async function getAuditionees(productionId?: number) {
  // Alias for getAuditionSlots currently, typically would filter for 'booked' slots
  return getAuditionSlots(productionId);
}

export async function getAssignments(productionId?: number) {
  return fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`);
}

export async function createCastAssignment(personId: number, roleId: number, productionId: number) {
  const body = {
    [DB.ASSIGNMENTS.FIELDS.PERSON]: [personId],
    [DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY]: [roleId],
    [DB.ASSIGNMENTS.FIELDS.PRODUCTION]: [productionId]
  };
  return await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`, { 
    method: "POST", 
    body: JSON.stringify(body) 
  });
}

// --- Scenes & Assets ---

export async function getScenes(productionId?: number) {
  return fetchBaserow(`/database/rows/table/${DB.SCENES.ID}/`);
}

export async function getProductionAssets(productionId?: number) {
  return fetchBaserow(`/database/rows/table/${DB.ASSETS.ID}/`);
}

export async function createProductionAsset(name: string, url: string, type: string, productionId: number) {
  const body = {
    [DB.ASSETS.FIELDS.NAME]: name,
    [DB.ASSETS.FIELDS.LINK]: url,
    [DB.ASSETS.FIELDS.TYPE]: type,
    [DB.ASSETS.FIELDS.PRODUCTION]: [productionId]
  };
  return await fetchBaserow(`/database/rows/table/${DB.ASSETS.ID}/`, { 
    method: "POST", 
    body: JSON.stringify(body) 
  });
}

export async function getProductionEvents() {
  return fetchBaserow(`/database/rows/table/${DB.EVENTS.ID}/`);
}

// ==============================================================================
// 👥 PEOPLE & STAFF
// ==============================================================================

export async function getPeople() {
  return fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/`);
}

// app/lib/baserow.ts

export async function getCreativeTeam(productionId?: number) {
  // 🚨 FIX: Add Filter! Only get staff linked to THIS production
  const params: any = { size: "100" };
  if (productionId) {
    params[`filter__${DB.SHOW_TEAM.FIELDS.PRODUCTIONS}__link_row_has`] = productionId;
  }

  const data = await fetchBaserow(`/database/rows/table/${DB.SHOW_TEAM.ID}/`, {}, params);

  if (!Array.isArray(data)) return [];

  return data
    .map((row: any) => {
      const name = safeGet(row[DB.SHOW_TEAM.FIELDS.PERSON], null);
      const role = safeGet(row[DB.SHOW_TEAM.FIELDS.POSITION], "Volunteer");

      if (!name) return null; // Skip empty rows

      return {
        id: row.id,
        name: name,
        role: role,
        initials: name.split(' ').map((n:string) => n[0]).join('').substring(0, 2).toUpperCase(),
        color: getRoleColor(role)
      };
    })
    .filter(Boolean); // Remove nulls
}

// Helper for the UI colors (Restored)
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

export async function getCommitteePreferences() {
  return fetchBaserow(`/database/rows/table/${DB.COMMITTEE_PREFS.ID}/`);
}

export async function getConflicts() {
  return fetchBaserow(`/database/rows/table/${DB.CONFLICTS.ID}/`);
}

export async function getComplianceData() {
  return fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/`);
}
// ==============================================================================
// 🔐 AUTHENTICATION - REFACTORED
// ==============================================================================

export async function findUserByEmail(email: string) {
  const params = {
    filter_type: "OR",
    size: "1",
    // Use Field IDs for filtering
    [`filter__${DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: email,
    [`filter__${DB.PEOPLE.FIELDS.CYT_NATIONAL_INDIVIDUAL_EMAIL}__equal`]: email,
  };

  const results = await fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/`, {}, params);
  
  if (!results || results.length === 0) return null;
  
  const row = results[0];
  return {
    id: row.id.toString(),
    name: safeGet(row[DB.PEOPLE.FIELDS.FULL_NAME]),
    email: email,
    image: row[DB.PEOPLE.FIELDS.HEADSHOT]?.[0]?.url || null,
    role: safeGet(row[DB.PEOPLE.FIELDS.STATUS]),
  };
}

export async function verifyUserCredentials(email: string, password: string) {
  // 1. Find the user
  const user = await findUserByEmail(email);
  
  // 2. If user doesn't exist, return null (NextAuth interprets this as "Access Denied")
  if (!user) return null;

  // 3. (Optional) In the future, check the password here:
  // if (user.storedPassword !== password) return null;

  // 4. Return the full user object so NextAuth can bake it into the session
  return user; 
}

// --- WRITE HELPERS ---

export async function updateAuditionSlot(slotId: number, data: any) {
  // Mapping human readable keys to Field IDs for write operations would go here
  // For now, passing data through or simplified
  return await fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/${slotId}/`, { 
    method: "PATCH", 
    body: JSON.stringify(data) 
  });
}

export async function submitAudition(data: any) {
  return await fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/`, { 
    method: "POST", 
    body: JSON.stringify(data) 
  });
}

export async function updateRole(roleId: number, data: any) {
  return await fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/${roleId}/`, { 
    method: "PATCH", 
    body: JSON.stringify(data) 
  });
}

// ==============================================================================
// 📊 ANALYTICS
// ==============================================================================

export async function getPerformanceAnalytics(productionId?: number) {
  // 1. Fetch from the PERFORMANCES table using the new Schema ID
  const data = await fetchBaserow(
    `/database/rows/table/${DB.PERFORMANCES.ID}/`, 
    {}, 
    { size: "200" } 
  );

  if (!Array.isArray(data) || data.length === 0) return [];

  return data.map((row: any) => {
    // 2. Use safeGet with the Schema Field IDs
    const sold = parseFloat(safeGet(row[DB.PERFORMANCES.FIELDS.TICKETS_SOLD], 0));
    const capacity = parseFloat(safeGet(row[DB.PERFORMANCES.FIELDS.TOTAL_INVENTORY], 0));
    const label = safeGet(row[DB.PERFORMANCES.FIELDS.PERFORMANCE], "Show");

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
  
  const totalSold = data.reduce((sum: number, p: any) => sum + p.sold, 0);
  const avgFill = Math.round(data.reduce((sum: number, p: any) => sum + p.fillRate, 0) / data.length);
  
  return { totalSold, avgFill, performanceCount: data.length };
}