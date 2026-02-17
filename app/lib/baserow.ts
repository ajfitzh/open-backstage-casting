// app/lib/baserow.ts

import { notFound } from "next/navigation";
import { DB } from "@/app/lib/schema"; 

// --- CONFIGURATION ---
const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");
const API_TOKEN = process.env.NEXT_PUBLIC_BASEROW_TOKEN || process.env.BASEROW_API_TOKEN || process.env.BASEROW_API_KEY;

const HEADERS = {
  "Authorization": `Token ${API_TOKEN}`,
  "Content-Type": "application/json",
};

// ==============================================================================
// 🛡️ HELPERS
// ==============================================================================

export async function fetchBaserow(endpoint: string, options: RequestInit = {}, queryParams: Record<string, any> = {}) {
  try {
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
      if (res.status === 404) return []; 
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

function safeGet(field: any, fallback: string | number = ""): any {
  if (field === null || field === undefined) return fallback;
  
  // 1. Primitives
  if (typeof field === 'string' || typeof field === 'number' || typeof field === 'boolean') return field;
  
  // 2. Arrays (Crucial for Baserow Lookups like Gender)
  if (Array.isArray(field)) {
    if (field.length === 0) return fallback;
    const first = field[0];
    
    // Handle ["Male"]
    if (typeof first === 'string') return first;
    
    // Handle [{value: "Male"}] or [{name: "Male"}]
    return first.value || first.name || first.url || fallback;
  }
  
  // 3. Objects
  if (typeof field === 'object') {
    return field.value || field.name || fallback;
  }
  
  return fallback;
}

function safeId(field: any): number | null {
  if (Array.isArray(field) && field.length > 0) return field[0].id;
  return null;
}

function extractName(field: any, fallback: string = ""): string {
  if (!field) return fallback;
  if (Array.isArray(field) && field.length > 0) return field[0].value || fallback;
  if (typeof field === "string") return field;
  return fallback;
}

// Helper to reconstruct Age Range string from Min/Max integers
function formatAgeRange(row: any): string {
    const min = parseInt(safeGet(row[DB.CLASSES.FIELDS.MINIMUM_AGE], 0));
    const max = parseInt(safeGet(row[DB.CLASSES.FIELDS.MAXIMUM_AGE], 0));
  
    if (!min && !max) return "All Ages";
    if (min && !max) return `${min}+`;
    if (!min && max) return `Up to ${max}`;
    return `${min} - ${max}`;
}

export async function deleteRow(tableId: string, rowId: number | string) {
  const url = `/database/rows/table/${tableId}/${rowId}/`;
  const res = await fetchBaserow(url, { method: "DELETE" });
  return res !== null;
}

// ==============================================================================
// 🎓 EDUCATION (CLASSES & VENUES)
// ==============================================================================

export async function getClasses() {
  let allRows: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchBaserow(
      `/database/rows/table/${DB.CLASSES.ID}/`, 
      {}, 
      { page: page.toString(), size: "200" } 
    );

    if (!Array.isArray(data) || data.length === 0) {
      hasMore = false;
    } else {
      allRows = [...allRows, ...data];
      if (data.length < 200) hasMore = false;
      else page++;
    }
  }

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
      type: safeGet(row[DB.CLASSES.FIELDS.TYPE], "General"),
      
      // ✅ NEW: Pass raw integers for filtering
      minAge: parseInt(safeGet(row[DB.CLASSES.FIELDS.MINIMUM_AGE], 0)),
      maxAge: parseInt(safeGet(row[DB.CLASSES.FIELDS.MAXIMUM_AGE], 99)),
      
      // Keep the pretty string for display
      ageRange: formatAgeRange(row),
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
    description: safeGet(row[DB.CLASSES.FIELDS.DESCRIPTION], ""), 
    ageRange: formatAgeRange(row), // FIXED
    spaceName: safeGet(row[DB.CLASSES.FIELDS.SPACE]),
    students: Array.isArray(students) ? students.length : 0,
  };
}

export async function getClassRoster(classId: string) {
  if (!classId) return [];

  const params = {
    filter_type: "OR",
    [`filter__${DB.PEOPLE.FIELDS.CLASSES}__link_row_has`]: classId,          
    [`filter__${DB.PEOPLE.FIELDS.CLASSES_STUDENTS}__link_row_has`]: classId, 
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
    status: s[DB.PEOPLE.FIELDS.CLASSES]?.some((c:any) => c.id == classId) ? "Instructor" : "Student",
    medical: safeGet(s[DB.PEOPLE.FIELDS.MEDICAL_NOTES], "None"),
  }));
}
// app/lib/baserow.ts

// app/lib/baserow.ts

// app/lib/baserow.ts

export async function getVenues() {
  const data = await fetchBaserow(
    `/database/rows/table/${DB.VENUES.ID}/`, 
    {}, 
    { size: "200" } // Removed user_field_names=true
  );
  
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
    // 1. Safe extraction of the Select Object
    const typeField = row[DB.VENUES.FIELDS.TYPE];
    const typeValue = typeField?.value || "Hybrid"; // Use optional chaining to be safe

    return {
      id: row.id,
      name: row[DB.VENUES.FIELDS.VENUE_NAME] || "Unknown Venue",
      capacity: parseInt(row[DB.VENUES.FIELDS.SEATING_CAPACITY]) || 0,
      marketingName: row[DB.VENUES.FIELDS.PUBLIC_NAME_MARKETING],
      type: typeValue, // <--- Use the safe value
      historicalShows: row[DB.VENUES.FIELDS.PRODUCTIONS]?.length || 0 
    };
  });
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
// 🎭 PRODUCTION & CASTING
// ==============================================================================

function mapShow(row: any) {
  const rawStatus = safeGet(row[DB.PRODUCTIONS.FIELDS.STATUS], "Archived");
  return {
    id: row.id,
    title: safeGet(row[DB.PRODUCTIONS.FIELDS.TITLE] || row[DB.PRODUCTIONS.FIELDS.FULL_TITLE], "Untitled Show"),
    season: safeGet(row[DB.PRODUCTIONS.FIELDS.SEASON_LINKED], "Unknown Season"),
    status: rawStatus,
    type: safeGet(row[DB.PRODUCTIONS.FIELDS.TYPE], "Other"), 
    isActive: safeGet(row[DB.PRODUCTIONS.FIELDS.IS_ACTIVE]) === true || rawStatus === "Active",
    image: row[DB.PRODUCTIONS.FIELDS.SHOW_IMAGE]?.[0]?.url || null,
    productionSession: safeGet(row[DB.PRODUCTIONS.FIELDS.SESSION], ""),
    // 🛠️ FIX: Separate Branch (Location) from Specific Venue
    branch: safeGet(row[DB.PRODUCTIONS.FIELDS.LOCATION], "General"), 
    venue: safeGet(row[DB.PRODUCTIONS.FIELDS.VENUE], "null"), // This grabs "Fredericksburg Academy"
    
    workflowOverrides: row[DB.PRODUCTIONS.FIELDS.WORKFLOW_OVERRIDES] || [] 
  };
}

export async function getActiveProduction() {
  const data = await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/`, {}, { size: "50" });
  if (!Array.isArray(data)) return null;
  
  const activeRow = data.find((r: any) => 
    safeGet(r[DB.PRODUCTIONS.FIELDS.IS_ACTIVE]) === true || 
    safeGet(r[DB.PRODUCTIONS.FIELDS.STATUS]) === 'Active'
  ) || data[0];

  return activeRow ? mapShow(activeRow) : null;
}
// app/lib/baserow.ts

export async function getSeasons() {
  const data = await fetchBaserow(
    `/database/rows/table/${DB.SEASONS.ID}/`, 
    {}, 
    { 
      size: "200",
      // Sort by start date (descending usually makes sense for UI, but we sort in client too)
      order_by: `${DB.SEASONS.FIELDS.START_DATE}` 
    }
  );

  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: safeGet(row[DB.SEASONS.FIELDS.NAME], "Unnamed Season"),
    startDate: safeGet(row[DB.SEASONS.FIELDS.START_DATE]),
    endDate: safeGet(row[DB.SEASONS.FIELDS.END_DATE]),
    status: safeGet(row[DB.SEASONS.FIELDS.STATUS], "Planning"), 
    // Count how many productions are linked to this season
    productionCount: Array.isArray(row[DB.SEASONS.FIELDS.PRODUCTIONS]) ? row[DB.SEASONS.FIELDS.PRODUCTIONS].length : 0
  })).sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}
export async function getShowById(id: string | number) {
  const data = await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/${id}/`);
  if (!data || data.error) return null;
  return mapShow(data);
}

// app/lib/baserow.ts

export async function getAllShows() {
  // 1. Fetch raw data (NO user_field_names)
  const data = await fetchBaserow(
    `/database/rows/table/${DB.PRODUCTIONS.ID}/`, 
    {}, 
    { size: "200" } 
  );

  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
    // 2. ROBUST TYPE EXTRACTION 🛠️
    const typeObj = row[DB.PRODUCTIONS.FIELDS.TYPE];
    const typeValue = typeObj?.value || "Other"; 

    // 3. STATUS EXTRACTION (Vital for Client Bucketing)
    const rawStatus = safeGet(row[DB.PRODUCTIONS.FIELDS.STATUS], "Archived");

    return {
      id: row.id,
      title: safeGet(row[DB.PRODUCTIONS.FIELDS.TITLE] || row[DB.PRODUCTIONS.FIELDS.FULL_TITLE], "Untitled"),
      season: safeGet(row[DB.PRODUCTIONS.FIELDS.SEASON_LINKED], "Unknown Season"),
      type: typeValue,

      // ✅ FIX 1: Add Status & Active State
      // The client uses these to sort into "Current" vs "History"
      status: rawStatus,
      isActive: safeGet(row[DB.PRODUCTIONS.FIELDS.IS_ACTIVE]) === true || rawStatus === 'Active',

      // ✅ FIX 2: Add Location 
      // The client uses this for the color dot (Emerald for Fredericksburg, Zinc for others)
      location: safeGet(row[DB.PRODUCTIONS.FIELDS.LOCATION], "General"),

      venue: safeGet(row[DB.PRODUCTIONS.FIELDS.VENUE], "TBD"),
      workflowOverrides: row[DB.PRODUCTIONS.FIELDS.WORKFLOW_OVERRIDES] || [],

      // Legacy field support
      Performances: row['field_6177'] || row['Performances'] || null
    };
  }).sort((a: any, b: any) => b.id - a.id);
}

// ==============================================================================
// 👯 CASTING & PEOPLE (READ & WRITE)
// ==============================================================================

// app/lib/baserow.ts

export async function getPeople() {
  const F = DB.PEOPLE.FIELDS;
  
  let allRows: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchBaserow(
      `/database/rows/table/${DB.PEOPLE.ID}/`, 
      {}, 
      { size: "200", user_field_names: "true", page: page.toString() }
    );

    if (!Array.isArray(data) || data.length === 0) {
      hasMore = false;
    } else {
      allRows = [...allRows, ...data];
      if (data.length < 200) hasMore = false;
      else page++;
    }
  }

  return allRows.map((row: any) => ({
    id: row.id,
    name: `${row["First Name"] || ""} ${row["Last Name"] || ""}`.trim() || row["Full Name"] || "Unknown",
    headshot: row["Headshot"]?.[0]?.url || row["Avatar"]?.[0]?.url || null,
    email: row["CYT Account / Personal Email"] || row["Email"] || null,
    phone: row["Phone Number"] || row["Phone"] || null
  }));
}

export async function getRoles() {
  // FIXED: Mapped to BLUEPRINT_ROLES
  const F = DB.BLUEPRINT_ROLES.FIELDS;
  const data = await fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`, {}, { size: "200", user_field_names: "true" });
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: row[F.ROLE_NAME], // FIXED
    type: row[F.ROLE_TYPE]  // FIXED
  }));
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

export async function updateCastAssignment(assignmentId: number, personId: number | null, sceneIds?: number[]) {
  const F = DB.ASSIGNMENTS.FIELDS;
  const body: any = {};

  if (personId !== undefined) {
    body[F.PERSON] = personId ? [personId] : [];
  }

  if (sceneIds !== undefined) {
    body[F.SCENE_ASSIGNMENTS] = sceneIds; 
  }

  return await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/${assignmentId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

// ==============================================================================
// 📅 SCHEDULING & SCENES
// ==============================================================================

export async function getScheduleSlots(productionId: number) {
  const F = DB.SCHEDULE_SLOTS.FIELDS;
  
  // 1. Get the Event IDs for this production
  const events = await getProductionEvents(productionId);
  if (events.length === 0) return [];
  const eventIds = new Set(events.map((e: any) => e.id)); // Use Set for O(1) lookup

  // 2. Fetch ALL slots (Pagination Loop)
  let allSlots: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchBaserow(
      `/database/rows/table/${DB.SCHEDULE_SLOTS.ID}/`, 
      {}, 
      { page: page.toString(), size: "200", user_field_names: "true" }
    );

    if (!Array.isArray(data) || data.length === 0) {
      hasMore = false;
    } else {
      // Optimization: Only keep slots that match our events to save memory
      const relevantSlots = data.filter((row: any) => {
         const linkedEventId = row[F.EVENT_LINK]?.[0]?.id;
         return eventIds.has(linkedEventId);
      });
      
      allSlots = [...allSlots, ...relevantSlots];
      
      // If we got less than 200, we reached the end
      if (data.length < 200) hasMore = false;
      else page++;
    }
  }

  return allSlots.map((row: any) => {
      const dateDate = new Date(row[F.START_TIME]);
      const hours = dateDate.getHours() + (dateDate.getMinutes() / 60);
      const dayName = dateDate.getDay() === 5 ? 'Fri' : 'Sat';

      return {
        id: row.id.toString(),
        sceneId: row[F.SCENE]?.[0]?.id || 0,
        track: row[F.TRACK]?.value || "Acting",
        day: dayName, 
        weekOffset: 0, 
        startTime: hours,
        duration: parseInt(row[F.DURATION]) || 30,
        status: 'New'
      };
    });
}
// inside app/lib/baserow.ts

export async function getSceneAssignments(productionId: number) {
  // Table 628: SCENE_ASSIGNMENTS
  const F = DB.SCENE_ASSIGNMENTS.FIELDS; 
  
  const params = {
    size: "200", 
    [`filter__${F.PRODUCTION}__link_row_has`]: productionId,
    "user_field_names": "true" // 🟢 Crucial: Allows the Client "washing machine" to read "Person" and "Scene" keys
  };

  const data = await fetchBaserow(`/database/rows/table/${DB.SCENE_ASSIGNMENTS.ID}/`, {}, params);
  
  if (!Array.isArray(data)) return [];
  return data;
}

// app/lib/baserow.ts

// ... (keep existing code) ...

// ==============================================================================
// 💾 WRITING SCHEDULES (NEW)
// ==============================================================================

export async function saveScheduleBatch(productionId: number, newSlots: any[]) {
  // Table: SCHEDULE_SLOTS (ID: 640)
  const TABLE_ID = DB.SCHEDULE_SLOTS.ID;
  const F = DB.SCHEDULE_SLOTS.FIELDS;

  // 1. Format Payload for Baserow Batch Create
  // Baserow allows creating multiple rows at once if we send an array
  const requests = newSlots.map((slot) => {
    
    // Convert relative "Fri/Sat" + "WeekOffset" into a real Calendar Date
    // NOTE: You'll need to pass the actual 'startDate' of Week 1 from the client
    // For now, we assume slot.startTime is a real ISO string or Timestamp if generated correctly, 
    // OR we calculate it here if your AutoScheduler returns relative offsets.
    
    // Assuming AutoScheduler returns relative offsets, we need real dates:
    // This logic usually happens on the Client before calling this function, 
    // but here is the mapping schema:
    
    return {
      [F.SCENE]: [slot.sceneId], // Link to Scene Table
      [F.TRACK]: slot.track,     // Single Select: "Music", "Dance", "Acting"
      [F.START_TIME]: new Date(slot.startTime).toISOString(), // Must be ISO format
      [F.END_TIME]: new Date(slot.endTime).toISOString(),
      [F.DURATION]: slot.duration,
      [F.ACTIVE]: true,
      // We don't have a direct 'Production' link in Schedule Slots based on your schema,
      // instead, it links to an Event or Scene. 
      // Ensure your SCENE links correctly to the Production.
    };
  });

  // Baserow Batch API limit is usually 200 rows. Chunk it if needed.
  const chunkSize = 50;
  for (let i = 0; i < requests.length; i += chunkSize) {
    const chunk = requests.slice(i, i + chunkSize);
    await fetchBaserow(`/database/rows/table/${TABLE_ID}/batch/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: chunk })
    });
  }

  return true;
}

export async function clearSchedule(productionId: number) {
  // Optional: Helper to wipe the board before auto-scheduling
  // 1. Get all slots for this production
  const slots = await getScheduleSlots(productionId);
  const ids = slots.map((s:any) => s.id);
  
  // 2. Batch Delete
  const TABLE_ID = DB.SCHEDULE_SLOTS.ID;
  const chunkSize = 50;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    await fetchBaserow(`/database/rows/table/${TABLE_ID}/batch/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: chunk.map((id:any) => id) }), // IDs to delete
    });
  }
}
export async function getScenes(productionId?: number) {
  const params: any = { size: "200" };
  const F = DB.SCENES.FIELDS;

  if (productionId) {
    params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;
    // 🔴 WAS: params['order_by'] = `field_${F.ORDER}`;
    // 🟢 FIXED: F.ORDER is already "field_XXXX"
    params['order_by'] = F.ORDER; 
  }

  const data = await fetchBaserow(`/database/rows/table/${DB.SCENES.ID}/`, {}, params);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
      id: row.id,
      order: parseInt(safeGet(row[F.ORDER], row.id)), 
      name: safeGet(row[F.SCENE_NAME], "Untitled Scene"),
      type: safeGet(row[F.SCENE_TYPE], "Scene").value || "Scene",
      act: safeGet(row["field_6025"], "Act 1"),
      status: {
        music: safeGet(row[F.MUSIC_STATUS])?.value?.toLowerCase() || "new",
        dance: safeGet(row[F.DANCE_STATUS])?.value?.toLowerCase() || "new",
        block: safeGet(row[F.BLOCKING_STATUS])?.value?.toLowerCase() || "new",
      },
      load: {
        music: parseInt(safeGet(row[F.MUSIC_LOAD], 0)),
        dance: parseInt(safeGet(row[F.DANCE_LOAD], 0)),
        block: parseInt(safeGet(row[F.BLOCKING_LOAD], 0)),
      }
  })).sort((a: any, b: any) => a.order - b.order);
}

export async function getProductionEvents(productionId: number) {
  const F = DB.EVENTS.FIELDS;
  const params = {
    size: "200",
    [`filter__${F.PRODUCTION}__link_row_has`]: productionId,
    // 🔴 WAS: order_by: `field_${F.EVENT_DATE}`
    // 🟢 FIXED:
    order_by: F.EVENT_DATE
  };

  const data = await fetchBaserow(`/database/rows/table/${DB.EVENTS.ID}/`, {}, params);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    date: row[F.EVENT_DATE],
    startTime: row[F.START_TIME],
    endTime: row[F.END_TIME],
    type: safeGet(row[F.EVENT_TYPE], "Rehearsal"),
    isRequired: safeGet(row[F.IS_REQUIRED]),
  }));
}

// ==============================================================================
// 🛠️ ASSETS & RESOURCES
// ==============================================================================

export async function getProductionAssets(productionId?: number) {
  const params: any = { size: "200" };
  const F = DB.ASSETS.FIELDS;
  if (productionId) {
    params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;
  }

  const data = await fetchBaserow(`/database/rows/table/${DB.ASSETS.ID}/`, {}, params);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: safeGet(row[F.NAME], "Untitled Asset"),
    link: safeGet(row[F.LINK], "#"),
    type: safeGet(row[F.TYPE], "Prop"),
  }));
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

// ==============================================================================
// 👥 PEOPLE, STAFF & COMMITTEES
// ==============================================================================

export async function getCastDemographics() {
  const data = await fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/`, {}, { size: "200" });
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: safeGet(row[DB.PEOPLE.FIELDS.FULL_NAME] || row[DB.PEOPLE.FIELDS.FIRST_NAME]),
    age: parseFloat(safeGet(row[DB.PEOPLE.FIELDS.AGE], 0)),
    height: parseFloat(safeGet(row[DB.PEOPLE.FIELDS.HEIGHT_TOTAL_INCHES], 0)),
    showCount: Array.isArray(row[DB.PEOPLE.FIELDS.CAST_CREW_ASSIGNMENTS]) ? row[DB.PEOPLE.FIELDS.CAST_CREW_ASSIGNMENTS].length : 0,
    gender: safeGet(row[DB.PEOPLE.FIELDS.GENDER], "Unknown"),
  }));
}
export async function getAssignments(productionId?: number) {
  const F = DB.ASSIGNMENTS.FIELDS;
  const params: any = { size: "200" }; // user_field_names is OFF by default

  if (productionId) {
    params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;
  }

  let allRows: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchBaserow(
      `/database/rows/table/${DB.ASSIGNMENTS.ID}/`, 
      {}, 
      { ...params, page: page.toString() }
    );

    if (!Array.isArray(data) || data.length === 0) {
      hasMore = false;
    } else {
      allRows = [...allRows, ...data];
      if (data.length < 200) hasMore = false;
      else page++;
    }
  }

  return allRows.map((row: any) => {
    const personObj = row[F.PERSON]?.[0]; // Link rows are always arrays of objects
    
    return {
      id: row.id,
      assignment: row[F.ASSIGNMENT] || "Unknown Role", // Formula field
      personId: personObj ? personObj.id : 0, 
      personName: personObj ? personObj.value : "Unknown Actor",
    };
  });
}

export async function getCreativeTeam(productionId?: number) {
  const F = DB.SHOW_TEAM.FIELDS;
  const params: any = { size: "100" };
  
  if (productionId) {
    params[`filter__${F.PRODUCTIONS}__link_row_has`] = productionId;
  }

  const data = await fetchBaserow(`/database/rows/table/${DB.SHOW_TEAM.ID}/`, {}, params);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
      const personObj = row[F.PERSON]?.[0];
      const positionObj = row[F.POSITION]?.[0];
      
      const name = personObj ? personObj.value : "";
      const role = positionObj ? positionObj.value : "Volunteer";
      
      if (!name) return null;
      
      return {
        id: row.id,
        name: name,
        role: role,
        initials: name.split(' ').map((n:string) => n[0]).join('').substring(0, 2).toUpperCase(),
        color: role.toLowerCase().includes('director') ? 'bg-blue-600' : 'bg-zinc-600'
      };
    }).filter(Boolean); 
}

export async function getProductionConflicts(productionId: number) {
  const F = DB.CONFLICTS.FIELDS;
  const params = {
    size: "200",
    [`filter__${F.PRODUCTION}__link_row_has`]: productionId,
  };

  const data = await fetchBaserow(`/database/rows/table/${DB.CONFLICTS.ID}/`, {}, params);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
      id: row.id,
      personId: safeId(row[F.PERSON]),
      personName: extractName(row[F.PERSON], "Unknown Person"),
      type: safeGet(row[F.CONFLICT_TYPE], "Absent"),
      minutes: parseInt(safeGet(row[F.MINUTES_LATE_EARLY], 0)),
      notes: safeGet(row[F.NOTES], ""),
      date: Array.isArray(row[F.DATE]) ? row[F.DATE][0]?.value : row[F.DATE],
  }));
}

export async function getCommitteeData(productionId?: number) {
  const params: any = { size: "200" };
  const F = DB.COMMITTEE_PREFS.FIELDS;
  
  if(productionId) params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;

  const data = await fetchBaserow(`/database/rows/table/${DB.COMMITTEE_PREFS.ID}/`, {}, params);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: extractName(row[F.STUDENT_NAME] || row[F.STUDENT_ID]),
    studentName: extractName(row[F.STUDENT_NAME] || row[F.STUDENT_ID]),
    preShow1: safeGet(row[F.PRE_SHOW_1ST]),
    preShow2: safeGet(row[F.PRE_SHOW_2ND]), 
    showWeek1: safeGet(row[F.SHOW_WEEK_1ST]),
    showWeek2: safeGet(row[F.SHOW_WEEK_2ND]),
    email: safeGet(row[F.EMAIL]),
    phone: safeGet(row[F.PHONE]),
    assigned: safeGet(row[F.SHOW_WEEK_COMMITTEES], ""), 
  }));
}

export async function getCommitteePreferences() {
  return fetchBaserow(`/database/rows/table/${DB.COMMITTEE_PREFS.ID}/`);
}

export async function getConflicts(id?: any) {
  return fetchBaserow(`/database/rows/table/${DB.CONFLICTS.ID}/`);
}

export async function getComplianceData(productionId?: number) {
  return fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/`);
}

// ==============================================================================
// 🎤 AUDITIONS (READ & WRITE)
// ==============================================================================

// app/lib/baserow.ts

export async function getAuditionees(productionId?: number) {
  // 1. Fetch RAW data (fast, robust, standard)
  const params: any = { size: "200" }; 
  const F = DB.AUDITIONS.FIELDS;
  
  if(productionId) params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;
  
  const data = await fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/`, {}, params);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
      id: row.id,
      name: extractName(row[F.PERFORMER], "Unknown Actor"), // Uses field_6052
      studentId: safeId(row[F.PERFORMER]),
      
      // ✅ This now works. 
      // F.GENDER maps to "field_6080" (from your schema).
      // Baserow returns { "field_6080": ["Male"], ... }
      gender: safeGet(row[F.GENDER], "Unknown"), 
      
      // ... (rest of your mapping)
      date: row[F.DATE] || null, 
      headshot: row[F.HEADSHOT]?.[0]?.url || null,
      video: row[F.AUDITION_VIDEO]?.[0]?.url || row[F.DANCE_VIDEO] || null,
      vocalScore: safeGet(row[F.VOCAL_SCORE], 0),
      actingScore: safeGet(row[F.ACTING_SCORE], 0),
      danceScore: safeGet(row[F.DANCE_SCORE], 0),
      presenceScore: safeGet(row[F.STAGE_PRESENCE_SCORE], 0),
      age: safeGet(row[F.AGE], "?"),
      height: safeGet(row[F.HEIGHT], ""),
      conflicts: safeGet(row[F.CONFLICTS], "No known conflicts"),
      actingNotes: safeGet(row[F.ACTING_NOTES], "No notes."),
      musicNotes: safeGet(row[F.MUSIC_NOTES], "No notes."),
      choreoNotes: safeGet(row[F.CHOREOGRAPHY_NOTES], "No notes."),
      status: !row[F.DATE] ? "Walk-In" : "Scheduled",
      vocalRange: safeGet(row[F.VOCAL_RANGE], ""), 
      song: safeGet(row[F.SONG], ""),
      monologue: safeGet(row[F.MONOLOGUE], ""),
  }));
}
export async function submitAudition(studentId: number, productionId: number, extraData: any) {
    const F = DB.AUDITIONS.FIELDS;
    
    const payload: any = {
        [F.PERFORMER]: [studentId],
        [F.PRODUCTION]: [productionId],
        [F.DATE]: new Date().toISOString(),
        [F.VOCAL_SCORE]: extraData.vocal || 0,
        [F.ACTING_SCORE]: extraData.acting || 0,
        [F.DANCE_SCORE]: extraData.dance || 0,
        [F.STAGE_PRESENCE_SCORE]: extraData.presence || 0,
        [F.ACTING_NOTES]: extraData.notes || "" 
    };
    
    return await fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

export async function updateAuditionSlot(rowId: number, data: any) {
    return await fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/${rowId}/?user_field_names=true`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
}

export async function updateRole(roleId: number, data: any) {
  // FIXED: Mapped to BLUEPRINT_ROLES
  return await fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/${roleId}/`, { 
    method: "PATCH", 
    body: JSON.stringify(data) 
  });
}

// ==============================================================================
// 🔐 AUTHENTICATION & USER
// ==============================================================================

export async function findUserByEmail(email: string) {
  const params = {
    filter_type: "OR",
    size: "1",
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
  const user = await findUserByEmail(email);
  if (!user) return null;
  return user; 
}

export async function getUserProfile(email: string) {
  const userRows = await fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/`, {}, {
    filter_type: "OR",
    size: "1",
    [`filter__${DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: email,
    [`filter__${DB.PEOPLE.FIELDS.CYT_NATIONAL_INDIVIDUAL_EMAIL}__equal`]: email,
  });

  if (!userRows || userRows.length === 0) return null;

  const user = userRows[0];
  const familyLink = user[DB.PEOPLE.FIELDS.FAMILIES]; 
  
  const profile = {
    id: user.id.toString(),
    name: safeGet(user[DB.PEOPLE.FIELDS.FULL_NAME]),
    email: email,
    phone: safeGet(user[DB.PEOPLE.FIELDS.PHONE_NUMBER]),
    address: `${safeGet(user[DB.PEOPLE.FIELDS.ADDRESS])}, ${safeGet(user[DB.PEOPLE.FIELDS.CITY])}`,
    role: safeGet(user[DB.PEOPLE.FIELDS.STATUS], "User"),
    image: user[DB.PEOPLE.FIELDS.HEADSHOT]?.[0]?.url || null,
    familyMembers: [] as any[]
  };

  if (Array.isArray(familyLink) && familyLink.length > 0) {
    const familyId = familyLink[0].id;
    const familyData = await fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/`, {}, {
      [`filter__${DB.PEOPLE.FIELDS.FAMILIES}__link_row_has`]: familyId,
      size: "20"
    });

    if (Array.isArray(familyData)) {
      profile.familyMembers = familyData
        .filter((member: any) => member.id !== user.id) 
        .map((member: any) => ({
          id: member.id,
          name: safeGet(member[DB.PEOPLE.FIELDS.FULL_NAME]),
          role: safeGet(member[DB.PEOPLE.FIELDS.STATUS], "Student"),
          age: parseInt(safeGet(member[DB.PEOPLE.FIELDS.AGE], 0)),
          image: member[DB.PEOPLE.FIELDS.HEADSHOT]?.[0]?.url || null,
        }));
    }
  }

  return profile;
}

export async function getUserProductionRole(userId: number, productionId: number) {
  const params = {
    filter_type: "AND",
    [`filter__${DB.SHOW_TEAM.FIELDS.PERSON}__link_row_has`]: userId,
    [`filter__${DB.SHOW_TEAM.FIELDS.PRODUCTIONS}__link_row_has`]: productionId,
  };

  const rows = await fetchBaserow(`/database/rows/table/${DB.SHOW_TEAM.ID}/`, {}, params);

  if (!rows || rows.length === 0) return null;
  return safeGet(rows[0][DB.SHOW_TEAM.FIELDS.POSITION]); 
}

// ... existing imports

export async function getTeacherApplicants() {
  const F = DB.PEOPLE.FIELDS;
  
  // Filter for anyone with an "Applicant" or "Interviewing" tag
  const params = {
    filter_type: "OR",
    size: "200",
    [`filter__${F.STATUS}__multiple_select_has`]: "Faculty Applicant",
    [`filter__${F.STATUS}__multiple_select_has`]: "Faculty Interviewing",
    // We optionally include 'Active Faculty' if you want to see recent hires on the board
    [`filter__${F.STATUS}__multiple_select_has`]: "Active Faculty",
  };

  const data = await fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/`, {}, params);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: safeGet(row[F.FULL_NAME] || row[F.FIRST_NAME]),
    email: safeGet(row[F.CYT_ACCOUNT_PERSONAL_EMAIL]),
    // We map the raw status array to find the one relevant to hiring
    // This helps if they are also a "Parent" - we just want to know their hiring status
    status: row[F.STATUS]?.map((s:any) => s.value) || [],
    headshot: row[F.HEADSHOT]?.[0]?.url || null,
    notes: safeGet(row[F.ORIGINAL_BIO], ""), // FIXED
  }));
}

// Function to move them between columns
export async function updateApplicantStatus(personId: number, currentTags: string[], newStatus: string) {
  // We need to be careful not to remove "Parent/Guardian" when we change "Applicant" to "Interviewing"
  // 1. Remove old hiring tags
  const hiringTags = ["Faculty Applicant", "Faculty Interviewing", "Active Faculty"];
  const keptTags = currentTags.filter(tag => !hiringTags.includes(tag));
  
  // 2. Add the new status
  const finalTags = [...keptTags, newStatus];

  return await fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/${personId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      [DB.PEOPLE.FIELDS.STATUS]: finalTags 
    })
  });
}

// ... existing imports

export async function getTeacherClasses(teacherName: string) {
  const F = DB.CLASSES.FIELDS;
  // Fetch classes where Teacher Name matches
  const params = {
    size: "200",
    [`filter__${F.TEACHER}__contains`]: teacherName,
    "user_field_names": "true"
  };

  const data = await fetchBaserow(`/database/rows/table/${DB.CLASSES.ID}/`, {}, params);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
      id: row.id,
      name: safeGet(row[F.CLASS_NAME], "Untitled"),
      session: safeGet(row[F.SESSION], "Unknown"),
      status: safeGet(row[F.STATUS], "Active"), // "Active", "Completed", "Proposed"
      students: Array.isArray(row[F.STUDENTS]) ? row[F.STUDENTS].length : 0,
      description: safeGet(row[F.DESCRIPTION], ""),
      objectives: safeGet(row[F.OBJECTIVES], ""),
      ageRange: formatAgeRange(row), // FIXED
      type: safeGet(row[F.TYPE], "General"),
  }));
}

export async function getOpenBounties() {
  const F = DB.CLASSES.FIELDS;
  const params = {
    size: "50",
    [`filter__${F.STATUS}__equal`]: "Seeking Instructor", // The "Bounty" tag
    "user_field_names": "true"
  };

  const data = await fetchBaserow(`/database/rows/table/${DB.CLASSES.ID}/`, {}, params);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
      id: row.id,
      name: safeGet(row[F.CLASS_NAME], "Untitled Core Class"),
      session: safeGet(row[F.SESSION], "Next Season"),
      ageRange: formatAgeRange(row), // FIXED
      day: safeGet(row[F.DAY], "TBD"),
      time: safeGet(row[F.TIME_SLOT], "TBD"),
      isCore: true
  }));
}

export async function submitClassProposal(data: any) {
    const F = DB.CLASSES.FIELDS;
    const payload = {
        [F.CLASS_NAME]: data.name,
        [F.TEACHER]: data.teacher,
        [F.SESSION]: data.session,
        [F.STATUS]: "Proposed", // <--- Enters the pipeline here
        [F.DESCRIPTION]: data.description,
        [F.OBJECTIVES]: data.objectives,
        // FIXED: Using Min/Max now
        [F.MINIMUM_AGE]: parseInt(data.minAge || 0), 
        [F.MAXIMUM_AGE]: parseInt(data.maxAge || 0),
        [F.TYPE]: data.type
    };
    return await fetchBaserow(`/database/rows/table/${DB.CLASSES.ID}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

export async function claimBounty(classId: number, teacherName: string) {
    const F = DB.CLASSES.FIELDS;
    return await fetchBaserow(`/database/rows/table/${DB.CLASSES.ID}/${classId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            [F.TEACHER]: teacherName,
            [F.STATUS]: "Drafting" // Moves from 'Seeking' to 'Drafting'
        })
    });
}
// ==============================================================================
// 📊 ANALYTICS
// ==============================================================================

export async function getPerformanceAnalytics(productionId?: number) {
  const data = await fetchBaserow(`/database/rows/table/${DB.PERFORMANCES.ID}/`, {}, { size: "200" });
  if (!Array.isArray(data)) return [];

return data.map((row: any) => {
    const sold = parseFloat(safeGet(row[DB.PERFORMANCES.FIELDS.TICKETS_SOLD], 0));
    const capacity = parseFloat(safeGet(row[DB.PERFORMANCES.FIELDS.TOTAL_INVENTORY], 0));
    return {
      // ✅ ADD THIS: Get the Link ID so we can match it to the Production Type
      productionId: safeId(row[DB.PERFORMANCES.FIELDS.PRODUCTION]), 
      name: safeGet(row[DB.PERFORMANCES.FIELDS.PERFORMANCE], "Show"),
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

export { DB };

// app/lib/baserow.ts

// ... existing code ...

export async function createGoogleUser(googleUser: any) {
  const F = DB.PEOPLE.FIELDS;
  
  // 1. Split Name (Google gives "Austin Fitzhugh", we want "Austin" and "Fitzhugh")
  const fullName = googleUser.name || "Unknown User";
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "";

  // 2. Prepare the data for Baserow
  const payload = {
    [F.FIRST_NAME]: firstName,
    [F.LAST_NAME]: lastName,
    // We map Google's email to your personal email field
    [F.CYT_ACCOUNT_PERSONAL_EMAIL]: googleUser.email,
    // 🟢 CRITICAL: Default them to "Guest" so they have limited access
    [F.STATUS]: ["Guest"], 
    [F.ORIGINAL_BIO]: "Created via Google Login Auto-Registration",
  };

  // 3. Send the "Create Row" command to Baserow
  const res = await fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return res;
}