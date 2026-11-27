// app/lib/baserow.ts

import { notFound } from "next/navigation";
import { DB as PROD_DB } from "@/app/lib/schema"; 
import { E2E_DB } from "@/app/lib/schema-e2e"; 
import { getTenantTableConfig } from "@/app/lib/tenant-config";
import { isPostgresEnabled } from "@/db";
import {
  createGoogleUserPg,
  findUserByEmailPg,
  getPeoplePg,
  getUserProfilePg,
} from "@/app/lib/db/core-repo";
import {
  getActiveProductionPg,
  getAllShowsPg,
  getAuditionProductionPg,
  getCreativeTeamPg,
  getMasterShowsPg,
  getSeasonsPg,
  getShowByIdPg,
  getStaffPositionsPg,
  getUserProductionRolePg,
  getVenuesPg,
} from "@/app/lib/db/productions-repo";
import {
  createCastAssignmentPg,
  getAssignmentsPg,
  getAuditioneesPg,
  getAuditionSlotsPg,
  getExistingAuditionsPg,
  getRolesPg,
  submitAuditionPg,
  updateCastAssignmentPg,
} from "@/app/lib/db/casting-repo";
import {
  clearSchedulePg,
  createProductionAssetPg,
  deleteRowPg,
  getCastDemographicsPg,
  getCommitteeDataPg,
  getComplianceDataPg,
  getPerformanceAnalyticsPg,
  getProductionAssetsPg,
  getProductionConflictsPg,
  getProductionEventsPg,
  getSceneAssignmentsPg,
  getScenesPg,
  getScheduleSlotsPg,
  saveScheduleBatchPg,
} from "@/app/lib/db/operations-repo";
import {
  getClassByIdPg,
  getClassesPg,
  getClassRosterPg,
  getVenueLogisticsPg,
} from "@/app/lib/db/wardrobe-academy-repo";

// --- CONFIGURATION ---
const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");
const API_TOKEN = process.env.BASEROW_API_TOKEN || process.env.NEXT_PUBLIC_BASEROW_TOKEN || process.env.BASEROW_API_KEY;

const HEADERS = {
  "Authorization": `Token ${API_TOKEN}`,
  "Content-Type": "application/json",
};

// 🟢 The Multi-Tenant Schema Switcher!
export const getDB = (tenant: string): any => {
  if (tenant === "e2e" || tenant === "sandbox") {
    return { ...PROD_DB, ...E2E_DB }; 
  }
  return PROD_DB;
};

// ==============================================================================
// 🛡️ HELPERS
// ==============================================================================

export async function fetchBaserow(
  endpoint: string, 
  options: RequestInit = {}, 
  queryParams: Record<string, any> = {},
  tenant: string = "cytfred"
) {
  try {
    const token = (tenant === "e2e" || tenant === "sandbox")
      ? process.env.SANDBOX_BASEROW_TOKEN
      : (process.env.BASEROW_API_TOKEN || process.env.NEXT_PUBLIC_BASEROW_TOKEN);

    const params = new URLSearchParams(queryParams);
    let path = endpoint;
    if (!path.startsWith("http") && !path.startsWith("/api")) {
        if (!path.startsWith("/")) path = `/${path}`;
        path = `/api${path}`;
    }
    const finalUrl = `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}${params.toString()}`;

    const res = await fetch(finalUrl, {
      ...options,
      headers: { 
        ...HEADERS, 
        "Authorization": `Token ${token}`, 
        ...options.headers 
      },
      cache: options.cache || "no-store", 
    });

    if (!res.ok) {
      if (res.status === 404) return []; 
      
      const errorBody = await res.text();
      console.error(`\n❌ [Baserow] API Error [${res.status}] at ${finalUrl}`);
      console.error(`🔍 EXACT BASEROW ERROR:\n`, errorBody, `\n`);
      
      try {
         return { error: true, details: JSON.parse(errorBody) };
      } catch {
         return { error: true, details: errorBody };
      }
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
    if (typeof first === 'string') return first;
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

function formatAgeRange(row: any, tenant: string): string {
    const DB = getDB(tenant);
    const min = parseInt(safeGet(row[DB.CLASSES.FIELDS.MINIMUM_AGE], 0));
    const max = parseInt(safeGet(row[DB.CLASSES.FIELDS.MAXIMUM_AGE], 0));
  
    if (!min && !max) return "All Ages";
    if (min && !max) return `${min}+`;
    if (!min && max) return `Up to ${max}`;
    return `${min} - ${max}`;
}

export async function deleteRow(tenant: string, tableKey: keyof ReturnType<typeof getTenantTableConfig>, rowId: number | string) {
  if (isPostgresEnabled()) {
    try {
      const ok = await deleteRowPg(tenant, String(tableKey), Number(rowId));
      if (ok) return true;
    } catch (error) {
      console.error("[Postgres] deleteRow failed, falling back to Baserow:", error);
    }
  }

  const tables = await getTenantTableConfig(tenant);
  const tableId = tables[tableKey as keyof typeof tables];
  const url = `/database/rows/table/${tableId}/${rowId}/`;
  const res = await fetchBaserow(url, { method: "DELETE" }, {}, tenant);
  return res !== null;
}

// ==============================================================================
// 🎓 EDUCATION (CLASSES & VENUES)
// ==============================================================================

export async function getClasses(tenant: string) {
  if (isPostgresEnabled()) {
    try {
      const pgClasses = await getClassesPg(tenant);
      if (pgClasses !== null) return pgClasses;
    } catch (error) {
      console.error("[Postgres] getClasses failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  let allRows: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchBaserow(
      `/database/rows/table/${tables.CLASSES}/`, 
      {}, 
      { page: page.toString(), size: "200" },
      tenant
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
      minAge: parseInt(safeGet(row[DB.CLASSES.FIELDS.MINIMUM_AGE], 0)),
      maxAge: parseInt(safeGet(row[DB.CLASSES.FIELDS.MAXIMUM_AGE], 99)),
      ageRange: formatAgeRange(row, tenant),
      students: Array.isArray(row[DB.CLASSES.FIELDS.STUDENTS]) ? row[DB.CLASSES.FIELDS.STUDENTS].length : 0,
  }));
}

export async function getClassById(tenant: string, classId: string) {
  if (isPostgresEnabled()) {
    try {
      const pgCls = await getClassByIdPg(tenant, Number(classId));
      if (pgCls !== null) return pgCls;
    } catch (error) {
      console.error("[Postgres] getClassById failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const row = await fetchBaserow(`/database/rows/table/${tables.CLASSES}/${classId}/`, {}, {}, tenant);
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
    ageRange: formatAgeRange(row, tenant),
    spaceName: safeGet(row[DB.CLASSES.FIELDS.SPACE]),
    students: Array.isArray(students) ? students.length : 0,
  };
}

export async function getClassRoster(tenant: string, classId: string) {
  if (!classId) return [];
  if (isPostgresEnabled()) {
    try {
      const pgRoster = await getClassRosterPg(tenant, Number(classId));
      if (pgRoster !== null) return pgRoster;
    } catch (error) {
      console.error("[Postgres] getClassRoster failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);

  const params = {
    filter_type: "OR",
    [`filter__${DB.PEOPLE.FIELDS.CLASSES}__link_row_has`]: classId,          
    [`filter__${DB.PEOPLE.FIELDS.CLASSES_STUDENTS}__link_row_has`]: classId, 
    size: "200"
  };

  const students = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {}, params, tenant);
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

export async function getVenues(tenant: string) {
  if (isPostgresEnabled()) {
    try {
      const pgVenues = await getVenuesPg(tenant);
      if (pgVenues !== null) return pgVenues;
    } catch (error) {
      console.error("[Postgres] getVenues failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const data = await fetchBaserow(
    `/database/rows/table/${tables.VENUES}/`, 
    {}, 
    { size: "200" },
    tenant
  );
  
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
    const typeField = row[DB.VENUES.FIELDS.TYPE];
    const typeValue = typeField?.value || "Hybrid"; 

    return {
      id: row.id,
      name: row[DB.VENUES.FIELDS.VENUE_NAME] || "Unknown Venue",
      capacity: parseInt(row[DB.VENUES.FIELDS.SEATING_CAPACITY]) || 0,
      marketingName: row[DB.VENUES.FIELDS.PUBLIC_NAME_MARKETING],
      type: typeValue, 
      historicalShows: row[DB.VENUES.FIELDS.PRODUCTIONS]?.length || 0 
    };
  });
}

export async function getVenueLogistics(tenant: string) {
  if (isPostgresEnabled()) {
    try {
      const pgLogistics = await getVenueLogisticsPg(tenant);
      if (pgLogistics !== null) return pgLogistics;
    } catch (error) {
      console.error("[Postgres] getVenueLogistics failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const [venuesData, spacesData, ratesData, classesData] = await Promise.all([
    fetchBaserow(`/database/rows/table/${tables.VENUES}/`, {}, { size: "200" }, tenant),
    fetchBaserow(`/database/rows/table/${tables.SPACES}/`, {}, { size: "200" }, tenant),
    fetchBaserow(`/database/rows/table/${tables.RENTAL_RATES}/`, {}, { size: "200" }, tenant),
    getClasses(tenant)
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

function mapShow(row: any, tenant: string) {
  const DB = getDB(tenant);
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
    branch: safeGet(row[DB.PRODUCTIONS.FIELDS.LOCATION], "General"), 
    venue: safeGet(row[DB.PRODUCTIONS.FIELDS.VENUE], "null"), 
    workflowOverrides: row[DB.PRODUCTIONS.FIELDS.WORKFLOW_OVERRIDES] || [] 
  };
}

export async function getAuditionProduction(tenant: string) {
  if (isPostgresEnabled()) {
    try {
      return await getAuditionProductionPg(tenant);
    } catch (error) {
      console.error("[Postgres] getAuditionProduction failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const F = DB.PRODUCTIONS.FIELDS;

  console.log(`🔍 [Sync] Checking for strictly 'Upcoming' Show for Auditions in ${tenant}...`);
  const allData = await fetchBaserow(`/database/rows/table/${tables.PRODUCTIONS}/`, {}, { size: "10" }, tenant);
  
  if (!Array.isArray(allData) || allData.length === 0) return null;
  const sortedShows = allData.sort((a, b) => b.id - a.id);
  const upcomingShow = sortedShows.find(row => safeGet(row[F.STATUS]) === "Upcoming");

  if (upcomingShow) {
     return mapShow(upcomingShow, tenant);
  }
  return null; 
}

export async function getActiveProduction(tenant: string) {
  if (isPostgresEnabled()) {
    try {
      const pgActive = await getActiveProductionPg(tenant);
      if (pgActive) return pgActive;
    } catch (error) {
      console.error("[Postgres] getActiveProduction failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const F = DB.PRODUCTIONS.FIELDS;

  console.log(`🔍 [Sync] Checking for Upcoming/Active Show in ${tenant}...`);
  const allData = await fetchBaserow(`/database/rows/table/${tables.PRODUCTIONS}/`, {}, { size: "10" }, tenant);
  
  if (!Array.isArray(allData) || allData.length === 0) return null;
  const sortedShows = allData.sort((a, b) => b.id - a.id);

  const currentShow = sortedShows.find(row => {
    const status = safeGet(row[F.STATUS]);
    const isActiveForm = safeGet(row[F.IS_ACTIVE]) === true;
    return status === "Upcoming" || status === "Active" || isActiveForm;
  });

  if (currentShow) {
     return mapShow(currentShow, tenant);
  }

  const latest = sortedShows[0];
  return mapShow(latest, tenant);
}

export async function getSeasons(tenant: string) {
  if (isPostgresEnabled()) {
    try {
      const pgSeasons = await getSeasonsPg(tenant);
      if (pgSeasons !== null) return pgSeasons;
    } catch (error) {
      console.error("[Postgres] getSeasons failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const data = await fetchBaserow(
    `/database/rows/table/${tables.SEASONS}/`, 
    {}, 
    { size: "200" },
    tenant
  );

  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: safeGet(row[DB.SEASONS.FIELDS.NAME], "Unnamed Season"),
    startDate: safeGet(row[DB.SEASONS.FIELDS.START_DATE]),
    endDate: safeGet(row[DB.SEASONS.FIELDS.END_DATE]),
    status: safeGet(row[DB.SEASONS.FIELDS.STATUS], "Planning"), 
    productionCount: Array.isArray(row[DB.SEASONS.FIELDS.PRODUCTIONS]) ? row[DB.SEASONS.FIELDS.PRODUCTIONS].length : 0
  })).sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

export async function getShowById(tenant: string, id: string | number) {
  if (isPostgresEnabled()) {
    try {
      const pgShow = await getShowByIdPg(tenant, id);
      if (pgShow) return pgShow;
    } catch (error) {
      console.error("[Postgres] getShowById failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const data = await fetchBaserow(`/database/rows/table/${tables.PRODUCTIONS}/${id}/`, {}, {}, tenant);
  if (!data || data.error || Array.isArray(data)) return null;
  return mapShow(data, tenant);
}

export async function getAllShows(tenant: string) {
  if (isPostgresEnabled()) {
    try {
      const pgShows = await getAllShowsPg(tenant);
      if (pgShows !== null) return pgShows;
    } catch (error) {
      console.error("[Postgres] getAllShows failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const data = await fetchBaserow(
    `/database/rows/table/${tables.PRODUCTIONS}/`, 
    {}, 
    { size: "200" },
    tenant
  );

  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
    const typeObj = row[DB.PRODUCTIONS.FIELDS.TYPE];
    const typeValue = typeObj?.value || "Other"; 
    const rawStatus = safeGet(row[DB.PRODUCTIONS.FIELDS.STATUS], "Archived");

    return {
      id: row.id,
      title: safeGet(row[DB.PRODUCTIONS.FIELDS.TITLE] || row[DB.PRODUCTIONS.FIELDS.FULL_TITLE], "Untitled"),
      season: safeGet(row[DB.PRODUCTIONS.FIELDS.SEASON_LINKED], "Unknown Season"),
      type: typeValue,
      status: rawStatus,
      isActive: safeGet(row[DB.PRODUCTIONS.FIELDS.IS_ACTIVE]) === true || rawStatus === 'Active',
      image: row[DB.PRODUCTIONS.FIELDS.SHOW_IMAGE]?.[0]?.url || null,
      location: safeGet(row[DB.PRODUCTIONS.FIELDS.LOCATION], "General"),
      venue: safeGet(row[DB.PRODUCTIONS.FIELDS.VENUE], "TBD"),
      productionFee: Number(row[DB.PRODUCTIONS.FIELDS.PRODUCTION_FEE] ?? 0) || 0,
      workflowOverrides: row[DB.PRODUCTIONS.FIELDS.WORKFLOW_OVERRIDES] || [],
      Performances: row['field_6177'] || row['Performances'] || null
    };
  }).sort((a: any, b: any) => b.id - a.id);
}

// ==============================================================================
// 👯 CASTING & PEOPLE (READ & WRITE)
// ==============================================================================

const PEOPLE_CACHE_TTL_MS = 60_000;
const peopleCache = new Map<string, { expiresAt: number; data: any[] }>();

export function invalidatePeopleCache(tenant?: string) {
  if (tenant) peopleCache.delete(tenant);
  else peopleCache.clear();
}

export async function getPeople(tenant: string) {
  const cached = peopleCache.get(tenant);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  if (isPostgresEnabled()) {
    try {
      const pgPeople = await getPeoplePg(tenant);
      if (pgPeople.length > 0) {
        peopleCache.set(tenant, { expiresAt: Date.now() + PEOPLE_CACHE_TTL_MS, data: pgPeople });
        return pgPeople;
      }
    } catch (error) {
      console.error("[Postgres] getPeople failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const F = DB.PEOPLE.FIELDS;
  const token = (tenant === "e2e" || tenant === "sandbox")
    ? process.env.SANDBOX_BASEROW_TOKEN
    : (process.env.BASEROW_API_TOKEN || process.env.NEXT_PUBLIC_BASEROW_TOKEN);

  let allRows: any[] = [];
  try {
    const firstRes = await fetch(
      `${BASE_URL}/api/database/rows/table/${tables.PEOPLE}/?size=200&page=1`,
      {
        headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    if (firstRes.ok) {
      const firstJson = await firstRes.json();
      const firstBatch = Array.isArray(firstJson?.results) ? firstJson.results : [];
      allRows = [...firstBatch];

      const totalCount = Number(firstJson?.count || firstBatch.length);
      const totalPages = Math.min(Math.ceil(totalCount / 200), 25);

      // Fetch remaining pages in parallel batches of 5 instead of sequentially
      for (let startPage = 2; startPage <= totalPages; startPage += 5) {
        const pageNumbers: number[] = [];
        for (let p = startPage; p < startPage + 5 && p <= totalPages; p++) {
          pageNumbers.push(p);
        }
        const batches = await Promise.all(
          pageNumbers.map((p) =>
            fetchBaserow(
              `/database/rows/table/${tables.PEOPLE}/`,
              {},
              { size: "200", page: p.toString() },
              tenant
            )
          )
        );
        for (const batch of batches) {
          if (Array.isArray(batch)) allRows.push(...batch);
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch people:", error);
    return [];
  }

  const mapped = allRows.map((row: any) => ({
    id: row.id,
    name: row[F.FULL_NAME] || `${row[F.FIRST_NAME] || ""} ${row[F.LAST_NAME] || ""}`.trim(),
    headshot: typeof row[F.HEADSHOT] === "string" ? row[F.HEADSHOT] : (row[F.HEADSHOT]?.[0]?.url || null),
    email: row[F.CYT_ACCOUNT_PERSONAL_EMAIL] || row[F.CYT_NATIONAL_INDIVIDUAL_EMAIL] || "",
    phone: row[F.PHONE_NUMBER] || "",
    roles: Array.isArray(row[F.STATUS])
      ? row[F.STATUS].map((s: any) => s?.value).filter(Boolean)
      : (typeof row[F.STATUS] === "string" && row[F.STATUS] ? [row[F.STATUS]] : [])
  }));

  peopleCache.set(tenant, { expiresAt: Date.now() + PEOPLE_CACHE_TTL_MS, data: mapped });
  return mapped;
}

export async function getRoles(tenant: string) {
  if (isPostgresEnabled()) {
    try {
      const pgRoles = await getRolesPg(tenant);
      if (pgRoles !== null) return pgRoles;
    } catch (error) {
      console.error("[Postgres] getRoles failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const F = DB.BLUEPRINT_ROLES.FIELDS;
  const data = await fetchBaserow(`/database/rows/table/${tables.BLUEPRINT_ROLES}/`, {}, { size: "200" }, tenant);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: row[F.ROLE_NAME], 
    type: row[F.ROLE_TYPE]  
  }));
}

export async function createCastAssignment(tenant: string, personId: number, roleId: number, productionId: number) {
  if (isPostgresEnabled()) {
    try {
      return await createCastAssignmentPg(tenant, personId, roleId, productionId);
    } catch (error) {
      console.error("[Postgres] createCastAssignment failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const body = {
    [DB.ASSIGNMENTS.FIELDS.PERSON]: [personId],
    [DB.ASSIGNMENTS.FIELDS.PERFORMANCE_IDENTITY]: [roleId],
    [DB.ASSIGNMENTS.FIELDS.PRODUCTION]: [productionId]
  };
  return await fetchBaserow(`/database/rows/table/${tables.ASSIGNMENTS}/`, { 
    method: "POST", 
    body: JSON.stringify(body) 
  }, {}, tenant);
}

export async function updateCastAssignment(tenant: string, assignmentId: number, personId: number | null, sceneIds?: number[]) {
  if (isPostgresEnabled()) {
    try {
      return await updateCastAssignmentPg(tenant, assignmentId, personId);
    } catch (error) {
      console.error("[Postgres] updateCastAssignment failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const F = DB.ASSIGNMENTS.FIELDS;
  const body: any = {};

  if (personId !== undefined) {
    body[F.PERSON] = personId ? [personId] : [];
  }

  if (sceneIds !== undefined) {
    body[F.SCENE_ASSIGNMENTS] = sceneIds; 
  }

  return await fetchBaserow(`/database/rows/table/${tables.ASSIGNMENTS}/${assignmentId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }, {}, tenant);
}

// ==============================================================================
// 📅 SCHEDULING & SCENES
// ==============================================================================

export async function getScheduleSlots(tenant: string, productionId: number) {
  if (isPostgresEnabled()) {
    try {
      const pgSlots = await getScheduleSlotsPg(tenant, productionId);
      if (pgSlots !== null) return pgSlots;
    } catch (error) {
      console.error("[Postgres] getScheduleSlots failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const F = DB.SCHEDULE_SLOTS.FIELDS;
  
  const events = await getProductionEvents(tenant, productionId);
  if (events.length === 0) return [];
  const eventIds = new Set(events.map((e: any) => e.id));

  let allSlots: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchBaserow(
      `/database/rows/table/${tables.SCHEDULE_SLOTS}/`, 
      {}, 
      { page: page.toString(), size: "200" },
      tenant
    );

    if (!Array.isArray(data) || data.length === 0) {
      hasMore = false;
    } else {
      const relevantSlots = data.filter((row: any) => {
         const linkedEventId = row[F.EVENT_LINK]?.[0]?.id;
         return eventIds.has(linkedEventId);
      });
      
      allSlots = [...allSlots, ...relevantSlots];
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

export async function getSceneAssignments(tenant: string, productionId: number) {
  if (isPostgresEnabled()) {
    try {
      const pgRows = await getSceneAssignmentsPg(tenant, productionId);
      if (pgRows !== null) return pgRows;
    } catch (error) {
      console.error("[Postgres] getSceneAssignments failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const F = DB.SCENE_ASSIGNMENTS.FIELDS; 
  
  const params = {
    size: "200", 
    [`filter__${F.PRODUCTION}__link_row_has`]: productionId,
  };

  const data = await fetchBaserow(`/database/rows/table/${tables.SCENE_ASSIGNMENTS}/`, {}, params, tenant);
  
  if (!Array.isArray(data)) return [];
  return data;
}

export async function saveScheduleBatch(tenant: string, productionId: number, newSlots: any[]) {
  if (isPostgresEnabled()) {
    try {
      const res = await saveScheduleBatchPg(tenant, productionId, newSlots);
      if (res.success) return true;
    } catch (error) {
      console.error("[Postgres] saveScheduleBatch failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const TABLE_ID = tables.SCHEDULE_SLOTS;
  const F = DB.SCHEDULE_SLOTS.FIELDS;

  const requests = newSlots.map((slot) => {
    return {
      [F.SCENE]: [slot.sceneId], 
      [F.TRACK]: slot.track,     
      [F.START_TIME]: new Date(slot.startTime).toISOString(), 
      [F.END_TIME]: new Date(slot.endTime).toISOString(),
      [F.DURATION]: slot.duration,
      [F.ACTIVE]: true,
    };
  });

  const chunkSize = 50;
  for (let i = 0; i < requests.length; i += chunkSize) {
    const chunk = requests.slice(i, i + chunkSize);
    await fetchBaserow(`/database/rows/table/${TABLE_ID}/batch/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: chunk })
    }, {}, tenant);
  }

  return true;
}

export async function clearSchedule(tenant: string, productionId: number) {
  if (isPostgresEnabled()) {
    try {
      const ok = await clearSchedulePg(tenant, productionId);
      if (ok) return;
    } catch (error) {
      console.error("[Postgres] clearSchedule failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const slots = await getScheduleSlots(tenant, productionId);
  const ids = slots.map((s:any) => s.id);
  
  const TABLE_ID = tables.SCHEDULE_SLOTS;
  const chunkSize = 50;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    await fetchBaserow(`/database/rows/table/${TABLE_ID}/batch/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: chunk.map((id:any) => id) }), 
    }, {}, tenant);
  }
}

export async function getScenes(tenant: string, productionId?: number) {
  if (isPostgresEnabled()) {
    try {
      const pgScenes = await getScenesPg(tenant, productionId);
      if (pgScenes !== null) return pgScenes;
    } catch (error) {
      console.error("[Postgres] getScenes failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const params: any = { size: "200" };
  const F = DB.SCENES.FIELDS;

  if (productionId) {
    params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;
  }

  const data = await fetchBaserow(`/database/rows/table/${tables.SCENES}/`, {}, params, tenant);
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

export async function getProductionEvents(tenant: string, productionId: number) {
  if (isPostgresEnabled()) {
    try {
      const pgEvents = await getProductionEventsPg(tenant, productionId);
      if (pgEvents !== null) return pgEvents;
    } catch (error) {
      console.error("[Postgres] getProductionEvents failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const F = DB.EVENTS.FIELDS;
  const params = {
    size: "200",
    [`filter__${F.PRODUCTION}__link_row_has`]: productionId,
  };

  const data = await fetchBaserow(`/database/rows/table/${tables.EVENTS}/`, {}, params, tenant);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    date: row[F.EVENT_DATE],
    startTime: row[F.START_TIME],
    endTime: row[F.END_TIME],
    type: safeGet(row[F.EVENT_TYPE], "Rehearsal"),
    isRequired: safeGet(row[F.IS_REQUIRED]),
  })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ==============================================================================
// 🛠️ ASSETS & RESOURCES
// ==============================================================================

export async function getProductionAssets(tenant: string, productionId?: number) {
  if (isPostgresEnabled()) {
    try {
      const pgAssets = await getProductionAssetsPg(tenant, productionId);
      if (pgAssets !== null) return pgAssets;
    } catch (error) {
      console.error("[Postgres] getProductionAssets failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const params: any = { size: "200" };
  const F = DB.ASSETS.FIELDS;
  if (productionId) {
    params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;
  }

  const data = await fetchBaserow(`/database/rows/table/${tables.ASSETS}/`, {}, params, tenant);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: safeGet(row[F.NAME], "Untitled Asset"),
    link: safeGet(row[F.LINK], "#"),
    type: safeGet(row[F.TYPE], "Prop"),
  }));
}

export async function createProductionAsset(tenant: string, name: string, url: string, type: string, productionId: number) {
  if (isPostgresEnabled()) {
    try {
      return await createProductionAssetPg(tenant, name, url, type, productionId);
    } catch (error) {
      console.error("[Postgres] createProductionAsset failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const body = {
    [DB.ASSETS.FIELDS.NAME]: name,
    [DB.ASSETS.FIELDS.LINK]: url,
    [DB.ASSETS.FIELDS.TYPE]: type,
    [DB.ASSETS.FIELDS.PRODUCTION]: [productionId]
  };
  return await fetchBaserow(`/database/rows/table/${tables.ASSETS}/`, { 
    method: "POST", 
    body: JSON.stringify(body) 
  }, {}, tenant);
}

// ==============================================================================
// 👥 PEOPLE, STAFF & COMMITTEES
// ==============================================================================

export async function getCastDemographics(tenant: string) {
  if (isPostgresEnabled()) {
    try {
      const pgDemo = await getCastDemographicsPg(tenant);
      if (pgDemo !== null) return pgDemo;
    } catch (error) {
      console.error("[Postgres] getCastDemographics failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const data = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {}, { size: "200" }, tenant);
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

export async function getAssignments(tenant: string, productionId?: number) {
  if (isPostgresEnabled()) {
    try {
      const pgAssignments = await getAssignmentsPg(tenant, productionId);
      if (pgAssignments !== null) return pgAssignments;
    } catch (error) {
      console.error("[Postgres] getAssignments failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const F = DB.ASSIGNMENTS.FIELDS;
  const params: any = { size: "200" }; 

  if (productionId) {
    params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;
  }

  let allRows: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchBaserow(
      `/database/rows/table/${tables.ASSIGNMENTS}/`, 
      {}, 
      { ...params, page: page.toString() },
      tenant
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
    const personObj = row[F.PERSON]?.[0]; 
    
    return {
      id: row.id,
      assignment: row[F.ASSIGNMENT] || "Unknown Role", 
      personId: personObj ? personObj.id : 0, 
      personName: personObj ? personObj.value : "Unknown Actor",
    };
  });
}

export async function getCreativeTeam(tenant: string, productionId?: number) {
  if (isPostgresEnabled()) {
    try {
      const pgTeam = await getCreativeTeamPg(tenant, productionId);
      if (pgTeam !== null) return pgTeam;
    } catch (error) {
      console.error("[Postgres] getCreativeTeam failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const F = DB.SHOW_TEAM.FIELDS;
  const params: any = { size: "100" };
  
  if (productionId) {
    params[`filter__${F.PRODUCTIONS}__link_row_has`] = productionId;
  }

  const data = await fetchBaserow(`/database/rows/table/${tables.SHOW_TEAM}/`, {}, params, tenant);
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

export async function getProductionConflicts(tenant: string, productionId: number) {
  if (isPostgresEnabled()) {
    try {
      const pgConflicts = await getProductionConflictsPg(tenant, productionId);
      if (pgConflicts !== null) return pgConflicts;
    } catch (error) {
      console.error("[Postgres] getProductionConflicts failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const F = DB.CONFLICTS.FIELDS;
  const params = {
    size: "200",
    [`filter__${F.PRODUCTION}__link_row_has`]: productionId,
  };

  const data = await fetchBaserow(`/database/rows/table/${tables.CONFLICTS}/`, {}, params, tenant);
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

export async function getCommitteeData(tenant: string, productionId?: number) {
  if (isPostgresEnabled()) {
    try {
      const pgData = await getCommitteeDataPg(tenant, productionId);
      if (pgData !== null) return pgData;
    } catch (error) {
      console.error("[Postgres] getCommitteeData failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const params: any = { size: "200" };
  const F = DB.COMMITTEE_PREFS.FIELDS; 
  
  if (productionId) {
    params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;
  }

  const data = await fetchBaserow(`/database/rows/table/${tables.COMMITTEE_PREFS}/`, {}, params, tenant);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: extractName(row[F.PARENT_GUARDIAN_NAME], "Unknown Parent"),
    studentName: extractName(row[F.STUDENT_NAME] || row[F.STUDENT_ID], "Unknown"),
    
    preShow1: safeGet(row[F.PRE_SHOW_1ST]),
    preShow2: safeGet(row[F.PRE_SHOW_2ND]),
    preShow3: safeGet(row[F.PRE_SHOW_3RD]), 
    showWeek1: safeGet(row[F.SHOW_WEEK_1ST]),
    showWeek2: safeGet(row[F.SHOW_WEEK_2ND]),
    showWeek3: safeGet(row[F.SHOW_WEEK_3RD]), 
    
    email: safeGet(row[F.EMAIL]),
    phone: safeGet(row[F.PHONE]),
    
    assignedPreShow: safeGet(row[F.PRE_SHOW_PHASE]) || null,
    assignedShowWeek: safeGet(row[F.SHOW_WEEK_COMMITTEES]) || null,
    isChair: safeGet(row[F.IS_CHAIR]) === true
  }));
}

export async function getCommitteePreferences(tenant: string) {
  if (isPostgresEnabled()) {
    try {
      const pgData = await getCommitteeDataPg(tenant);
      if (pgData !== null) return pgData;
    } catch (error) {
      console.error("[Postgres] getCommitteePreferences failed, falling back to Baserow:", error);
    }
  }
  const tables = await getTenantTableConfig(tenant);
  return fetchBaserow(`/database/rows/table/${tables.COMMITTEE_PREFS}/`, {}, {}, tenant);
}

export async function getConflicts(tenant: string, id?: any) {
  if (isPostgresEnabled()) {
    try {
      const pgConflicts = await getProductionConflictsPg(tenant, id ? Number(id) : undefined);
      if (pgConflicts !== null) return pgConflicts;
    } catch (error) {
      console.error("[Postgres] getConflicts failed, falling back to Baserow:", error);
    }
  }
  const tables = await getTenantTableConfig(tenant);
  return fetchBaserow(`/database/rows/table/${tables.CONFLICTS}/`, {}, {}, tenant);
}

export async function getComplianceData(tenant: string, productionId?: number) {
  if (isPostgresEnabled()) {
    try {
      const pgData = await getComplianceDataPg(tenant);
      if (pgData !== null) return pgData;
    } catch (error) {
      console.error("[Postgres] getComplianceData failed, falling back to Baserow:", error);
    }
  }
  const tables = await getTenantTableConfig(tenant);
  return fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {}, {}, tenant);
}

// ==============================================================================
// 🎤 AUDITIONS (READ & WRITE)
// ==============================================================================

export async function getAuditionSlots(tenant: string, productionId: number) {
  if (isPostgresEnabled()) {
    try {
      const pgSlots = await getAuditionSlotsPg(tenant, productionId);
      if (pgSlots !== null) return pgSlots;
    } catch (error) {
      console.error("[Postgres] getAuditionSlots failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  
  if (!tables.AUDITION_SLOTS) return [];
  
  const F = DB.AUDITION_SLOTS.FIELDS;

  const data = await fetchBaserow(`/database/rows/table/${tables.AUDITION_SLOTS}/`, {}, {
    size: "100",
    [`filter__${F.PRODUCTION}__link_row_has`]: productionId
  }, tenant);

  if (!Array.isArray(data) || data.length === 0) return [];

  return data.map((row: any) => {
    let rawLabel = row[F.TIME_LABEL] ?? row["Time Label"] ?? "TBD TBD";
    
    if (Array.isArray(rawLabel)) rawLabel = rawLabel[0]?.value || rawLabel[0];
    if (typeof rawLabel === 'object' && rawLabel !== null) rawLabel = rawLabel.value;
    if (typeof rawLabel !== 'string') rawLabel = "TBD TBD";

    const capacity = parseInt(row[F.CAPACITY] ?? row["Capacity"] ?? 0) || 0;
    const taken = parseInt(row[F.TAKEN] ?? row["Taken"] ?? 0) || 0;
    const remaining = capacity - taken; 

    return {
      id: row.id?.toString() || Math.random().toString(), 
      day: rawLabel.split(' ')[0] || 'TBD', 
      time: rawLabel.split(' ').slice(1).join(' ') || rawLabel, 
      capacity,
      taken,
      remaining, 
      isFull: remaining <= 0 || row[F.IS_FULL] === true || row["Is Full?"] === true
    };
  });
}

export async function getAuditionees(tenant: string, productionId?: number) {
  if (isPostgresEnabled()) {
    try {
      const pgAuditionees = await getAuditioneesPg(tenant, productionId);
      if (pgAuditionees !== null) return pgAuditionees;
    } catch (error) {
      console.error("[Postgres] getAuditionees failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const params: any = { size: "200" }; 
  const F = DB.AUDITIONS.FIELDS;
  
  if(productionId) params[`filter__${F.PRODUCTION}__link_row_has`] = productionId;
  
  const data = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {}, params, tenant);
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
      const linkedSlot = row[F.AUDITION_SLOTS]?.[0]?.value;
      const performerId = row[F.PERFORMER]?.[0]?.id || null;
      const performerName = extractName(row[F.PERFORMER], "Unknown Actor");
      
      let avatarUrl = row[F.HEADSHOT]?.[0]?.url || safeGet(row[F.HEADSHOT], "");
      if (!avatarUrl || avatarUrl === "null" || typeof avatarUrl !== 'string' || !avatarUrl.startsWith("http")) {
          avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(performerName)}&background=27272a&color=60a5fa`;
      }

      let trackUrl = "";
      const trackField = row[F.BACKING_TRACK];
      if (Array.isArray(trackField) && trackField.length > 0) {
          trackUrl = trackField[0].url || trackField[0].value || "";
      } else if (typeof trackField === "string") {
          trackUrl = trackField;
      }

      let videoUrl = "";
      const videoField = row[F.AUDITION_VIDEO];
      if (Array.isArray(videoField) && videoField.length > 0) {
          videoUrl = videoField[0].url || videoField[0].value || "";
      } else if (typeof videoField === "string") {
          videoUrl = videoField;
      }

      return {
          id: row.id,
          performerId: performerId, 
          name: performerName,
          studentId: safeId(row[F.PERFORMER]),
          role: "Auditionee",
          status: row[F.CHECKED_IN] ? "Checked In" : "Pending",
          timeSlot: linkedSlot || "WALK-IN",
          auditionDay: row[F.DATE] ? new Date(row[F.DATE]).toLocaleDateString('en-US', { weekday: 'long' }) : "",
          avatar: avatarUrl,
          lobbyNote: safeGet(row[F.LOBBY_NOTE], ""),
          checkedIn: row[F.CHECKED_IN] === true,

          // Core Audition Data
          backingTrack: trackUrl,
          song: safeGet(row[F.SONG], ""),
          monologue: safeGet(row[F.MONOLOGUE], ""),
          vocalScore: parseFloat(safeGet(row[F.VOCAL_SCORE], 0)),
          actingScore: parseFloat(safeGet(row[F.ACTING_SCORE], 0)),
          danceScore: parseFloat(safeGet(row[F.DANCE_SCORE], 0)),
          presenceScore: parseFloat(safeGet(row[F.STAGE_PRESENCE_SCORE], 0)),
          actingNotes: safeGet(row[F.ACTING_NOTES], ""),
          musicNotes: safeGet(row[F.MUSIC_NOTES], ""),
          choreoNotes: safeGet(row[F.CHOREOGRAPHY_NOTES], ""),
          dropInNotes: safeGet(row[F.DROP_IN_NOTES], ""),
          adminNotes: safeGet(row[F.ADMIN_NOTES], ""),
          
          auditionNumber: safeGet(row[F.AUDITION_NUMBER], ""),
          preferredRoles: safeGet(row[F.PREFERRED_ROLES], ""),
          stageRomance: row[F.STAGE_ROMANCE] === true,
          willingToAlterAppearance: row[F.WILLING_TO_ALTER_APPEARANCE] === true,
          otherTalents: safeGet(row[F.OTHER_TALENTS], ""),
          hairColor: safeGet(row[F.HAIR_COLOR], ""),
          height: safeGet(row[F.HEIGHT], ""),
          age: safeGet(row[F.AGE], ""),
          vocalRange: safeGet(row[F.VOCAL_RANGE], ""),
          dob: safeGet(row[F.BIRTHDATE], ""),
          conflicts: safeGet(row[F.CONFLICTS], ""),
          video: videoUrl,
          showHistory: safeGet(row[F.PAST_PRODUCTIONS], "")
      };
  });
}

export async function submitAudition(tenant: string, studentId: number, productionId: number, extraData: any) {
    if (isPostgresEnabled()) {
      try {
        return await submitAuditionPg(tenant, studentId, productionId, extraData || {});
      } catch (error) {
        console.error("[Postgres] submitAudition failed, falling back to Baserow:", error);
      }
    }

    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
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
    
    return await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }, {}, tenant);
}

export async function updateAuditionSlot(tenant: string, rowId: number, data: any) {
    if (isPostgresEnabled()) {
        const { updateAuditionSlotLegacyPg } = await import("@/app/lib/db/audition-panel-repo");
        return await updateAuditionSlotLegacyPg(tenant, rowId, data);
    }
    const tables = await getTenantTableConfig(tenant);
    return await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${rowId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }, {}, tenant);
}

// ==============================================================================
// 🔐 AUTHENTICATION & USER
// ==============================================================================

export async function findUserByEmail(tenant: string, email: string) {
  if (isPostgresEnabled()) {
    try {
      const pgUser = await findUserByEmailPg(tenant, email);
      if (pgUser) return pgUser;
      // When Postgres is the active backend and Baserow isn't configured, return null cleanly
      if (!process.env.NEXT_PUBLIC_MASTER_REGISTRY_TABLE_ID) return null;
    } catch (error) {
      console.error("[Postgres] findUserByEmail failed, falling back to Baserow:", error);
      if (!process.env.NEXT_PUBLIC_MASTER_REGISTRY_TABLE_ID) return null;
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const params = {
    filter_type: "OR",
    size: "1",
    [`filter__${DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: email,
    [`filter__${DB.PEOPLE.FIELDS.CYT_NATIONAL_INDIVIDUAL_EMAIL}__equal`]: email,
  };

  const results = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {}, params, tenant);
  if (!results || results.length === 0) return null;
  
  const row = results[0];
  const rawStatus = row[DB.PEOPLE.FIELDS.STATUS];
  const tags = Array.isArray(rawStatus) ? rawStatus.map((s:any) => s.value) : [];

  let assignedRole = "Student";
  if (tags.includes("Admin") || tags.includes("Executive Director") || tags.includes("Business Manager")) {
      assignedRole = "Admin";
  } else if (tags.includes("Director") || tags.includes("Staff") || tags.includes("Production Coordinator") || tags.includes("Education Coordinator")) {
      assignedRole = "Staff";
  } else if (tags.includes("Check In Team") || tags.includes("Committee Team")) {
      assignedRole = "Volunteer";
  } else if (tags.includes("Parent/Guardian")) {
      assignedRole = "Parent/Guardian";
  } else if (tags.length > 0) {
      assignedRole = tags[0]; 
  }

  return {
    id: row.id.toString(),
    name: safeGet(row[DB.PEOPLE.FIELDS.FULL_NAME]),
    email: email,
    image: row[DB.PEOPLE.FIELDS.HEADSHOT]?.[0]?.url || null,
    role: assignedRole, 
    appPassword: row[DB.PEOPLE.FIELDS.APP_PASSWORD] || null,
  };
}

export async function verifyUserCredentials(tenant: string, email: string, password: string) {
  const user = await findUserByEmail(tenant, email);
  if (!user) return null;
  return user; 
}

export async function getUserProfile(tenant: string, email: string) {
  if (isPostgresEnabled()) {
    try {
      const pgProfile = await getUserProfilePg(tenant, email);
      if (pgProfile) return pgProfile;
    } catch (error) {
      console.error("[Postgres] getUserProfile failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const userRows = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {}, {
    filter_type: "OR",
    size: "1",
    [`filter__${DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: email,
    [`filter__${DB.PEOPLE.FIELDS.CYT_NATIONAL_INDIVIDUAL_EMAIL}__equal`]: email,
  }, tenant);

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
    image: typeof user[DB.PEOPLE.FIELDS.HEADSHOT] === "string"
      ? user[DB.PEOPLE.FIELDS.HEADSHOT]
      : (user[DB.PEOPLE.FIELDS.HEADSHOT]?.[0]?.url || null),
    familyMembers: [] as any[]
  };

  if (Array.isArray(familyLink) && familyLink.length > 0) {
    const familyId = familyLink[0].id;
    const familyData = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {}, {
      [`filter__${DB.PEOPLE.FIELDS.FAMILIES}__link_row_has`]: familyId,
      size: "20"
    }, tenant);

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

export async function getUserProductionRole(tenant: string, userId: number, productionId: number) {
  if (isPostgresEnabled()) {
    try {
      const pgRole = await getUserProductionRolePg(tenant, userId, productionId);
      if (pgRole !== null) return pgRole;
    } catch (error) {
      console.error("[Postgres] getUserProductionRole failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const params = {
    filter_type: "AND",
    [`filter__${DB.SHOW_TEAM.FIELDS.PERSON}__link_row_has`]: userId,
    [`filter__${DB.SHOW_TEAM.FIELDS.PRODUCTIONS}__link_row_has`]: productionId,
  };

  const rows = await fetchBaserow(`/database/rows/table/${tables.SHOW_TEAM}/`, {}, params, tenant);

  if (!rows || rows.length === 0) return null;
  return safeGet(rows[0][DB.SHOW_TEAM.FIELDS.POSITION]); 
}

// ==============================================================================
// 📊 ANALYTICS
// ==============================================================================

export async function getPerformanceAnalytics(tenant: string, productionId?: number) {
  if (isPostgresEnabled()) {
    try {
      const pgAnalytics = await getPerformanceAnalyticsPg(tenant);
      if (pgAnalytics !== null) {
        return productionId
          ? pgAnalytics.filter((p) => p.productionId === productionId)
          : pgAnalytics;
      }
    } catch (error) {
      console.error("[Postgres] getPerformanceAnalytics failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const data = await fetchBaserow(`/database/rows/table/${tables.PERFORMANCES}/`, {}, { size: "200" }, tenant);
  if (!Array.isArray(data)) return [];

return data.map((row: any) => {
    const sold = parseFloat(safeGet(row[DB.PERFORMANCES.FIELDS.TICKETS_SOLD], 0));
    const capacity = parseFloat(safeGet(row[DB.PERFORMANCES.FIELDS.TOTAL_INVENTORY], 0));
    return {
      productionId: safeId(row[DB.PERFORMANCES.FIELDS.PRODUCTION]), 
      name: safeGet(row[DB.PERFORMANCES.FIELDS.PERFORMANCE], "Show"),
      sold: sold,
      capacity: capacity,
      empty: Math.max(0, capacity - sold),
      fillRate: capacity > 0 ? Math.round((sold / capacity) * 100) : 0,
    };
  });
}

export async function createGoogleUser(tenant: string, googleUser: any) {
  if (isPostgresEnabled()) {
    try {
      const created = await createGoogleUserPg(tenant, googleUser);
      if (created) return created;
    } catch (error) {
      console.error("[Postgres] createGoogleUser failed, falling back to Baserow:", error);
    }
  }

  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  const F = DB.PEOPLE.FIELDS;
  
  const fullName = googleUser.name || "Unknown User";
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "";

  const payload = {
    [F.FIRST_NAME]: firstName,
    [F.LAST_NAME]: lastName,
    [F.CYT_ACCOUNT_PERSONAL_EMAIL]: googleUser.email,
    [F.STATUS]: ["Guest"], 
    [F.ORIGINAL_BIO]: "Created via Google Login Auto-Registration",
  };

  const res = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }, {}, tenant);

  return res;
}

export async function getExistingAuditions(tenant: string, email: string, productionId: number) {
  if (!email) return [];
  if (isPostgresEnabled()) {
    try {
      const pgExisting = await getExistingAuditionsPg(tenant, email, productionId);
      if (pgExisting !== null) return pgExisting;
    } catch (error) {
      console.error("[Postgres] getExistingAuditions failed, falling back to Baserow:", error);
    }
  }

  try {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    if (!tables.PEOPLE || !tables.AUDITIONS) return [];

    const people = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {}, {
      filter_type: "AND",
      [`filter__${DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: email
    }, tenant);

    if (!Array.isArray(people) || people.length === 0) return [];
    
    const auditionPromises = people.map((p: any) => 
      fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {}, {
        filter_type: "AND",
        [`filter__${DB.AUDITIONS.FIELDS.PRODUCTION}__link_row_has`]: productionId,
        [`filter__${DB.AUDITIONS.FIELDS.PERFORMER}__link_row_has`]: p.id
      }, tenant)
    );

    const results = await Promise.all(auditionPromises);
    const auditions = results.flat().filter(a => a && !a.error);

    const F = DB.AUDITIONS.FIELDS;

    return auditions.map((a: any) => {
      const totalInches = parseInt(a[F.HEIGHT] || "0");
      const ft = totalInches > 0 ? Math.floor(totalInches / 12).toString() : "";
      const inch = totalInches > 0 ? (totalInches % 12).toString() : "";

      let trackUrl = "";
      if (Array.isArray(a[F.BACKING_TRACK]) && a[F.BACKING_TRACK].length > 0) trackUrl = a[F.BACKING_TRACK][0].url || a[F.BACKING_TRACK][0].value || "";
      else if (typeof a[F.BACKING_TRACK] === "string") trackUrl = a[F.BACKING_TRACK];

      return {
        id: a.id,
        studentId: safeId(a[F.PERFORMER]),
        name: extractName(a[F.PERFORMER], "Student"),
        status: safeGet(a[F.STATUS], "Pending"),
        role: extractName(a[F.CAST_ROLE], ""),
        signatures: safeGet(a[F.SIGNATURES], ""),
        bio: safeGet(a[F.PROGRAM_BIO], ""),
        congratsAd: safeGet(a[F.CONGRATS_AD_TEXT], ""),
        paidFees: Boolean(a[F.PAID_FEES]),
        productionFeeStatus: safeGet(a[F.PRODUCTION_FEE_STATUS], ""),
        time: safeGet(a[F.AUDITION_SLOTS], "Pending Time"),
        timeSlot: safeGet(a[F.AUDITION_SLOTS], "Pending Time"),
        song: safeGet(a[F.SONG], "No Song Selected"),
        adminNotes: safeGet(a[F.ADMIN_NOTES], ""),
        checkedIn: Boolean(a[F.CHECKED_IN]),
        isCheckedIn: Boolean(a[F.CHECKED_IN]),
        
        // 🟢 FIX: Wrap everything in safeGet so React gets raw text instead of {id, value} objects!
        rawAuditionData: {
          fullName: extractName(a[F.PERFORMER], ""),
          dob: safeGet(a[F.BIRTHDATE], ""),
          grade: safeGet(a[F.GRADE], ""),
          heightFt: ft,
          heightIn: inch,
          hairColor: safeGet(a[F.HAIR_COLOR], ""),
          songTitle: safeGet(a[F.SONG], ""),
          musicFileName: trackUrl,
          vocalRange: safeGet(a[F.VOCAL_RANGE], ""),
          auditionSlotId: safeId(a[F.AUDITION_SLOTS]) || "",
          conflicts: safeGet(a[F.CONFLICTS], ""), 
          headshotUrl: a[F.HEADSHOT]?.[0]?.url || null,
          cytWebsiteRegistered: true,
          callbackStatus: safeGet(a[F.CALLBACK_STATUS], "Unknown"),
        }
      };
    });
  } catch (error) {
    console.error("Failed to fetch existing auditions:", error);
    return [];
  }
}

export async function getMasterShows(tenant: string) {
  if (isPostgresEnabled()) {
    try {
      const pgShows = await getMasterShowsPg(tenant);
      if (pgShows !== null) return pgShows;
    } catch (error) {
      console.error("[Postgres] getMasterShows failed, falling back to Baserow:", error);
    }
  }

  try {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const tableId = tables.MASTER_SHOW_DB || DB.MASTER_SHOW_DB.ID;
    const F = DB.MASTER_SHOW_DB.FIELDS;

    const rows = await fetchBaserow(`/database/rows/table/${tableId}/`, {}, { size: "200" }, tenant);
    if (!Array.isArray(rows)) return [];

    return rows
      .map((row: any) => ({
        id: row.id,
        title: safeGet(row[F.SHOW_TITLE] || row[F.COMPLETE_TITLE], "Untitled Show"),
      }))
      .sort((a: any, b: any) => a.title.localeCompare(b.title));
  } catch (error) {
    console.error("Failed to fetch master shows:", error);
    return [];
  }
}

export async function getStaffPositions(tenant: string) {
  if (isPostgresEnabled()) {
    try {
      const pgPositions = await getStaffPositionsPg(tenant);
      if (pgPositions !== null) return pgPositions;
    } catch (error) {
      console.error("[Postgres] getStaffPositions failed, falling back to Baserow:", error);
    }
  }

  try {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const tableId = tables.ROLES_POSITIONS || DB.STAFF_POSITIONS.ID;
    const F = DB.STAFF_POSITIONS.FIELDS;

    const rows = await fetchBaserow(`/database/rows/table/${tableId}/`, {}, { size: "200" }, tenant);
    if (!Array.isArray(rows)) return [];

    return rows
      .map((row: any) => ({
        id: row.id,
        name: safeGet(row[F.ROLE_NAME], "Position"),
        department: safeGet(row[F.DEPARTMENT], "General"),
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Failed to fetch staff positions:", error);
    return [];
  }
}

export { getTenantTableConfig };