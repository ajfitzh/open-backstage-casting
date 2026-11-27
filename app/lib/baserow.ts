// app/lib/baserow.ts
// Legacy-named data access facade backed strictly by PostgreSQL (Neon + Drizzle).
// Prefer importing directly from `@/app/lib/data-client` or `@/app/lib/db/*` in new code.

import { getTenantTableConfig } from "@/app/lib/tenant-config";
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

// ==============================================================================
// 🗑️ GENERIC DELETE
// ==============================================================================

export async function deleteRow(
  tenant: string,
  tableKey: keyof ReturnType<typeof getTenantTableConfig> | string,
  rowId: number | string
) {
  return await deleteRowPg(tenant, String(tableKey), Number(rowId));
}

// ==============================================================================
// 🎓 EDUCATION & VENUES
// ==============================================================================

export async function getClasses(tenant: string) {
  return (await getClassesPg(tenant)) ?? [];
}

export async function getClassById(tenant: string, classId: string) {
  return (await getClassByIdPg(tenant, Number(classId))) ?? null;
}

export async function getClassRoster(tenant: string, classId: string) {
  if (!classId) return [];
  return (await getClassRosterPg(tenant, Number(classId))) ?? [];
}

export async function getVenues(tenant: string) {
  return (await getVenuesPg(tenant)) ?? [];
}

export async function getVenueLogistics(tenant: string) {
  return (await getVenueLogisticsPg(tenant)) ?? [];
}

// ==============================================================================
// 🎭 PRODUCTIONS & SEASONS
// ==============================================================================

export async function getAuditionProduction(tenant: string) {
  return (await getAuditionProductionPg(tenant)) ?? null;
}

export async function getActiveProduction(tenant: string) {
  return (await getActiveProductionPg(tenant)) ?? null;
}

export async function getSeasons(tenant: string) {
  return (await getSeasonsPg(tenant)) ?? [];
}

export async function getShowById(tenant: string, id: string | number) {
  return (await getShowByIdPg(tenant, id)) ?? null;
}

export async function getAllShows(tenant: string) {
  return (await getAllShowsPg(tenant)) ?? [];
}

// ==============================================================================
// 👥 PEOPLE DIRECTORY (with short in-memory TTL cache)
// ==============================================================================

const PEOPLE_CACHE_TTL_MS = 30_000;
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

  const pgPeople = (await getPeoplePg(tenant)) ?? [];
  peopleCache.set(tenant, { expiresAt: Date.now() + PEOPLE_CACHE_TTL_MS, data: pgPeople });
  return pgPeople;
}

// ==============================================================================
// 🎬 CASTING, ROLES, SCENES & SCHEDULE
// ==============================================================================

export async function getRoles(tenant: string) {
  return (await getRolesPg(tenant)) ?? [];
}

export async function createCastAssignment(
  tenant: string,
  personId: number,
  roleId: number,
  productionId: number
) {
  return await createCastAssignmentPg(tenant, personId, roleId, productionId);
}

export async function updateCastAssignment(
  tenant: string,
  assignmentId: number,
  personId: number | null,
  _sceneIds?: number[]
) {
  return await updateCastAssignmentPg(tenant, assignmentId, personId);
}

export async function getScheduleSlots(tenant: string, productionId: number) {
  return (await getScheduleSlotsPg(tenant, productionId)) ?? [];
}

export async function getSceneAssignments(tenant: string, productionId: number) {
  return (await getSceneAssignmentsPg(tenant, productionId)) ?? [];
}

export async function saveScheduleBatch(tenant: string, productionId: number, newSlots: any[]) {
  const res = await saveScheduleBatchPg(tenant, productionId, newSlots);
  return Boolean(res?.success);
}

export async function clearSchedule(tenant: string, productionId: number) {
  await clearSchedulePg(tenant, productionId);
}

export async function getScenes(tenant: string, productionId?: number) {
  return (await getScenesPg(tenant, productionId)) ?? [];
}

export async function getProductionEvents(tenant: string, productionId: number) {
  return (await getProductionEventsPg(tenant, productionId)) ?? [];
}

export async function getProductionAssets(tenant: string, productionId?: number) {
  return (await getProductionAssetsPg(tenant, productionId)) ?? [];
}

export async function createProductionAsset(
  tenant: string,
  name: string,
  url: string,
  type: string,
  productionId: number
) {
  return await createProductionAssetPg(tenant, name, url, type, productionId);
}

export async function getCastDemographics(tenant: string) {
  return (await getCastDemographicsPg(tenant)) ?? [];
}

export async function getAssignments(tenant: string, productionId?: number) {
  return (await getAssignmentsPg(tenant, productionId)) ?? [];
}

export async function getCreativeTeam(tenant: string, productionId?: number) {
  return (await getCreativeTeamPg(tenant, productionId)) ?? [];
}

export async function getProductionConflicts(tenant: string, productionId: number) {
  return (await getProductionConflictsPg(tenant, productionId)) ?? [];
}

export async function getCommitteeData(tenant: string, productionId?: number) {
  return (await getCommitteeDataPg(tenant, productionId)) ?? [];
}

export async function getCommitteePreferences(tenant: string) {
  return (await getCommitteeDataPg(tenant)) ?? [];
}

export async function getConflicts(tenant: string, id?: any) {
  return (await getProductionConflictsPg(tenant, id ? Number(id) : undefined)) ?? [];
}

export async function getComplianceData(tenant: string, _productionId?: number) {
  return (await getComplianceDataPg(tenant)) ?? [];
}

// ==============================================================================
// 🎤 AUDITIONS (READ & WRITE)
// ==============================================================================

export async function getAuditionSlots(tenant: string, productionId: number) {
  return (await getAuditionSlotsPg(tenant, productionId)) ?? [];
}

export async function getAuditionees(tenant: string, productionId?: number) {
  return (await getAuditioneesPg(tenant, productionId)) ?? [];
}

export async function submitAudition(
  tenant: string,
  studentId: number,
  productionId: number,
  extraData: any
) {
  return await submitAuditionPg(tenant, studentId, productionId, extraData || {});
}

export async function updateAuditionSlot(tenant: string, rowId: number, data: any) {
  const { updateAuditionSlotLegacyPg } = await import("@/app/lib/db/audition-panel-repo");
  return await updateAuditionSlotLegacyPg(tenant, rowId, data);
}

// ==============================================================================
// 🔐 AUTHENTICATION & USER
// ==============================================================================

export async function findUserByEmail(tenant: string, email: string) {
  return (await findUserByEmailPg(tenant, email)) ?? null;
}

export async function verifyUserCredentials(tenant: string, email: string, _password: string) {
  const user = await findUserByEmail(tenant, email);
  if (!user) return null;
  return user;
}

export async function getUserProfile(tenant: string, email: string) {
  return (await getUserProfilePg(tenant, email)) ?? null;
}

export async function getUserProductionRole(
  tenant: string,
  userId: number,
  productionId: number
) {
  return (await getUserProductionRolePg(tenant, userId, productionId)) ?? null;
}

export async function getPerformanceAnalytics(tenant: string, productionId?: number) {
  const pgAnalytics = (await getPerformanceAnalyticsPg(tenant)) ?? [];
  return productionId
    ? pgAnalytics.filter((p) => p.productionId === productionId)
    : pgAnalytics;
}

export async function createGoogleUser(tenant: string, googleUser: any) {
  return (await createGoogleUserPg(tenant, googleUser)) ?? null;
}

export async function getExistingAuditions(tenant: string, email: string, productionId: number) {
  if (!email) return [];
  return (await getExistingAuditionsPg(tenant, email, productionId)) ?? [];
}

export async function getMasterShows(tenant: string) {
  return (await getMasterShowsPg(tenant)) ?? [];
}

export async function getStaffPositions(tenant: string) {
  return (await getStaffPositionsPg(tenant)) ?? [];
}

export { getTenantTableConfig };
