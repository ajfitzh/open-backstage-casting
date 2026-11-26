import { z } from 'zod';
import { DB } from './schema';
import { getTenantTableConfig } from './tenant-config';
import { UserProfileListSchema } from './schemas/person';
import { SceneListSchema, RoleListSchema, RosterListSchema, AssignmentListSchema } from './schemas/casting';
import { EventListSchema, SlotListSchema, ConflictListSchema } from './schemas/schedule';
import { ClassListSchema } from './schemas/education';
import { isPostgresEnabled } from '@/db';
import { findUserByEmailClientPg } from '@/app/lib/db/core-repo';
import {
  getAllProductionsClientPg,
  getAllSeasonsClientPg,
  getAllVenuesClientPg,
  getAssignmentsForShowClientPg,
  getCommitteeDataPg,
  getPerformancesClientPg,
  getProductionClientPg,
  getProductionConflictsPg,
  getProductionEventsPg,
  getRolesForShowClientPg,
  getRosterForShowClientPg,
  getScenesForShowClientPg,
  getSlotsForShowClientPg,
} from '@/app/lib/db/operations-repo';
import {
  getClassesPg,
  getProposalsClientPg,
  getTeacherApplicantsClientPg,
} from '@/app/lib/db/wardrobe-academy-repo';

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
    if (isPostgresEnabled()) {
      try {
        const pgUser = await findUserByEmailClientPg(tenant, email);
        if (pgUser) return pgUser;
      } catch (error) {
        console.error("[Postgres] BaserowClient.findUserByEmail failed, falling back:", error);
      }
    }

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
  if (isPostgresEnabled()) {
    try {
      const pgData = await getCommitteeDataPg(tenant, showId);
      if (pgData !== null) return pgData;
    } catch (error) {
      console.error("[Postgres] BaserowClient.getCommitteePrefsForShow failed, falling back:", error);
    }
  }

  const tables = await getTenantTableConfig(tenant);
  const F = DB.COMMITTEE_PREFS.FIELDS;
  
  const endpoint = `/database/rows/table/${tables.COMMITTEE_PREFS}/?filter__${F.PRODUCTION}__link_row_has=${showId}&size=200`;
  
  const result = await fetchAndValidate(endpoint, z.any()); 
  if (!result) return [];

  return result.map((row: any) => {
    const extractArray = (arr: any) => (Array.isArray(arr) ? arr.map(item => item.value).join(" & ") : "");
    const extractSelect = (field: any) => field?.value || null;

    return {
      id: row.id,
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
  if (isPostgresEnabled()) {
    try {
      const pgData = await getRosterForShowClientPg(tenant, showId);
      if (pgData !== null) return pgData;
    } catch (error) {
      console.error("[Postgres] BaserowClient.getRosterForShow failed, falling back:", error);
    }
  }

  const tables = await getTenantTableConfig(tenant);
  const F = DB.AUDITIONS.FIELDS;
  return await fetchAndValidate(`/database/rows/table/${tables.AUDITIONS}/?filter__${F.PRODUCTION}__link_row_has=${showId}&size=200`, RosterListSchema) ?? [];
}

async function getProduction(tenant: string, showId: number) {
  if (isPostgresEnabled()) {
    try {
      const pgProd = await getProductionClientPg(tenant, showId);
      if (pgProd) return pgProd;
    } catch (error) {
      console.error("[Postgres] BaserowClient.getProduction failed, falling back:", error);
    }
  }

  const tables = await getTenantTableConfig(tenant);
  const F = DB.PRODUCTIONS.FIELDS;
  const RawProdSchema = z.object({ id: z.number() }).passthrough();
  const res = await fetchAndValidate(`/database/rows/table/${tables.PRODUCTIONS}/${showId}/`, RawProdSchema);
  return res ? { id: res.id, title: res[F.TITLE] || "Unknown Show" } : null;
}

export const BaserowClient = {
  findUserByEmail,
  getCommitteePrefsForShow,
  getRosterForShow,
  getProduction,
  
  async getRolesForShow(tenant: string, showId: number) {
    if (isPostgresEnabled()) {
      try {
        const pgRoles = await getRolesForShowClientPg(tenant, showId);
        if (pgRoles !== null) return pgRoles;
      } catch (error) {
        console.error("[Postgres] BaserowClient.getRolesForShow failed, falling back:", error);
      }
    }

    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.ROLES_POSITIONS}/?filter__${DB.BLUEPRINT_ROLES.FIELDS.MASTER_SHOW_DATABASE}__link_row_has=${showId}&size=200`, RoleListSchema) ?? [];
  },

  async getScenesForShow(tenant: string, showId: number) {
    if (isPostgresEnabled()) {
      try {
        const pgScenes = await getScenesForShowClientPg(tenant, showId);
        if (pgScenes !== null) return pgScenes;
      } catch (error) {
        console.error("[Postgres] BaserowClient.getScenesForShow failed, falling back:", error);
      }
    }

    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.SCENES}/?filter__${DB.SCENES.FIELDS.PRODUCTION}__link_row_has=${showId}&size=200`, SceneListSchema) ?? [];
  },

  async getEventsForShow(tenant: string, showId: number) {
    if (isPostgresEnabled()) {
      try {
        const pgEvents = await getProductionEventsPg(tenant, showId);
        if (pgEvents !== null) return pgEvents;
      } catch (error) {
        console.error("[Postgres] BaserowClient.getEventsForShow failed, falling back:", error);
      }
    }

    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.EVENTS}/?filter__${DB.EVENTS.FIELDS.PRODUCTION}__link_row_has=${showId}&size=200`, EventListSchema) ?? [];
  },

  async getConflictsForShow(tenant: string, showId: number) {
    if (isPostgresEnabled()) {
      try {
        const pgConflicts = await getProductionConflictsPg(tenant, showId);
        if (pgConflicts !== null) return pgConflicts;
      } catch (error) {
        console.error("[Postgres] BaserowClient.getConflictsForShow failed, falling back:", error);
      }
    }

    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.CONFLICTS}/?filter__${DB.CONFLICTS.FIELDS.PRODUCTION}__link_row_has=${showId}&size=200`, ConflictListSchema) ?? [];
  },

  async getAssignmentsForShow(tenant: string, showId: number) {
    if (isPostgresEnabled()) {
      try {
        const pgAssign = await getAssignmentsForShowClientPg(tenant, showId);
        if (pgAssign !== null) return pgAssign;
      } catch (error) {
        console.error("[Postgres] BaserowClient.getAssignmentsForShow failed, falling back:", error);
      }
    }

    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.ASSIGNMENTS}/?filter__${DB.ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has=${showId}&size=200`, AssignmentListSchema) ?? [];
  },

  async getAllSeasons(tenant: string) {
    if (isPostgresEnabled()) {
      try {
        const pgSeasons = await getAllSeasonsClientPg(tenant);
        if (pgSeasons !== null) return pgSeasons;
      } catch (error) {
        console.error("[Postgres] BaserowClient.getAllSeasons failed, falling back:", error);
      }
    }

    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.SEASONS}/?size=200`, GenericListSchema) ?? [];
  },

  async getAllProductions(tenant: string) {
    if (isPostgresEnabled()) {
      try {
        const pgProds = await getAllProductionsClientPg(tenant);
        if (pgProds !== null) return pgProds;
      } catch (error) {
        console.error("[Postgres] BaserowClient.getAllProductions failed, falling back:", error);
      }
    }

    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.PRODUCTIONS}/?size=200`, GenericListSchema) ?? [];
  },

  async getAllVenues(tenant: string) {
    if (isPostgresEnabled()) {
      try {
        const pgVenues = await getAllVenuesClientPg(tenant);
        if (pgVenues !== null) return pgVenues;
      } catch (error) {
        console.error("[Postgres] BaserowClient.getAllVenues failed, falling back:", error);
      }
    }

    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.VENUES}/?size=200`, GenericListSchema) ?? [];
  },

  async getPerformances(tenant: string) {
    if (isPostgresEnabled()) {
      try {
        const pgPerfs = await getPerformancesClientPg(tenant);
        if (pgPerfs !== null) return pgPerfs;
      } catch (error) {
        console.error("[Postgres] BaserowClient.getPerformances failed, falling back:", error);
      }
    }

    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.PERFORMANCES}/?size=200`, GenericListSchema) ?? [];
  },

  async getTeacherApplicants(tenant: string) {
    if (isPostgresEnabled()) {
      try {
        const pgApplicants = await getTeacherApplicantsClientPg(tenant);
        if (pgApplicants !== null) return pgApplicants;
      } catch (error) {
        console.error("[Postgres] BaserowClient.getTeacherApplicants failed, falling back:", error);
      }
    }

    const t = await getTenantTableConfig(tenant);
    const F = DB.PEOPLE.FIELDS;
    const params = new URLSearchParams();
    params.append("size", "200");
    params.append("filter_type", "OR");
    params.append(`filter__${F.STATUS}__multiple_select_has`, "Faculty Applicant");
    params.append(`filter__${F.STATUS}__multiple_select_has`, "Faculty Interviewing");
    params.append(`filter__${F.STATUS}__multiple_select_has`, "Active Faculty");
    const result = await fetchAndValidate(`/database/rows/table/${t.PEOPLE}/?${params.toString()}`, z.any());
    if (!result) return [];
    return result.map((row: any) => ({
      id: row.id,
      name: row[F.FULL_NAME] || row[F.FIRST_NAME] || "Unknown",
      email: row[F.CYT_ACCOUNT_PERSONAL_EMAIL] || "",
      status: row[F.STATUS]?.map((s:any) => s.value) || [],
      headshot: row[F.HEADSHOT]?.[0]?.url || null,
      notes: row[F.ORIGINAL_BIO] || "",
    }));
  },

  async getAllClasses(tenant: string) {
    if (isPostgresEnabled()) {
      try {
        const pgClasses = await getClassesPg(tenant);
        if (pgClasses !== null) return pgClasses;
      } catch (error) {
        console.error("[Postgres] BaserowClient.getAllClasses failed, falling back:", error);
      }
    }

    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.CLASSES}/?size=200`, ClassListSchema) ?? [];
  },

  async getProposals(tenant: string) {
    if (isPostgresEnabled()) {
      try {
        const pgProposals = await getProposalsClientPg(tenant);
        if (pgProposals !== null) return pgProposals;
      } catch (error) {
        console.error("[Postgres] BaserowClient.getProposals failed, falling back:", error);
      }
    }

    const t = await getTenantTableConfig(tenant);
    const F = DB.CLASSES.FIELDS;
    const endpoint = `/database/rows/table/${t.CLASSES}/?filter__${F.STATUS}__equal=Proposed&size=200`;
    return await fetchAndValidate(endpoint, ClassListSchema) ?? [];
  },

  async getSlotsForShow(tenant: string, showId: number) {
    if (isPostgresEnabled()) {
      try {
        const pgSlots = await getSlotsForShowClientPg(tenant, showId);
        if (pgSlots !== null) return pgSlots;
      } catch (error) {
        console.error("[Postgres] BaserowClient.getSlotsForShow failed, falling back:", error);
      }
    }

    const t = await getTenantTableConfig(tenant);
    return await fetchAndValidate(`/database/rows/table/${t.SCHEDULE_SLOTS}/?size=200`, SlotListSchema) ?? [];
  }
};
