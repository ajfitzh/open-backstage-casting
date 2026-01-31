// app/lib/baserow.ts

import { notFound } from "next/navigation";
import { DB } from "@/app/lib/schema"; 

// --- CONFIGURATION ---
const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");

// Added NEXT_PUBLIC_BASEROW_TOKEN to the list so it finds your .env value
const API_TOKEN = process.env.NEXT_PUBLIC_BASEROW_TOKEN || process.env.BASEROW_API_TOKEN || process.env.BASEROW_API_KEY;

const HEADERS = {
  "Authorization": `Token ${API_TOKEN}`,
  "Content-Type": "application/json",
};

// ==============================================================================
// 🛡️ HELPERS (The "Adapter" Layer)
// ==============================================================================

// Central Fetcher
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

function safeGet(field: any, fallback: string | number = ""): any {
  if (field === null || field === undefined) return fallback;
  if (typeof field === 'string' || typeof field === 'number' || typeof field === 'boolean') return field;
  if (Array.isArray(field)) {
    if (field.length === 0) return fallback;
    const first = field[0];
    return first.value || first.name || first.url || fallback;
  }
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
  if (Array.isArray(field) && field.length > 0) {
      return field[0].value || fallback;
  }
  if (typeof field === "string") return field;
  return fallback;
}

function safeJoin(field: any, fallback = ""): string {
  if (!field) return fallback;
  if (Array.isArray(field)) {
    if (field.length === 0) return fallback;
    return field.map((item: any) => item.value || item.name).join(", ");
  }
  return safeGet(field, fallback); 
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
      { 
        page: page.toString(), 
        size: "200",
      } 
    );

    if (!Array.isArray(data) || data.length === 0) {
      hasMore = false;
    } else {
      allRows = [...allRows, ...data];
      if (data.length < 200) {
        hasMore = false;
      } else {
        page++;
      }
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
    description: "", 
    ageRange: safeGet(row[DB.CLASSES.FIELDS.AGE_RANGE], "All Ages"),
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
    season: safeGet(row[DB.PRODUCTIONS.FIELDS.SEASON], "Unknown Season"),
    status: rawStatus,
    isActive: safeGet(row[DB.PRODUCTIONS.FIELDS.IS_ACTIVE]) === true || rawStatus === "Active",
    image: row[DB.PRODUCTIONS.FIELDS.SHOW_IMAGE]?.[0]?.url || null,
    location: safeGet(row[DB.PRODUCTIONS.FIELDS.LOCATION]) || safeGet(row[DB.PRODUCTIONS.FIELDS.VENUE]) || "TBD",
    masterShowLink: row[DB.PRODUCTIONS.FIELDS.MASTER_SHOW_DATABASE] || []
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

export async function getShowById(showId: string | number) {
  const row = await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/${showId}/`);
  return row && !row.error ? mapShow(row) : null;
}

export async function getAllShows() {
  const data = await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/`, {}, { size: "200" });
  if (!Array.isArray(data)) return [];
  return data.map(mapShow).sort((a: any, b: any) => b.id - a.id);
}

// --- Casting & Auditions ---

export async function getRoles() {
  // 🚨 FIX: Using BLUEPRINT_ROLES per schema
  return fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/`);
}

export async function getAuditionSlots(productionId?: number) {
  const params: any = { size: "200" };
  // 🚨 FIX: Using AUDITIONS table
  if(productionId) params[`filter__${DB.AUDITIONS.FIELDS.PRODUCTION}__link_row_has`] = productionId;
  return fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/`, {}, params); 
}

export async function getAssignments(productionId?: number) {
  const params: any = { size: "200" };
  if(productionId) params[`filter__${DB.ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`] = productionId;
  
  const data = await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`, {}, params);

  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
    // 🚨 FIX: Fallback logic for Assignment Name
    const roleName = safeGet(row[DB.ASSIGNMENTS.FIELDS.ASSIGNMENT] || row[DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY], "Unnamed Role");

    return {
      id: row.id,
      name: roleName, 
      personName: extractName(row[DB.ASSIGNMENTS.FIELDS.PERSON]),
      personId: safeId(row[DB.ASSIGNMENTS.FIELDS.PERSON]),
      
      // 🚨 FIX: using SCENE_ASSIGNMENTS
      scenes: safeJoin(row[DB.ASSIGNMENTS.FIELDS.SCENE_ASSIGNMENTS], ""),

      actors: row[DB.ASSIGNMENTS.FIELDS.PERSON] ? [{
        id: safeId(row[DB.ASSIGNMENTS.FIELDS.PERSON]),
        name: extractName(row[DB.ASSIGNMENTS.FIELDS.PERSON]),
      }] : [],

      sceneIds: Array.isArray(row[DB.ASSIGNMENTS.FIELDS.SCENE_ASSIGNMENTS]) 
        ? row[DB.ASSIGNMENTS.FIELDS.SCENE_ASSIGNMENTS].map((s: any) => s.id) 
        : [],
      
      selectedActorIds: row[DB.ASSIGNMENTS.FIELDS.PERSON] ? [safeId(row[DB.ASSIGNMENTS.FIELDS.PERSON])] : []
    };
  });
}

export async function createCastAssignment(personId: number, roleId: number, productionId: number) {
  const body = {
    [DB.ASSIGNMENTS.FIELDS.PERSON]: [personId],
    // 🚨 FIX: Using PERFORMANCE_IDENTITY
    [DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY]: [roleId],
    [DB.ASSIGNMENTS.FIELDS.PRODUCTION]: [productionId]
  };
  return await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`, { 
    method: "POST", 
    body: JSON.stringify(body) 
  });
}

// 🚨 THIS IS THE CRITICAL WRITER: Updates the actual role in Baserow
export async function updateCastAssignment(assignmentId: number, personId: number | null, sceneIds?: number[]) {
  const F = DB.ASSIGNMENTS.FIELDS;
  const body: any = {};

  if (personId !== undefined) {
    body[F.PERSON] = personId ? [personId] : [];
  }

  if (sceneIds !== undefined) {
    // 🚨 FIX: Using SCENE_ASSIGNMENTS
    body[F.SCENE_ASSIGNMENTS] = sceneIds; 
  }

  return await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/${assignmentId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

// --- Scenes & Assets ---

export async function getScenes(productionId?: number) {
  const params: any = { size: "200" };

  if (productionId) {
    // 🚨 FIX: Using correct PRODUCTION field ID
    params[`filter__${DB.SCENES.FIELDS.PRODUCTION}__link_row_has`] = productionId;
    params['order_by'] = `field_${DB.SCENES.FIELDS.ACT},field_${DB.SCENES.FIELDS.SCENE_NAME}`; 
  }

  const data = await fetchBaserow(`/database/rows/table/${DB.SCENES.ID}/`, {}, params);

  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: safeGet(row[DB.SCENES.FIELDS.SCENE_NAME], "Untitled Scene"),
    type: safeGet(row[DB.SCENES.FIELDS.SCENE_TYPE], "Scene"),
    act: safeGet(row[DB.SCENES.FIELDS.ACT], "I"),
    productionId: productionId 
  }));
}

export async function getProductionAssets(productionId?: number) {
  const params: any = { size: "200" };
  if (productionId) {
    params[`filter__${DB.ASSETS.FIELDS.PRODUCTION}__link_row_has`] = productionId;
  }

  const data = await fetchBaserow(`/database/rows/table/${DB.ASSETS.ID}/`, {}, params);

  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: safeGet(row[DB.ASSETS.FIELDS.NAME], "Untitled Asset"),
    link: safeGet(row[DB.ASSETS.FIELDS.LINK], "#"),
    type: safeGet(row[DB.ASSETS.FIELDS.TYPE], "Prop"),
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

export async function getProductionEvents() {
  return fetchBaserow(`/database/rows/table/${DB.EVENTS.ID}/`);
}

// ==============================================================================
// 👥 PEOPLE & STAFF
// ==============================================================================
// app/lib/baserow.ts

export async function getCastDemographics() {
  // 1. Fetch from PEOPLE table using Schema ID
  const data = await fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/`, {}, { size: "200" });

  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    // Use Safe Gets with Schema Fields
    name: safeGet(row[DB.PEOPLE.FIELDS.FULL_NAME] || row[DB.PEOPLE.FIELDS.FIRST_NAME]),
    
    // 🎂 Age
    age: parseFloat(safeGet(row[DB.PEOPLE.FIELDS.AGE], 0)),
    
    // 📏 Height in Inches
    height: parseFloat(safeGet(row[DB.PEOPLE.FIELDS.HEIGHT_TOTAL_INCHES], 0)),
    
    // 🎭 Experience: Count linked assignments
    // This uses the 'CAST_CREW_ASSIGNMENTS' field from your schema
    showCount: Array.isArray(row[DB.PEOPLE.FIELDS.CAST_CREW_ASSIGNMENTS]) 
        ? row[DB.PEOPLE.FIELDS.CAST_CREW_ASSIGNMENTS].length 
        : 0,
    
    // 🚻 Gender
    gender: safeGet(row[DB.PEOPLE.FIELDS.GENDER], "Unknown"),
  }));
}

export async function getPeople() {
  return fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/`);
}

export async function getCreativeTeam(productionId?: number) {
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

      if (!name) return null;

      return {
        id: row.id,
        name: name,
        role: role,
        initials: name.split(' ').map((n:string) => n[0]).join('').substring(0, 2).toUpperCase(),
        color: getRoleColor(role)
      };
    })
    .filter(Boolean); 
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

export async function getCommitteeData(productionId?: number) {
  const params: any = { size: "200" };
  const F = DB.COMMITTEE_PREFS.FIELDS;
  
  if(productionId) params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;

  const data = await fetchBaserow(`/database/rows/table/${DB.COMMITTEE_PREFS.ID}/`, {}, params);

  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    
    // 🚨 FIX: Mapped to correct schema fields
    name: extractName(row[F.STUDENT_NAME] || row[F.STUDENT_ID]),
    studentName: extractName(row[F.STUDENT_NAME] || row[F.STUDENT_ID]),

    preShow1: safeGet(row[F.PRE_SHOW_1ST]),
    preShow2: safeGet(row[F.PRE_SHOW_2ND]), // Was PRE_SHOW_2ND
    
    showWeek1: safeGet(row[F.SHOW_WEEK_1ST]),
    showWeek2: safeGet(row[F.SHOW_WEEK_2ND]),
    
    email: safeGet(row[F.EMAIL]),
    phone: safeGet(row[F.PHONE]),
    assigned: safeGet(row[F.SHOW_WEEK_COMMITTEES], ""), // Was ASSIGNED_COMMITTEE
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
// 🔐 AUTHENTICATION
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

// --- AUDITIONS ---

export async function getAuditionees(productionId?: number) {
  const params: any = { size: "200" };
  const F = DB.AUDITIONS.FIELDS;
  
  if(productionId) params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;
  
  const data = await fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/`, {}, params);
  
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
      // Extract Headshot
      const headshotField = row[F.HEADSHOT];
      const headshotUrl = Array.isArray(headshotField) && headshotField.length > 0 
        ? headshotField[0].url 
        : null;

      // Extract Video
      const videoField = row[F.AUDITION_VIDEO];
      const videoUrl = Array.isArray(videoField) && videoField.length > 0 
        ? videoField[0].url 
        : row[F.DANCE_VIDEO] || null;

      return {
          id: row.id,
          name: extractName(row[F.PERFORMER], "Unknown Actor"),
          studentId: safeId(row[F.PERFORMER]),
          
          date: row[F.DATE] || null, 
          headshot: headshotUrl,
          video: videoUrl,

          vocalScore: safeGet(row[F.VOCAL_SCORE], 0),
          actingScore: safeGet(row[F.ACTING_SCORE], 0),
          danceScore: safeGet(row[F.DANCE_SCORE], 0),
          presenceScore: safeGet(row[F.STAGE_PRESENCE_SCORE], 0),
          
          age: safeGet(row[F.AGE], "?"),
          height: safeGet(row[F.HEIGHT], ""),
          song: safeGet(row[F.SONG], ""),
          monologue: safeGet(row[F.MONOLOGUE], ""),
          conflicts: safeGet(row[F.CONFLICTS], "No known conflicts"),
          gender: safeGet(row[F.GENDER], "Unknown"),
          
          actingNotes: safeGet(row[F.ACTING_NOTES], "No notes logged."),
          musicNotes: safeGet(row[F.MUSIC_NOTES], "No notes logged."),
          choreoNotes: safeGet(row[F.CHOREOGRAPHY_NOTES], "No notes logged."),
          dropInNotes: safeGet(row[F.DROP_IN_NOTES], "No flags."),
          adminNotes: safeGet(row[F.ADMIN_NOTES], ""),
          
          status: !row[F.DATE] ? "Walk-In" : "Scheduled",
      };
  });
}

// --- USER PROFILE & FAMILY ---

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

// --- CALLBACKS (COMMENTED OUT PENDING SCHEMA UPDATE) ---

/*
export async function getCallbackSlots(productionId: number) {
  // Schema Missing
  return [];
}

export async function getCallbackAssignments(productionId: number) {
  // Schema Missing
  return [];
}
*/

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

export async function getCastingData(productionId: number) {
  const [auditionees, assignments] = await Promise.all([
    getAuditionees(productionId),
    getAssignments(productionId)
  ]);

  return { auditionees, assignments };
}

// Keep updateAuditionSlot as is
export async function updateAuditionSlot(rowId: number, data: any) {
    return await fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/${rowId}/?user_field_names=true`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
}

// Fix: Removed STATUS field logic as it doesn't exist in Auditions schema
// export async function setCallbackStatus(rowId: number, status: string) { ... }

export async function updateRole(roleId: number, data: any) {
  // 🚨 FIX: Using BLUEPRINT_ROLES
  return await fetchBaserow(`/database/rows/table/${DB.BLUEPRINT_ROLES.ID}/${roleId}/`, { 
    method: "PATCH", 
    body: JSON.stringify(data) 
  });
}

// ==============================================================================
// 📊 ANALYTICS
// ==============================================================================

export async function getPerformanceAnalytics(productionId?: number) {
  const data = await fetchBaserow(
    `/database/rows/table/${DB.PERFORMANCES.ID}/`, 
    {}, 
    { size: "200" } 
  );

  if (!Array.isArray(data) || data.length === 0) return [];

  return data.map((row: any) => {
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

export { DB };