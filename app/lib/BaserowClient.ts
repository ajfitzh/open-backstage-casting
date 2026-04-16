import { z } from 'zod';
import { UserProfileListSchema } from './schemas/person';
import { SceneListSchema, RoleListSchema, RosterListSchema, AssignmentListSchema } from './schemas/casting';
import { EventListSchema, SlotListSchema, ConflictListSchema } from './schemas/schedule';
import { ClassListSchema } from './schemas/education';
import { CommitteeListSchema } from './schemas/casting'; // Add this to the top imports!

const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");
const API_TOKEN = process.env.BASEROW_API_TOKEN || process.env.NEXT_PUBLIC_BASEROW_TOKEN;
const HEADERS = {
  "Authorization": `Token ${API_TOKEN}`,
  "Content-Type": "application/json",
};

async function fetchAndValidate<T extends z.ZodTypeAny>(
  endpoint: string, schema: T, options: RequestInit = {}
): Promise<z.infer<T> | null> {
  try {
    const finalUrl = `${BASE_URL}/api${endpoint}`;
    const res = await fetch(finalUrl, { ...options, headers: { ...HEADERS, ...options.headers }, cache: "no-store" });
    if (!res.ok) {
      console.error(`[BaserowClient] API Error ${res.status}: ${res.statusText} at ${finalUrl}`);
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

// --- USER FUNCTIONS ---

async function getTeacherApplicants() {
  const endpoint = `/database/rows/table/599/?user_field_names=true&size=200`;
  const results = await fetchAndValidate(endpoint, UserProfileListSchema);
  
  if (!results) return [];

  const hiringTags = ["Faculty Applicant", "Faculty Interviewing", "Active Faculty"];
  
  return results.filter(user => user.tags?.some(tag => hiringTags.includes(tag))).map(u => ({
    id: Number(u.id),
    name: u.name,
    email: u.email,
    status: u.tags || [], // The Kanban board expects 'status' to be the array of tags
    headshot: u.image
  }));
}

async function findUserByEmail(email: string) {
    const params = new URLSearchParams({
        filter_type: "OR", size: "1",
        'filter__field_6132__equal': email, 
        'filter__field_6131__equal': email, 
    });
    const result = await fetchAndValidate(`/database/rows/table/599/?user_field_names=true&${params.toString()}`, UserProfileListSchema);
    return result?.[0] ?? null;
}

// --- CASTING FUNCTIONS ---


async function getCommitteePrefsForShow(showId: number) {
  // Table 620 is COMMITTEE_PREFS. Field 5952 links to Production.
  const endpoint = `/database/rows/table/620/?user_field_names=true&filter__field_5952__link_row_has=${showId}&size=200`;
  const result = await fetchAndValidate(endpoint, CommitteeListSchema);
  return result ?? [];
}
async function getRolesForShow(showId: number) {
  return await fetchAndValidate(`/database/rows/table/605/?user_field_names=true&filter__field_5794__link_row_has=${showId}&size=200`, RoleListSchema) ?? [];
}
async function getScenesForShow(showId: number) {
  return await fetchAndValidate(`/database/rows/table/627/?user_field_names=true&filter__field_6023__link_row_has=${showId}&size=200`, SceneListSchema) ?? [];
}
async function getRosterForShow(showId: number) {
  return await fetchAndValidate(`/database/rows/table/630/?user_field_names=true&filter__field_6053__link_row_has=${showId}&size=200`, RosterListSchema) ?? [];
}
async function getAssignmentsForShow(showId: number) {
  return await fetchAndValidate(`/database/rows/table/603/?user_field_names=true&filter__field_5787__link_row_has=${showId}&size=200`, AssignmentListSchema) ?? [];
}

// --- SCHEDULING FUNCTIONS ---
async function getEventsForShow(showId: number) {
  // Table 625, Prod Field 6007
  return await fetchAndValidate(`/database/rows/table/625/?user_field_names=true&filter__field_6007__link_row_has=${showId}&size=200`, EventListSchema) ?? [];
}
async function getSlotsForShow(showId: number) {
  // Changed size=500 to size=200!
  return await fetchAndValidate(`/database/rows/table/640/?user_field_names=true&size=200`, SlotListSchema) ?? [];
}

async function getConflictsForShow(showId: number) {
  // Table 623, Prod Field 5989
  return await fetchAndValidate(`/database/rows/table/623/?user_field_names=true&filter__field_5989__link_row_has=${showId}&size=200`, ConflictListSchema) ?? [];
}

async function getProduction(showId: number) {
  // Table 600 is Productions
  const RawProdSchema = z.object({ id: z.number(), 'Title': z.any() }).passthrough();
  const res = await fetchAndValidate(`/database/rows/table/600/${showId}/?user_field_names=true`, RawProdSchema);
  return res ? { id: res.id, title: typeof res['Title'] === 'string' ? res['Title'] : "Unknown Show" } : null;
}


// --- EDUCATION FUNCTIONS ---
async function getAllClasses() {
  // Table 633 is CLASSES
  const result = await fetchAndValidate(`/database/rows/table/633/?user_field_names=true&size=200`, ClassListSchema);
  return result ?? [];
}
async function getProposals() {
  // Table 633 is CLASSES. Field 6241 is Status (Single Select).
  // We use __contains because it's a select field, not a raw string.
  const endpoint = `/database/rows/table/633/?user_field_names=true&filter__field_6241__contains=Seeking+Instructor&size=50`;
  const result = await fetchAndValidate(endpoint, ClassListSchema);
  return result ?? [];
}

// --- ANALYTICS & REPORTS FUNCTIONS ---
// A generic schema that guarantees an array of objects to prevent .map() crashes
const GenericListSchema = z.array(z.object({ id: z.number() }).passthrough());

async function getAllProductions() {
  return await fetchAndValidate(`/database/rows/table/600/?user_field_names=true&size=200`, GenericListSchema) ?? [];
}
async function getAllVenues() {
  return await fetchAndValidate(`/database/rows/table/635/?user_field_names=true&size=200`, GenericListSchema) ?? [];
}
async function getAllSeasons() {
  return await fetchAndValidate(`/database/rows/table/632/?user_field_names=true&size=200`, GenericListSchema) ?? [];
}
async function getPerformances() {
  return await fetchAndValidate(`/database/rows/table/637/?user_field_names=true&size=200`, GenericListSchema) ?? [];
}



export const BaserowClient = {
  getProposals,
  getProduction,
  getAllClasses,
  findUserByEmail,
  getRolesForShow,
  getScenesForShow,
  getRosterForShow,
  getAssignmentsForShow,
  getEventsForShow,
  getSlotsForShow,
  getConflictsForShow,
  getTeacherApplicants,
  getCommitteePrefsForShow,
    getAllProductions,
  getAllVenues,
  getAllSeasons,
  getPerformances,
};
