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
// app/lib/baserow.ts

export async function setCallbackStatus(rowId: number, status: string) {
    const F = DB.AUDITIONS.FIELDS;
    return await fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/${rowId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            [F.STATUS]: status // Set to "Callback", "Called", or a specific Slot Name
        })
    });
}
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

// app/lib/baserow.ts

// app/lib/baserow.ts

export async function getClasses() {
  let allRows: any[] = [];
  let page = 1;
  let hasMore = true;

  // Loop until we have everything
  while (hasMore) {
    const data = await fetchBaserow(
      `/database/rows/table/${DB.CLASSES.ID}/`, 
      {}, 
      { 
        page: page.toString(), 
        size: "200", // Max limit per page
        // 🚨 REMOVED: [`order_by`]: ... (This was causing the 400 Error)
      } 
    );

    if (!Array.isArray(data) || data.length === 0) {
      hasMore = false;
    } else {
      allRows = [...allRows, ...data];
      // If we got less than the limit, we've reached the end
      if (data.length < 200) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  // Now map the FULL list
  return allRows.map((row: any) => ({
      id: row.id,
      name: safeGet(row[DB.CLASSES.FIELDS.CLASS_NAME], "Unnamed Class"),
      session: safeGet(row[DB.CLASSES.FIELDS.SESSION], "Unknown Session"),
      teacher: safeGet(row[DB.CLASSES.FIELDS.TEACHER], "TBA"),
      location: safeGet(row[DB.CLASSES.FIELDS.LOCATION], "Main Campus"),
      spaceId: safeId(row[DB.CLASSES.FIELDS.SPACE]),
      spaceName: safeGet(row[DB.CLASSES.FIELDS.SPACE]),
      day: safeGet(row[DB.CLASSES.FIELDS.DAY], "TBD"),
      time: safeGet(row[DB.CLASSES.FIELDS.TIME_SLOT], "TBD"),
      students: Array.isArray(row[DB.CLASSES.FIELDS.STUDENTS]) ? row[DB.CLASSES.FIELDS.STUDENTS].length : 0,
  }));
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

export async function getClassRoster(classId: string) {
  if (!classId) return [];

  // 🚨 KEY FIX: Check BOTH 'CLASSES' (Teachers) AND 'CLASSES_STUDENTS' (Students)
  // We use an OR filter to get people linked via EITHER field.
  const params = {
    filter_type: "OR",
    [`filter__${DB.PEOPLE.FIELDS.CLASSES}__link_row_has`]: classId,          // Teachers?
    [`filter__${DB.PEOPLE.FIELDS.CLASSES_STUDENTS}__link_row_has`]: classId, // Students!
    size: "200"
  };

  const students = await fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/`, {}, params);

  if (!Array.isArray(students)) return [];

  return students.map((s: any) => ({
    id: s.id,
    name: safeGet(s[DB.PEOPLE.FIELDS.FULL_NAME] || s[DB.PEOPLE.FIELDS.FIRST_NAME]),
    age: parseInt(safeGet(s[DB.PEOPLE.FIELDS.AGE], 0)),
    email: safeGet(s[DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL] || s[DB.PEOPLE.FIELDS.CYT_NATIONAL_INDIVIDUAL_EMAIL]),
    phone: safeGet(s[DB.PEOPLE.FIELDS.PHONE_NUMBER]),
    photo: s[DB.PEOPLE.FIELDS.HEADSHOT]?.[0]?.url || null,
    // Determine status based on which field matched
    status: s[DB.PEOPLE.FIELDS.CLASSES]?.some((c:any) => c.id == classId) ? "Instructor" : "Student",
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
  masterShowLink: row[DB.PRODUCTIONS.FIELDS.MASTER_SHOW_DATABASE] || []
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
function extractName(field: any, fallback: string = ""): string {
  if (!field) return fallback;
  // If it's an array (Link Row), grab the first item's value
  if (Array.isArray(field) && field.length > 0) {
      return field[0].value || fallback;
  }
  // If it's a string, just return it
  if (typeof field === "string") return field;
  return fallback;
}


// app/lib/baserow.ts

// ... existing imports

export async function getCastDemographics() {
  // 1. Fetch from PEOPLE table (ID 599)
  // We use the specific field IDs from your schema to be safe
  const data = await fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/`, {}, { size: "200" });

  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: safeGet(row[DB.PEOPLE.FIELDS.FULL_NAME] || row["field_5735"]),
    
    // 🎂 Age (field_5739)
    age: parseFloat(safeGet(row["field_5739"], 0)),
    
    // 📏 Height in Inches (field_5777)
    height: parseFloat(safeGet(row["field_5777"], 0)),
    
    // 🎭 Experience: Length of "Cast/Crew Assignments" array (field_5788)
    // This counts how many shows they have been linked to in the past
    showCount: Array.isArray(row["field_5788"]) ? row["field_5788"].length : 0,
    
    // 🚻 Gender (field_5775) - Redundant backup if Auditions table misses it
    gender: safeGet(row["field_5775"], "Unknown"),
  }));
}
export async function getAssignments(productionId?: number) {
  const params: any = { size: "200" };
  if(productionId) params[`filter__${DB.ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`] = productionId;
  
  const data = await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`, {}, params);

  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
    const roleName = safeGet(row[DB.ASSIGNMENTS.FIELDS.ASSIGNMENT] || row["Role"] || row["Character"], "Unnamed Role");

    return {
      id: row.id,
      name: roleName, 
      personName: extractName(row[DB.ASSIGNMENTS.FIELDS.PERSON]),
      personId: safeId(row[DB.ASSIGNMENTS.FIELDS.PERSON]),
      
      // 👈 ADD THIS LINE: This grabs the comma-separated string from the "Scenes" column
      scenes: safeJoin(row["Scenes"] || row[DB.ASSIGNMENTS.FIELDS.SCENES], ""),

      actors: row[DB.ASSIGNMENTS.FIELDS.PERSON] ? [{
        id: safeId(row[DB.ASSIGNMENTS.FIELDS.PERSON]),
        name: extractName(row[DB.ASSIGNMENTS.FIELDS.PERSON]),
      }] : [],

      sceneIds: Array.isArray(row[DB.ASSIGNMENTS.FIELDS.SCENES]) 
        ? row[DB.ASSIGNMENTS.FIELDS.SCENES].map((s: any) => s.id) 
        : [],
      
      selectedActorIds: row[DB.ASSIGNMENTS.FIELDS.PERSON] ? [safeId(row[DB.ASSIGNMENTS.FIELDS.PERSON])] : []
    };
  });
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
  // 1. Prepare query parameters
  const params: any = { 
    size: "200",
  };

  // 2. 🚨 THE FILTER: Only get scenes linked to this production
  if (productionId) {
    // We use the 'link_row_has' filter on the Production field ID from your schema
    params[`filter__${DB.SCENES.FIELDS.PRODUCTION}__link_row_has`] = productionId;
    // Optional: Sort by Order or Act/Scene Number if you have those fields
    params['order_by'] = `field_${DB.SCENES.FIELDS.ACT},field_${DB.SCENES.FIELDS.SCENE_NAME}`; 
  }

  const data = await fetchBaserow(`/database/rows/table/${DB.SCENES.ID}/`, {}, params);

  if (!Array.isArray(data)) return [];

  // 3. Map the data to the clean keys the UI expects
  return data.map((row: any) => ({
    id: row.id,
    name: safeGet(row[DB.SCENES.FIELDS.SCENE_NAME], "Untitled Scene"),
    type: safeGet(row[DB.SCENES.FIELDS.SCENE_TYPE], "Scene"),
    act: safeGet(row[DB.SCENES.FIELDS.ACT], "I"),
    // Add productionId to the object so the CastingClient knows when to refresh
    productionId: productionId 
  }));
}

// app/lib/baserow.ts

export async function getProductionAssets(productionId?: number) {
  // 1. Add Filtering to only get assets for this show
  const params: any = { size: "200" };
  if (productionId) {
    params[`filter__${DB.ASSETS.FIELDS.PRODUCTION}__link_row_has`] = productionId;
  }

  const data = await fetchBaserow(`/database/rows/table/${DB.ASSETS.ID}/`, {}, params);

  if (!Array.isArray(data)) return [];

  // 2. MAP the raw data to clean objects
  return data.map((row: any) => ({
    id: row.id,
    // Safely get the Name, defaulting to "Untitled" to prevent .match() crashes
    name: safeGet(row[DB.ASSETS.FIELDS.NAME], "Untitled Asset"),
    link: safeGet(row[DB.ASSETS.FIELDS.LINK], "#"),
    type: safeGet(row[DB.ASSETS.FIELDS.TYPE], "Prop"),
    // Add any other fields your UI expects
  }));
}

// app/lib/baserow.ts

/** * Returns a comma-separated string for Link Rows with multiple items 
 * (e.g. "Scene 1, Scene 4, Scene 5")
 */
function safeJoin(field: any, fallback = ""): string {
  if (!field) return fallback;
  if (Array.isArray(field)) {
    if (field.length === 0) return fallback;
    // Map over all items and join them
    return field.map((item: any) => item.value || item.name).join(", ");
  }
  return safeGet(field, fallback); // Fallback to standard safeGet if not an array
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
      const name = safeGet(row[DB.SHOW_TEAM.FIELDS.PERSON], "");
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
// app/lib/baserow.ts

export async function getCommitteeData(productionId?: number) {
  const params: any = { size: "200" };
  const F = DB.COMMITTEE_PREFS.FIELDS;
  
  if(productionId) params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;

  const data = await fetchBaserow(`/database/rows/table/${DB.COMMITTEE_PREFS.ID}/`, {}, params);

  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    
    // 🛡️ Map using the Schema IDs
    name: extractName(row[F.PERSON] || row[(F as any).PARENT_NAME]),
    studentName: extractName(row[(F as any).STUDENT_NAME] || row[(F as any).STUDENT]),

    preShow1: safeGet(row[F.FIRST_CHOICE] || row[(F as any).PRE_SHOW_1ST]),
    preShow2: safeGet(row[F.SECOND_CHOICE] || row[(F as any).PRE_SHOW_2ND]),
    
    showWeek1: safeGet(row[(F as any).SHOW_WEEK_1ST]),
    showWeek2: safeGet(row[(F as any).SHOW_WEEK_2ND]),
    
    email: safeGet(row[(F as any).EMAIL]),
    phone: safeGet(row[(F as any).PHONE]),
    assigned: safeGet(row[F.ASSIGNED_COMMITTEE], ""),
  }));
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

// app/lib/baserow.ts

// --- AUDITIONS ---
// app/lib/baserow.ts

export async function getAuditionees(productionId?: number) {
  const params: any = { size: "200" };
  const F = DB.AUDITIONS.FIELDS;
  
  if(productionId) params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;
  
  const data = await fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/`, {}, params);
  
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
      // 🚨 FIX: Extract Headshot URL from Baserow File Array
      const headshotField = row[F.HEADSHOT] || row["Headshot"];
      const headshotUrl = Array.isArray(headshotField) && headshotField.length > 0 
        ? headshotField[0].url 
        : null;

      // 🚨 FIX: Extract Video URL from Baserow File Array
      const videoField = row[(F as any).AUDITION_VIDEO] || row["Audition Video"];
      const videoUrl = Array.isArray(videoField) && videoField.length > 0 
        ? videoField[0].url 
        : row[(F as any).DANCE_VIDEO] || null;

      return {
          id: row.id,
          name: extractName(row[F.PERFORMER], "Unknown Actor"),
          studentId: safeId(row[F.PERFORMER]),
          
          date: row[F.DATE] || null, 
          headshot: headshotUrl, // Now a clean string URL
          video: videoUrl,       // Now a clean string URL

          // Scores
          vocalScore: safeGet(row[F.VOCAL_SCORE], 0),
          actingScore: safeGet(row[F.ACTING_SCORE], 0),
          danceScore: safeGet(row[F.DANCE_SCORE], 0),
          presenceScore: safeGet(row[F.STAGE_PRESENCE_SCORE], 0),
          
          // Bio Data
          age: safeGet(row[(F as any).AGE] || row["Age"], "?"),
          height: safeGet(row[(F as any).HEIGHT] || row["Height"], ""),
          song: safeGet(row[(F as any).SONG] || row["Song"], ""),
          monologue: safeGet(row[(F as any).MONOLOGUE] || row["Monologue"], ""),
          conflicts: safeGet(row[F.CONFLICTS] || row["Conflicts"], "No known conflicts"),
          gender: safeGet(row[F.GENDER] || row["Gender"] || row["Sex"], "Unknown"),
          // Notes
          actingNotes: safeGet(row[F.ACTING_NOTES], "No notes logged."),
          musicNotes: safeGet(row[(F as any).MUSIC_NOTES], "No notes logged."),
          choreoNotes: safeGet(row[(F as any).CHOREOGRAPHY_NOTES], "No notes logged."),
          dropInNotes: safeGet(row[(F as any).DROP_IN_NOTES], "No flags."),
          adminNotes: safeGet(row[(F as any).ADMIN_NOTES], ""),
          
          status: !row[F.DATE] ? "Walk-In" : "Scheduled",
      };
  });
}

// app/lib/baserow.ts

// 🚨 REMOVE ANY OTHER "export async function submitAudition" BEFORE PASTING THIS
// app/lib/baserow.ts

// --- CALLBACKS ---

export async function getCallbackSlots(productionId: number) {
  const params: any = { size: "100" };
  // Using the Field ID from your schema for Production
  params[`filter__${DB.CALLBACK_SLOTS.FIELDS.PRODUCTION}__link_row_has`] = productionId;

  const data = await fetchBaserow(`/database/rows/table/${DB.CALLBACK_SLOTS.ID}/`, {}, params);
  
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    time: row[DB.CALLBACK_SLOTS.FIELDS.TIME] || "TBD",
    title: row[DB.CALLBACK_SLOTS.FIELDS.TITLE] || "Untitled Call",
    type: row[DB.CALLBACK_SLOTS.FIELDS.TYPE] || "General",
    description: row["Description"] || "",
  }));
}

export async function getCallbackAssignments(productionId: number) {
  const params: any = { size: "1000" };
  // This table links Performers to specific Callback Slots
  params[`filter__${DB.CALLBACK_ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`] = productionId;

  const data = await fetchBaserow(`/database/rows/table/${DB.CALLBACK_ASSIGNMENTS.ID}/`, {}, params);

  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    performerId: safeId(row[DB.CALLBACK_ASSIGNMENTS.FIELDS.PERFORMER]),
    slotId: safeId(row[DB.CALLBACK_ASSIGNMENTS.FIELDS.SLOT]),
  }));
}
export async function submitAudition(studentId: number, productionId: number, extraData: any) {
    const F = DB.AUDITIONS.FIELDS;
    
    // We map the "Pretty" keys from the UI back to the "Shielded" Field IDs
    const payload: any = {
        [F.PERFORMER]: [studentId],
        [F.PRODUCTION]: [productionId],
        [F.DATE]: new Date().toISOString(),
        // Map scores if they exist in extraData
        [F.VOCAL_SCORE]: extraData.vocal || 0,
        [F.ACTING_SCORE]: extraData.acting || 0,
        [F.DANCE_SCORE]: extraData.dance || 0,
        [F.STAGE_PRESENCE_SCORE]: extraData.presence || 0,
        // Map notes based on the judge role (handled in the component logic)
        [F.ACTING_NOTES]: extraData.notes || "" 
    };
    
    // Note: If you need to save to specific note fields (Music/Choreo), 
    // you can expand the logic here or pass the field ID directly from the component.

    return await fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
}
// app/lib/baserow.ts

export async function getCastingData(productionId: number) {
  // 🛡️ The Shield: Fetching the two sources needed to build the grid
  const [auditionees, assignments] = await Promise.all([
    getAuditionees(productionId),
    getAssignments(productionId)
  ]);

  // We want to return a map of "Who is in what role" 
  // and "Who is available to be cast"
  return {
    auditionees, // The pool of talent
    assignments, // The current links between talent and roles
  };
}

// 🚨 THIS IS THE CRITICAL WRITER: Updates the actual role in Baserow
export async function updateCastAssignment(assignmentId: number, personId: number | null) {
    const F = DB.ASSIGNMENTS.FIELDS;
    return await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/${assignmentId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            [F.PERSON]: personId ? [personId] : [] // Links to the People table
        })
    });
}
// Keep updateAuditionSlot as is
export async function updateAuditionSlot(rowId: number, data: any) {
    return await fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/${rowId}/?user_field_names=true`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
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