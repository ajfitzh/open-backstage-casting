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

/**
 * Legacy-named data client facade backed strictly by PostgreSQL (Neon + Drizzle).
 * Prefer importing `DataClient` from `@/app/lib/data-client` in new code.
 */
export const BaserowClient = {
  async findUserByEmail(tenant: string, email: string) {
    return (await findUserByEmailClientPg(tenant, email)) ?? null;
  },

  async getCommitteePrefsForShow(tenant: string, showId: number) {
    return (await getCommitteeDataPg(tenant, showId)) ?? [];
  },

  async getRosterForShow(tenant: string, showId: number) {
    return (await getRosterForShowClientPg(tenant, showId)) ?? [];
  },

  async getProduction(tenant: string, showId: number) {
    return (await getProductionClientPg(tenant, showId)) ?? null;
  },

  async getRolesForShow(tenant: string, showId: number) {
    return (await getRolesForShowClientPg(tenant, showId)) ?? [];
  },

  async getScenesForShow(tenant: string, showId: number) {
    return (await getScenesForShowClientPg(tenant, showId)) ?? [];
  },

  async getEventsForShow(tenant: string, showId: number) {
    return (await getProductionEventsPg(tenant, showId)) ?? [];
  },

  async getConflictsForShow(tenant: string, showId: number) {
    return (await getProductionConflictsPg(tenant, showId)) ?? [];
  },

  async getAssignmentsForShow(tenant: string, showId: number) {
    return (await getAssignmentsForShowClientPg(tenant, showId)) ?? [];
  },

  async getAllSeasons(tenant: string) {
    return (await getAllSeasonsClientPg(tenant)) ?? [];
  },

  async getAllProductions(tenant: string) {
    return (await getAllProductionsClientPg(tenant)) ?? [];
  },

  async getAllVenues(tenant: string) {
    return (await getAllVenuesClientPg(tenant)) ?? [];
  },

  async getPerformances(tenant: string) {
    return (await getPerformancesClientPg(tenant)) ?? [];
  },

  async getTeacherApplicants(tenant: string) {
    return (await getTeacherApplicantsClientPg(tenant)) ?? [];
  },

  async getAllClasses(tenant: string) {
    return (await getClassesPg(tenant)) ?? [];
  },

  async getProposals(tenant: string) {
    return (await getProposalsClientPg(tenant)) ?? [];
  },

  async getSlotsForShow(tenant: string, showId: number) {
    return (await getSlotsForShowClientPg(tenant, showId)) ?? [];
  },
};
