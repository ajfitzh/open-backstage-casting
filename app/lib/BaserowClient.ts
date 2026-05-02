import { z } from 'zod';
import { DB } from './schema';
import { getTenantTableConfig } from './tenant-config';
import { UserProfileListSchema } from './schemas/person';
import { SceneListSchema, RoleListSchema, RosterListSchema, AssignmentListSchema } from './schemas/casting';
import { EventListSchema, SlotListSchema, ConflictListSchema } from './schemas/schedule';
import { ClassListSchema } from './schemas/education';

const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");
const API_TOKEN = process.env.BASEROW_API_TOKEN || process.env.NEXT_PUBLIC_BASEROW_TOKEN;
const HEADERS = {
  "Authorization": `Token ${API_TOKEN}`,
  "Content-Type": "application/json",
};

// Generic list schema for fallback
const GenericListSchema = z.array(z.object({ id: z.number() }).passthrough());

async function fetchAndValidate<T extends z.ZodTypeAny>(
  endpoint: string, schema: T, options: RequestInit = {}
): Promise<z.infer<T> | null> {
  try {
    const finalUrl = `${BASE_URL}/api${endpoint}`;
    const res = await fetch(finalUrl, { ...options, headers: { ...HEADERS, ...options.headers }, cache: "no-store" });
    if (!res.ok) {
      console.error(`[BaserowClient] API Error ${res.status} at ${finalUrl}`);
      return null;
    }
    const rawData = await res.json();
    const results = rawData.results || rawData;
    const validationResult = schema.safeParse(results);
    if (!validationResult.success) {
      console.error("[BaserowClient] Validation Error:", validationResult.error.flatten());
      return null;
    }
    return validationResult.data;
  } catch (error) {
    console.error("[BaserowClient] Network Error:", error);
    return null;
  }
}

// --- TENANT-AWARE FUNCTIONS ---

async function findUserByEmail(tenant: string, email: string) {
    const tables = await getTenantTableConfig(tenant);
    const F = DB.PEOPLE.FIELDS;
    const params = new URLSearchParams({
        filter_type: "OR", size: "1",
        [`filter__${F.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: email, 
        [`filter__${F.CYT_NATIONAL_INDIVIDUAL_EMAIL}__equal`]: email, 
    });
    const result = await fetchAndValidate(`/database/rows/table/${tables.PEOPLE}/?${params.toString()}`, UserProfileListSchema);
    return result?.[0] ?? null;
}

async function getCommitteePrefsForShow(tenant: string, showId: number) {
  const tables = await getTenantTableConfig(tenant);
  const F = DB.COMMITTEE_PREFS.FIELDS;
  
  // 🟢 FIXED: Using dynamic Table ID and field_XXXX filter
  const endpoint = `/database/rows/table/${tables.COMMITTEE_PREFS}/?filter__${F.PRODUCTION}__link_row_has=${showId}&size=200`;
  
  const result = await fetchAndValidate(endpoint, z.any()); 
  if (!result) return [];

  return result.map((row: any) => {
    const extractArray = (arr: any) => (Array.isArray(arr) ? arr.map(item => item.value).join(" & ") : "");
    const extractSelect = (field: any) => field?.value || null;

    return {
      id: row.id,
      // 🟢 FIXED: Using strictly-typed field IDs from your new schema
      name: extractArray(row[F.PARENT_GUARDIAN_NAME]),
      email: extractArray(row[F.EMAIL]),
      phone: extractArray(row[F.PHONE]),
      studentName: extractArray(row[F.STUDENT_NAME]),
      
      preShow1: extractSelect(row[F.PRE_SHOW_1ST]),
      preShow2: extractSelect(row[F.PRE_SHOW_2ND]),
      preShow3: extractSelect(row[F.PRE_SHOW_3RD]),
      
      showWeek1: extractSelect(row[F.SHOW_WEEK_1ST]),
      showWeek2: extractSelect(row[F.SHOW_WEEK_2ND]),
      showWeek3: extractSelect(row[F.SHOW_WEEK_3RD]),
      
      assignedPreShow: extractSelect(row[F.PRE_SHOW_PHASE]),
      assignedShowWeek: extractSelect(row[F.SHOW_WEEK_COMMITTEES]),
      isChair: row[F.IS_CHAIR] === true,
    };
  });
}

async function getRosterForShow(tenant: string, showId: number) {
  const tables = await getTenantTableConfig(tenant);
  const F = DB.AUDITIONS.FIELDS;
  return await fetchAndValidate(`/database/rows/table/${tables.AUDITIONS}/?filter__${F.PRODUCTION}__link_row_has=${showId}&size=200`, RosterListSchema) ?? [];
}

async function getProduction(tenant: string, showId: number) {
  const tables = await getTenantTableConfig(tenant);
  const F = DB.PRODUCTIONS.FIELDS;
  const RawProdSchema = z.object({ id: z.number() }).passthrough();
  const res = await fetchAndValidate(`/database/rows/table/${tables.PRODUCTIONS}/${showId}/`, RawProdSchema);
  return res ? { id: res.id, title: res[F.TITLE] || "Unknown Show" } : null;
}

// 🟢 Simplified export for all other functions (Repeat the pattern: take tenant, get tables)
export const BaserowClient = {
  findUserByEmail,
  getCommitteePrefsForShow,
  getRosterForShow,
  getProduction,
  
  // Helper to wrap old functions that need tenant awareness
  async getRolesForShow(tenant: string, showId: number) {
    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.ROLES_POSITIONS}/?filter__${DB.BLUEPRINT_ROLES.FIELDS.MASTER_SHOW_DATABASE}__link_row_has=${showId}&size=200`, RoleListSchema) ?? [];
  },

  async getScenesForShow(tenant: string, showId: number) {
    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.SCENES}/?filter__${DB.SCENES.FIELDS.PRODUCTION}__link_row_has=${showId}&size=200`, SceneListSchema) ?? [];
  },

  async getEventsForShow(tenant: string, showId: number) {
    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.EVENTS}/?filter__${DB.EVENTS.FIELDS.PRODUCTION}__link_row_has=${showId}&size=200`, EventListSchema) ?? [];
  },

  async getConflictsForShow(tenant: string, showId: number) {
    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.CONFLICTS}/?filter__${DB.CONFLICTS.FIELDS.PRODUCTION}__link_row_has=${showId}&size=200`, ConflictListSchema) ?? [];
  },

  async getAllSeasons(tenant: string) {
    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.SEASONS}/?size=200`, GenericListSchema) ?? [];
  }
};