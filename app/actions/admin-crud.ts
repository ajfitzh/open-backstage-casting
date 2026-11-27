"use server";

import { revalidatePath } from "next/cache";
import { invalidatePeopleCache } from "@/app/lib/baserow";
import { requireAdminAccess, requirePermission, requireStaffAccess } from "@/app/lib/auth-guard";
import { ASSIGNABLE_GLOBAL_ROLES } from "@/app/lib/permissions";
import { sanitizeRolesList } from "@/app/lib/admin-crud-helpers";
import {
  addCommitteeVolunteerLinkedPg,
  addWalkInAuditionPg,
  createClassAdminPg,
  createConflictPg,
  createEventPg,
  createPersonAdminPg,
  createScenePg,
  createStaffPositionPg,
  deleteClassAdminPg,
  deleteConflictPg,
  deleteEventPg,
  deletePersonAdminPg,
  deleteScenePg,
  dropCastMemberPg,
  enrollStudentInClassPg,
  saveClassAttendancePg,
  setSeasonSlotAssignmentPg,
  unenrollStudentFromClassPg,
  updateAuditionAdminPg,
  updateClassAdminPg,
  updatePersonAdminPg,
  updateProductionDetailsPg,
  updateScenePg,
  updateShowTeamMemberPg,
} from "@/app/lib/db/admin-crud-repo";

const ALLOWED_ROLE_SET = new Set([
  ...ASSIGNABLE_GLOBAL_ROLES,
  "Student",
  "Teacher",
  "Alumni",
  "Parent",
]);

// ============================================================================
// 1. PEOPLE DIRECTORY CRUD
// ============================================================================

export async function createPersonAdmin(
  tenant: string,
  input: {
    fullName: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    roles?: string[];
    address?: string;
    city?: string;
    medicalNotes?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  }
) {
  const guard = await requireAdminAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const roles = input.roles ? sanitizeRolesList(input.roles, ALLOWED_ROLE_SET) : [];
  const res = await createPersonAdminPg(tenant, { ...input, roles });
  if (res.success) {
    invalidatePeopleCache(tenant);
    revalidatePath(`/${tenant}/settings`);
  }
  return res;
}

export async function updatePersonAdmin(
  tenant: string,
  personId: number,
  input: {
    fullName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    roles?: string[];
    address?: string;
    city?: string;
    medicalNotes?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  }
) {
  const guard = await requireAdminAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const sanitized = {
    ...input,
    roles: input.roles ? sanitizeRolesList(input.roles, ALLOWED_ROLE_SET) : undefined,
  };
  const res = await updatePersonAdminPg(tenant, personId, sanitized);
  if (res.success) {
    invalidatePeopleCache(tenant);
    revalidatePath(`/${tenant}/settings`);
  }
  return res;
}

export async function deletePersonAdmin(tenant: string, personId: number) {
  const guard = await requireAdminAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await deletePersonAdminPg(tenant, personId);
  if (res.success) {
    invalidatePeopleCache(tenant);
    revalidatePath(`/${tenant}/settings`);
  }
  return res;
}

// ============================================================================
// 2. ARTISTIC TEAM, STAFF POSITIONS & SEASON STAFFING
// ============================================================================

export async function createStaffPosition(
  tenant: string,
  roleName: string,
  department?: string
) {
  const guard = await requireAdminAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await createStaffPositionPg(tenant, roleName, department);
  if (res.success) {
    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}/season`);
  }
  return res;
}

export async function updateShowTeamMember(
  tenant: string,
  productionId: number,
  assignmentId: number,
  input: { personId?: number; positionId?: number }
) {
  const guard = await requireAdminAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await updateShowTeamMemberPg(tenant, assignmentId, input);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/team`);
    revalidatePath(`/${tenant}/settings`);
  }
  return res;
}

export async function setSeasonSlotAssignment(
  tenant: string,
  productionId: number,
  roleName: string,
  personId: number | null
) {
  const guard = await requireAdminAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await setSeasonSlotAssignmentPg(tenant, productionId, roleName, personId);
  if (res.success) {
    revalidatePath(`/${tenant}/season`);
    revalidatePath(`/${tenant}/production/${productionId}/team`);
  }
  return res;
}

// ============================================================================
// 3. ROSTER, WALK-INS, COMPLIANCE OVERRIDES & CAST SWAPS
// ============================================================================

export async function addWalkInAudition(
  tenant: string,
  productionId: number,
  input: {
    existingPersonId?: number;
    fullName?: string;
    email?: string;
    phone?: string;
    slotId?: number | null;
    status?: string;
    paidFees?: boolean;
    signedAgreement?: boolean;
    auditionNumber?: string;
    vocalRange?: string;
    preferredRoles?: string;
  }
) {
  const guard = await requirePermission(tenant, "edit_compliance", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await addWalkInAuditionPg(tenant, productionId, input);
  if (res.success) {
    invalidatePeopleCache(tenant);
    revalidatePath(`/${tenant}/production/${productionId}/roster`);
    revalidatePath(`/${tenant}/production/${productionId}/casting`);
    revalidatePath(`/${tenant}/production/${productionId}/auditions`);
  }
  return res;
}

export async function updateAuditionAdmin(
  tenant: string,
  productionId: number,
  auditionId: number,
  input: {
    status?: string;
    paidFees?: boolean;
    productionFeeStatus?: string;
    signedAgreement?: boolean;
    measurementsTaken?: boolean;
    auditionNumber?: string;
    slotId?: number | null;
    vocalRange?: string;
    hairColor?: string;
    preferredRoles?: string;
    otherTalents?: string;
    adminNotes?: string;
  }
) {
  const guard = await requirePermission(tenant, "edit_compliance", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await updateAuditionAdminPg(tenant, auditionId, input);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/roster`);
    revalidatePath(`/${tenant}/production/${productionId}/casting`);
    revalidatePath(`/${tenant}/reports`);
  }
  return res;
}

export async function dropOrSwapCastMember(
  tenant: string,
  productionId: number,
  personId: number,
  replacementPersonId?: number | null
) {
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await dropCastMemberPg(tenant, productionId, personId, replacementPersonId);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/roster`);
    revalidatePath(`/${tenant}/production/${productionId}/casting`);
    revalidatePath(`/${tenant}/production/${productionId}/cast`);
  }
  return res;
}

// ============================================================================
// 4. COMMITTEE VOLUNTEER (PRODUCTION-LINKED)
// ============================================================================

export async function addCommitteeVolunteerLinked(
  tenant: string,
  productionId: number,
  input: {
    existingPersonId?: number;
    name?: string;
    email?: string;
    phone?: string;
    assignedPreShow?: string | null;
    assignedShowWeek?: string | null;
    isChair?: boolean;
  }
) {
  const guard = await requirePermission(tenant, "manage_committees", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await addCommitteeVolunteerLinkedPg(tenant, productionId, input);
  if (res.success) {
    invalidatePeopleCache(tenant);
    revalidatePath(`/${tenant}/production/${productionId}/committees`);
  }
  return res;
}

// ============================================================================
// 5. PRODUCTION DETAILS, REHEARSAL EVENTS, SCENES & CONFLICTS CRUD
// ============================================================================

export async function updateProductionDetails(
  tenant: string,
  productionId: number,
  input: {
    title?: string;
    status?: string;
    location?: string;
    productionFee?: number;
    ticketPriceStandard?: number;
    ticketPriceAtDoor?: number;
    seasonId?: number | null;
    firstRehearsalDate?: string | null;
    openingNight?: string | null;
    closingNight?: string | null;
  }
) {
  const guard = await requireAdminAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await updateProductionDetailsPg(tenant, productionId, input);
  if (res.success) {
    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}/production/${productionId}/roster`);
    revalidatePath(`/${tenant}/reports`);
    revalidatePath(`/${tenant}/analytics`);
  }
  return res;
}

export async function createShowEvent(
  tenant: string,
  productionId: number,
  input: {
    eventDate: string;
    startTime?: string;
    endTime?: string;
    eventType: string;
    isRequired?: boolean;
    notes?: string;
  }
) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await createEventPg(tenant, productionId, input);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/schedule`);
    revalidatePath(`/${tenant}/production/${productionId}/conflicts`);
  }
  return res;
}

export async function deleteShowEvent(
  tenant: string,
  productionId: number,
  eventId: number
) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await deleteEventPg(tenant, eventId);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/schedule`);
    revalidatePath(`/${tenant}/production/${productionId}/conflicts`);
  }
  return res;
}

export async function createShowScene(
  tenant: string,
  productionId: number,
  input: {
    sceneName: string;
    act?: string;
    sceneType?: string;
    sortOrder?: number;
    pages?: string;
  }
) {
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await createScenePg(tenant, productionId, input);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/analysis`);
    revalidatePath(`/${tenant}/production/${productionId}/casting`);
    revalidatePath(`/${tenant}/production/${productionId}/schedule`);
  }
  return res;
}

export async function updateShowScene(
  tenant: string,
  productionId: number,
  sceneId: number,
  input: { sceneName?: string; act?: string; sceneType?: string; sortOrder?: number }
) {
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await updateScenePg(tenant, sceneId, input);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/analysis`);
    revalidatePath(`/${tenant}/production/${productionId}/casting`);
  }
  return res;
}

export async function deleteShowScene(
  tenant: string,
  productionId: number,
  sceneId: number
) {
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await deleteScenePg(tenant, sceneId);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/analysis`);
    revalidatePath(`/${tenant}/production/${productionId}/casting`);
  }
  return res;
}

export async function createShowConflict(
  tenant: string,
  productionId: number,
  input: {
    personId: number;
    eventId?: number | null;
    conflictType: string;
    notes?: string;
  }
) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await createConflictPg(tenant, productionId, input);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/conflicts`);
    revalidatePath(`/${tenant}/production/${productionId}/schedule`);
  }
  return res;
}

export async function deleteShowConflict(
  tenant: string,
  productionId: number,
  conflictId: number
) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await deleteConflictPg(tenant, conflictId);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/conflicts`);
    revalidatePath(`/${tenant}/production/${productionId}/schedule`);
  }
  return res;
}

// ============================================================================
// 6. ACADEMY CLASSES, ENROLLMENTS & ATTENDANCE
// ============================================================================

export async function createAcademyClass(
  tenant: string,
  input: {
    className: string;
    sessionId?: number | null;
    sessionName?: string;
    teacherId?: number | null;
    spaceId?: number | null;
    location?: string;
    day?: string;
    timeSlot?: string;
    minAge?: number | null;
    maxAge?: number | null;
    type?: string;
    status?: string;
  }
) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await createClassAdminPg(tenant, input);
  if (res.success) {
    revalidatePath(`/${tenant}/education`);
    revalidatePath(`/${tenant}/education/planning`);
  }
  return res;
}

export async function updateAcademyClass(
  tenant: string,
  classId: number,
  input: {
    className?: string;
    teacherId?: number | null;
    spaceId?: number | null;
    location?: string;
    day?: string;
    timeSlot?: string;
    minAge?: number | null;
    maxAge?: number | null;
    type?: string;
    status?: string;
  }
) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await updateClassAdminPg(tenant, classId, input);
  if (res.success) {
    revalidatePath(`/${tenant}/education`);
    revalidatePath(`/${tenant}/education/planning`);
  }
  return res;
}

export async function deleteAcademyClass(tenant: string, classId: number) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await deleteClassAdminPg(tenant, classId);
  if (res.success) {
    revalidatePath(`/${tenant}/education`);
    revalidatePath(`/${tenant}/education/planning`);
  }
  return res;
}

export async function enrollStudentInClass(
  tenant: string,
  classId: number,
  studentId: number
) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await enrollStudentInClassPg(tenant, classId, studentId);
  if (res.success) {
    revalidatePath(`/${tenant}/education`);
    revalidatePath(`/${tenant}/education/planning`);
  }
  return res;
}

export async function unenrollStudentFromClass(
  tenant: string,
  classId: number,
  studentId: number
) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const res = await unenrollStudentFromClassPg(tenant, classId, studentId);
  if (res.success) {
    revalidatePath(`/${tenant}/education`);
    revalidatePath(`/${tenant}/education/planning`);
  }
  return res;
}

export async function saveClassAttendance(
  tenant: string,
  classId: number,
  dateIso: string,
  statuses: Record<number, string>
) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  return saveClassAttendancePg(tenant, classId, dateIso, statuses);
}
