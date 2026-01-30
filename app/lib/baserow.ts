import { notFound } from "next/navigation";

// --- CONFIGURATION ---
const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");
const API_TOKEN = process.env.BASEROW_API_KEY || process.env.BASEROW_API_TOKEN || process.env.NEXT_PUBLIC_BASEROW_TOKEN;

// --- TABLE MAP (Matched to your Schema) ---
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
  CLASSES: "633",
  SPACES: "638",
  RENTAL_RATES: "639",
  VENUES: "635",
  SESSIONS: "632"
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

// ==============================================================================
// 🛡️ HELPERS
// ==============================================================================

// Helper to safely extract string/value from complex Baserow objects
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

// Helper to safely get an array (handles case sensitivity like Venue vs VENUE)
function safeArray(row: any, ...keys: string[]) {
  for (const key of keys) {
    if (Array.isArray(row[key])) return row[key];
  }
  return [];
}

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
    next: { revalidate: 0, ...fetchOptions.next },
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
// 📚 CLASS & ACADEMY LOGIC
// ==============================================================================

// 🚨 1. PAGINATED CLASS FETCHER (Fixes the "165 Enrollment" / Missing Seasons)
export async function getClasses() {
  let allRows: any[] = [];
  let page = 1;
  let hasMore = true;

  console.log("📡 Starting Class Fetch...");

  while (hasMore) {
    const rawData = await fetchBaserow(
      `/database/rows/table/${TABLES.CLASSES}/`, 
      { page: page.toString() }, 
      { size: "200" } 
    );

    if (!Array.isArray(rawData) || rawData.length === 0) {
      hasMore = false;
    } else {
      allRows = [...allRows, ...rawData];
      if (rawData.length < 200) {
        hasMore = false; // Last page reached
      } else {
        page++;
      }
    }
  }

  console.log(`✅ Loaded ${allRows.length} total classes.`);

  return allRows.map((row: any) => {
    // Enrollment Logic
    let enrollment = 0;
    const studentsField = row.Students || row.STUDENTS;
    if (Array.isArray(studentsField)) {
      enrollment = studentsField.length;
    } else if (typeof studentsField === 'string' && studentsField.trim().length > 0) {
      enrollment = studentsField.split(',').length;
    }

    // Space Logic (Case Insensitive)
    const spaceLink = safeArray(row, 'Space', 'SPACE', 'space');
    const spaceId = spaceLink.length > 0 ? spaceLink[0].id : null;
    const spaceName = spaceLink.length > 0 ? spaceLink[0].value : null;

    return {
      id: row.id,
      name: safeString(row['Class Name'] || row['CLASS_NAME'] || row['Name'], "Unnamed Class"),
      session: safeString(row.Session || row.SESSION, "Unknown"),
      teacher: safeString(row.Teacher || row.TEACHER, "TBA"),
      location: safeString(row.Location || row.LOCATION, "Main Campus"),
      day: safeString(row.Day || row.DAY, "TBD"),
      ageRange: safeString(row['Age Range'] || row['AGE_RANGE'], "All Ages"),
      campus: safeString(row['Campus'], ""), 
      spaceId: spaceId,            
      spaceName: spaceName,
      students: enrollment,
    };
  });
}

// 🚨 2. SINGLE CLASS FETCHER (Fixes the 404 Links)
export async function getClassById(classId: string) {
  const row = await fetchBaserow(`/database/rows/table/${TABLES.CLASSES}/${classId}/`);

  if (!row || row.error || row.detail) return null;

  const studentsField = row.Students || row.STUDENTS;
  const enrollment = Array.isArray(studentsField) ? studentsField.length : 0;
  
  const spaceLink = safeArray(row, 'Space', 'SPACE');
  const spaceName = spaceLink.length > 0 ? spaceLink[0].value : null;

  return {
    id: row.id,
    name: safeString(row['Class Name'] || row['CLASS_NAME'], "Unnamed Class"),
    session: safeString(row.Session || row.SESSION, "Unknown"),
    teacher: safeString(row.Teacher || row.TEACHER, "TBA"),
    location: safeString(row.Location || row.LOCATION, "Main Campus"),
    day: safeString(row.Day || row.DAY, "TBD"),
    time: safeString(row['Time Slot'] || row['TIME_SLOT'], "TBD"),
    description: safeString(row['Description'], ""),
    ageRange: safeString(row['Age Range'] || row['AGE_RANGE'], "All Ages"),
    spaceName: spaceName,
    students: enrollment,
  };
}

// 🚨 3. VENUE LOGISTICS (Fixes "Active Venues: 0")
export async function getVenueLogistics() {
  const [venuesData, spacesData, ratesData, classesData] = await Promise.all([
    fetchBaserow(`/database/rows/table/${TABLES.VENUES}/`, {}, { size: "100" }),
    fetchBaserow(`/database/rows/table/${TABLES.SPACES}/`, {}, { size: "2000" }),
    fetchBaserow(`/database/rows/table/${TABLES.RENTAL_RATES}/`, {}, { size: "500" }),
    getClasses() // Uses the paginated fetcher above
  ]);

  if (!Array.isArray(venuesData) || !Array.isArray(spacesData)) return [];

  return venuesData.map((venue: any) => {
    // Handle Rates
    const venueRates = Array.isArray(ratesData) 
      ? ratesData.filter((r: any) => safeArray(r, 'Venue', 'VENUE').some((v: any) => v.id === venue.id)) 
      : [];
    
    const activeRate = venueRates[0]; // Simplification for now

    // Handle Spaces
    const venueSpaces = spacesData
      .filter((space: any) => safeArray(space, 'Venue', 'VENUE').some((v: any) => v.id === venue.id))
      .map((space: any) => {
        const occupiedBy = classesData.filter((cls: any) => cls.spaceId === space.id);
        return {
          id: space.id,
          name: safeString(space['Room Name'] || space['NAME'] || space['Name'], "Unnamed Room"),
          capacity: parseInt(space.Capacity || space.CAPACITY) || 0,
          floorType: safeString(space['Floor Type'] || space['FLOOR_TYPE'], "Unknown"),
          classes: occupiedBy
        };
      });

    return {
      id: venue.id,
      name: safeString(venue['Venue Name'] || venue['VENUE_NAME'], "Unknown Venue"),
      type: safeString(venue.Type || venue.TYPE, "General"),
      contact: safeString(venue['Contact Name'], "N/A"),
      spaces: venueSpaces, 
      rates: {
        hourly: parseFloat(activeRate?.['Hourly Rate'] || activeRate?.['HOURLY_RATE'] || 0),
        weekend: parseFloat(activeRate?.['Weekend Rate'] || 0),
        flat: parseFloat(activeRate?.['Flat Rate'] || 0),
        session: safeString(activeRate?.Session, "Default")
      }
    };
  }).filter((venue: any) => venue.spaces.length > 0);
}

// ==============================================================================
// 📈 ANALYTICS & CASTING (Restored from your previous file)
// ==============================================================================

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

export async function getAllShows() {
  return await fetchBaserow(`/database/rows/table/${TABLES.PRODUCTIONS}/`, {}, { size: "200" });
}

export async function getActiveProduction() {
  const productions = await getAllShows();
  if (!Array.isArray(productions)) return null;
  return productions.find((p: any) => p.Active?.value === true || p.Active === true) || productions[0];
}

// ==============================================================================
// 🔐 AUTHENTICATION (Restored)
// ==============================================================================

export async function findUserByEmail(email: string) {
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