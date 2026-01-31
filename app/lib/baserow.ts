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
  if (Array.isArray(field) && field.length > 0) return field[0].value || fallback;
  if (typeof field === "string") return field;
  return fallback;
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
      ageRange: safeGet(row[DB.CLASSES.FIELDS.AGE_RANGE], "All Ages"),
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

export async function getShowById(id: string | number) {
  const data = await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/${id}/`);
  if (!data || data.error) return null;
  return mapShow(data);
}

export async function getAllShows() {
  const data = await fetchBaserow(`/database/rows/table/${DB.PRODUCTIONS.ID}/`, {}, { size: "200" });
  if (!Array.isArray(data)) return [];
  return data.map(mapShow).sort((a: any, b: any) => b.id - a.id);
}

// ==============================================================================
// 👯 CASTING & PEOPLE (READ & WRITE)
// ==============================================================================

export async function getPeople() {
  const F = DB.PEOPLE.FIELDS;
  const params = { size: "200", user_field_names: "true" };
  const data = await fetchBaserow(`/database/rows/table/${DB.PEOPLE.ID}/`, {}, params);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: `${row[F.FIRST_NAME]} ${row[F.LAST_NAME]}`.trim(),
    headshot: row[F.HEADSHOT]?.[0]?.url || null
  }));
}

export async function getRoles() {
  const F = DB.ROLES.FIELDS;
  const data = await fetchBaserow(`/database/rows/table/${DB.ROLES.ID}/`, {}, { size: "200", user_field_names: "true" });
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: row[F.NAME],
    type: row[F.TYPE]
  }));
}

export async function getAssignments(productionId?: number) {
  const F = DB.ASSIGNMENTS.FIELDS;
  const params: any = { size: "200", user_field_names: "true" };

  if (productionId) {
    params[`filter__field_${F.PRODUCTION}__link_row_has`] = productionId;
  }

  const data = await fetchBaserow(`/database/rows/table/${DB.ASSIGNMENTS.ID}/`, {}, params);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
    const personObj = row[F.PERSON]?.[0]; 
    return {
      id: row.id,
      assignment: safeGet(row[F.ASSIGNMENT]),
      personId: personObj ? personObj.id : 0,
      personName: personObj ? personObj.value : "Unknown Actor",
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
  const F = DB.SLOTS.FIELDS;
  const events = await getProductionEvents(productionId);
  if (events.length === 0) return [];
  const eventIds = events.map((e: any) => e.id);

  const slotsData = await fetchBaserow(`/database/rows/table/${DB.SLOTS.ID}/`, {}, { size: "200", user_field_names: "true" });
  if (!Array.isArray(slotsData)) return [];

  return slotsData
    .filter((row: any) => {
        const linkedEventId = row[F.EVENT_LINK]?.[0]?.id;
        return eventIds.includes(linkedEventId);
    })
    .map((row: any) => {
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

export async function getScenes(productionId?: number) {
  const params: any = { size: "200" };
  const F = DB.SCENES.FIELDS;

  if (productionId) {
    params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;
    params['order_by'] = `field_${F.ORDER}`; 
  }

  const data = await fetchBaserow(`/database/rows/table/${DB.SCENES.ID}/`, {}, params);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
      id: row.id,
      order: parseInt(safeGet(row[F.ORDER], row.id)), 
      name: safeGet(row[F.SCENE_NAME], "Untitled Scene"),
      type: safeGet(row[F.SCENE_TYPE], "Scene").value || "Scene",
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
    order_by: `field_${F.EVENT_DATE}`
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

export async function getCreativeTeam(productionId?: number) {
  const params: any = { size: "100" };
  if (productionId) {
    params[`filter__${DB.SHOW_TEAM.FIELDS.PRODUCTIONS}__link_row_has`] = productionId;
  }

  const data = await fetchBaserow(`/database/rows/table/${DB.SHOW_TEAM.ID}/`, {}, params);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
      const name = safeGet(row[DB.SHOW_TEAM.FIELDS.PERSON], "");
      const role = safeGet(row[DB.SHOW_TEAM.FIELDS.POSITION], "Volunteer");
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

export async function getAuditionees(productionId?: number) {
  const params: any = { size: "200" };
  const F = DB.AUDITIONS.FIELDS;
  
  if(productionId) params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;
  
  const data = await fetchBaserow(`/database/rows/table/${DB.AUDITIONS.ID}/`, {}, params);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
      id: row.id,
      name: extractName(row[F.PERFORMER], "Unknown Actor"),
      studentId: safeId(row[F.PERFORMER]),
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
      gender: safeGet(row[F.GENDER], "Unknown"),
      actingNotes: safeGet(row[F.ACTING_NOTES], "No notes."),
      musicNotes: safeGet(row[F.MUSIC_NOTES], "No notes."),
      choreoNotes: safeGet(row[F.CHOREOGRAPHY_NOTES], "No notes."),
      status: !row[F.DATE] ? "Walk-In" : "Scheduled",
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
  return await fetchBaserow(`/database/rows/table/${DB.ROLES.ID}/${roleId}/`, { 
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