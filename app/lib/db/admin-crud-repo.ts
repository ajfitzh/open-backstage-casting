// app/lib/db/admin-crud-repo.ts
// Comprehensive Neon PostgreSQL repository for Admin Full-Ownership Self-Service CRUD.

import { and, asc, desc, eq, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getOrganizationBySlugPg } from "./core-repo";
import {
  computeNextAuditionNumber,
  normalizeAuditionStatus,
  normalizeFeeStatus,
  splitFullName,
  validateEmailOptional,
} from "@/app/lib/admin-crud-helpers";

function extId(row: { id: number; baserowId?: number | null }): number {
  return row.baserowId ?? row.id;
}

async function resolveOrgId(tenantSlug: string): Promise<number | null> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  return org?.id ?? null;
}

async function resolveProduction(orgId: number, externalId: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.productions)
    .where(
      and(
        eq(schema.productions.organizationId, orgId),
        or(eq(schema.productions.baserowId, externalId), eq(schema.productions.id, externalId))
      )
    )
    .limit(1);
  return row ?? null;
}

async function resolvePerson(orgId: number, externalId: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, orgId),
        or(eq(schema.people.baserowId, externalId), eq(schema.people.id, externalId))
      )
    )
    .limit(1);
  return row ?? null;
}

async function resolveStaffPosition(orgId: number, externalId: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.staffPositions)
    .where(
      and(
        eq(schema.staffPositions.organizationId, orgId),
        or(eq(schema.staffPositions.baserowId, externalId), eq(schema.staffPositions.id, externalId))
      )
    )
    .limit(1);
  return row ?? null;
}

// ============================================================================
// 1. PEOPLE DIRECTORY CRUD
// ============================================================================

export async function createPersonAdminPg(
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
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const { firstName, lastName, fullName } = splitFullName(input.fullName);
  if (!fullName) return { success: false, error: "Full name is required." };

  let email: string | null = null;
  try {
    email = validateEmailOptional(input.email);
  } catch (err: any) {
    return { success: false, error: err.message };
  }

  const db = getDb();
  const [created] = await db
    .insert(schema.people)
    .values({
      organizationId: orgId,
      firstName,
      lastName,
      fullName,
      email,
      phone: input.phone?.trim() || null,
      dateOfBirth: input.dateOfBirth?.trim() || null,
      gender: input.gender?.trim() || null,
      roles: input.roles && input.roles.length > 0 ? input.roles : [],
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      medicalNotes: input.medicalNotes?.trim() || null,
      emergencyContactName: input.emergencyContactName?.trim() || null,
      emergencyContactPhone: input.emergencyContactPhone?.trim() || null,
    })
    .returning();

  return {
    success: true,
    person: {
      id: extId(created),
      name: created.fullName,
      email: created.email || "",
      phone: created.phone || "",
      headshot: created.headshotUrl || null,
      roles: created.roles || [],
      dateOfBirth: created.dateOfBirth || "",
      medicalNotes: created.medicalNotes || "",
    },
  };
}

export async function updatePersonAdminPg(
  tenant: string,
  personExternalId: number,
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
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const existing = await resolvePerson(orgId, personExternalId);
  if (!existing) return { success: false, error: "Person not found." };

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof input.fullName === "string" && input.fullName.trim()) {
    const split = splitFullName(input.fullName);
    updates.firstName = split.firstName;
    updates.lastName = split.lastName;
    updates.fullName = split.fullName;
  }
  if (typeof input.email === "string") {
    try {
      updates.email = validateEmailOptional(input.email);
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
  if (typeof input.phone === "string") updates.phone = input.phone.trim() || null;
  if (typeof input.dateOfBirth === "string") updates.dateOfBirth = input.dateOfBirth.trim() || null;
  if (typeof input.gender === "string") updates.gender = input.gender.trim() || null;
  if (Array.isArray(input.roles)) updates.roles = input.roles;
  if (typeof input.address === "string") updates.address = input.address.trim() || null;
  if (typeof input.city === "string") updates.city = input.city.trim() || null;
  if (typeof input.medicalNotes === "string") updates.medicalNotes = input.medicalNotes.trim() || null;
  if (typeof input.emergencyContactName === "string") {
    updates.emergencyContactName = input.emergencyContactName.trim() || null;
  }
  if (typeof input.emergencyContactPhone === "string") {
    updates.emergencyContactPhone = input.emergencyContactPhone.trim() || null;
  }

  const db = getDb();
  const [updated] = await db
    .update(schema.people)
    .set(updates)
    .where(and(eq(schema.people.organizationId, orgId), eq(schema.people.id, existing.id)))
    .returning();

  return {
    success: true,
    person: {
      id: extId(updated),
      name: updated.fullName,
      email: updated.email || "",
      phone: updated.phone || "",
      headshot: updated.headshotUrl || null,
      roles: updated.roles || [],
    },
  };
}

export async function deletePersonAdminPg(tenant: string, personExternalId: number) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const existing = await resolvePerson(orgId, personExternalId);
  if (!existing) return { success: false, error: "Person not found." };

  const db = getDb();
  await db
    .delete(schema.people)
    .where(and(eq(schema.people.organizationId, orgId), eq(schema.people.id, existing.id)));

  return { success: true };
}

// ============================================================================
// 2. ARTISTIC / PRODUCTION TEAM & STAFF POSITIONS
// ============================================================================

export async function createStaffPositionPg(
  tenant: string,
  roleName: string,
  department?: string
) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const cleaned = roleName.trim();
  if (!cleaned) return { success: false, error: "Position name is required." };

  const db = getDb();
  const [created] = await db
    .insert(schema.staffPositions)
    .values({
      organizationId: orgId,
      roleName: cleaned,
      department: department?.trim() || "Creative",
    })
    .returning();

  return {
    success: true,
    position: {
      id: extId(created),
      name: created.roleName,
      department: created.department || "Creative",
    },
  };
}

export async function updateShowTeamMemberPg(
  tenant: string,
  assignmentExternalId: number,
  input: { personId?: number; positionId?: number }
) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.showTeam)
    .where(
      and(
        eq(schema.showTeam.organizationId, orgId),
        or(
          eq(schema.showTeam.baserowId, assignmentExternalId),
          eq(schema.showTeam.id, assignmentExternalId)
        )
      )
    )
    .limit(1);

  if (!existing) return { success: false, error: "Team assignment not found." };

  const updates: Record<string, unknown> = {};
  if (input.personId) {
    const person = await resolvePerson(orgId, input.personId);
    if (!person) return { success: false, error: "Person not found." };
    updates.personId = person.id;
  }
  if (input.positionId) {
    const pos = await resolveStaffPosition(orgId, input.positionId);
    if (!pos) return { success: false, error: "Staff position not found." };
    updates.positionId = pos.id;
  }

  if (Object.keys(updates).length > 0) {
    await db
      .update(schema.showTeam)
      .set(updates)
      .where(and(eq(schema.showTeam.organizationId, orgId), eq(schema.showTeam.id, existing.id)));
  }

  return { success: true };
}

export async function setSeasonSlotAssignmentPg(
  tenant: string,
  productionExternalId: number,
  roleName: string,
  personExternalId: number | null
) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const prod = await resolveProduction(orgId, productionExternalId);
  if (!prod) return { success: false, error: "Production not found." };

  const db = getDb();

  // Find or create matching staff_positions row by roleName
  const allPositions = await db
    .select()
    .from(schema.staffPositions)
    .where(eq(schema.staffPositions.organizationId, orgId));

  let pos = allPositions.find(
    (p) => p.roleName.trim().toLowerCase() === roleName.trim().toLowerCase()
  );

  if (!pos) {
    const [created] = await db
      .insert(schema.staffPositions)
      .values({
        organizationId: orgId,
        roleName: roleName.trim(),
        department: "Creative",
      })
      .returning();
    pos = created;
  }

  // Remove existing assignment for this production + position
  await db
    .delete(schema.showTeam)
    .where(
      and(
        eq(schema.showTeam.organizationId, orgId),
        eq(schema.showTeam.productionId, prod.id),
        eq(schema.showTeam.positionId, pos.id)
      )
    );

  if (personExternalId) {
    const person = await resolvePerson(orgId, personExternalId);
    if (!person) return { success: false, error: "Person not found." };
    await db.insert(schema.showTeam).values({
      organizationId: orgId,
      productionId: prod.id,
      personId: person.id,
      positionId: pos.id,
      status: "Active",
    });
  }

  return { success: true };
}

export async function getSeasonExistingTeamPg(tenant: string, productionExternalIds: number[]) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId || productionExternalIds.length === 0) return [];

  const db = getDb();
  const [prods, teamRows, peopleRows, posRows] = await Promise.all([
    db.select().from(schema.productions).where(eq(schema.productions.organizationId, orgId)),
    db.select().from(schema.showTeam).where(eq(schema.showTeam.organizationId, orgId)),
    db.select().from(schema.people).where(eq(schema.people.organizationId, orgId)),
    db.select().from(schema.staffPositions).where(eq(schema.staffPositions.organizationId, orgId)),
  ]);

  const prodMap = new Map(prods.map((p) => [p.id, extId(p)]));
  const personMap = new Map(peopleRows.map((p) => [p.id, { id: extId(p), name: p.fullName }]));
  const posMap = new Map(posRows.map((p) => [p.id, p.roleName]));

  const targetSet = new Set(productionExternalIds);
  const results: { productionId: number; roleName: string; personId: number; personName: string }[] = [];

  for (const row of teamRows) {
    if (!row.productionId || !row.personId || !row.positionId) continue;
    const prodExtId = prodMap.get(row.productionId);
    if (!prodExtId || !targetSet.has(prodExtId)) continue;
    const person = personMap.get(row.personId);
    const roleName = posMap.get(row.positionId);
    if (!person || !roleName) continue;
    results.push({
      productionId: prodExtId,
      roleName,
      personId: person.id,
      personName: person.name,
    });
  }

  return results;
}

// ============================================================================
// 3. ROSTER, WALK-INS, COMPLIANCE OVERRIDES & CAST SWAPS
// ============================================================================

export async function addWalkInAuditionPg(
  tenant: string,
  productionExternalId: number,
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
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const prod = await resolveProduction(orgId, productionExternalId);
  if (!prod) return { success: false, error: "Production not found." };

  const db = getDb();
  let personRow = input.existingPersonId
    ? await resolvePerson(orgId, input.existingPersonId)
    : null;

  if (!personRow) {
    if (!input.fullName?.trim()) {
      return { success: false, error: "Select an existing person or enter a student name." };
    }
    const split = splitFullName(input.fullName);
    let email: string | null = null;
    try {
      email = validateEmailOptional(input.email);
    } catch (err: any) {
      return { success: false, error: err.message };
    }

    const [createdPerson] = await db
      .insert(schema.people)
      .values({
        organizationId: orgId,
        firstName: split.firstName,
        lastName: split.lastName,
        fullName: split.fullName,
        email,
        phone: input.phone?.trim() || null,
        roles: ["Student"],
      })
      .returning();
    personRow = createdPerson;
  }

  // Resolve audition slot if provided
  let slotDbId: number | null = null;
  if (input.slotId) {
    const [slot] = await db
      .select()
      .from(schema.auditionSlots)
      .where(
        and(
          eq(schema.auditionSlots.organizationId, orgId),
          or(
            eq(schema.auditionSlots.baserowId, input.slotId),
            eq(schema.auditionSlots.id, input.slotId)
          )
        )
      )
      .limit(1);
    slotDbId = slot?.id ?? null;
  }

  // Compute audition number if not supplied
  let auditionNumber = (input.auditionNumber || "").trim();
  if (!auditionNumber) {
    const existingAuds = await db
      .select({ auditionNumber: schema.auditions.auditionNumber })
      .from(schema.auditions)
      .where(
        and(
          eq(schema.auditions.organizationId, orgId),
          eq(schema.auditions.productionId, prod.id)
        )
      );
    auditionNumber = computeNextAuditionNumber(existingAuds.map((a) => a.auditionNumber));
  }

  const normalizedStatus = normalizeAuditionStatus(input.status || "Pending");
  const paidFees = Boolean(input.paidFees);
  const signedAgreement = Boolean(input.signedAgreement);

  const [createdAudition] = await db
    .insert(schema.auditions)
    .values({
      organizationId: orgId,
      productionId: prod.id,
      performerId: personRow.id,
      slotId: slotDbId,
      auditionNumber,
      status: normalizedStatus,
      paidFees,
      productionFeeStatus: normalizeFeeStatus(paidFees),
      offBookAgreement: signedAgreement,
      parentHelpAgreement: signedAgreement,
      commitmentToCharacter: signedAgreement,
      signaturesText: signedAgreement ? "Admin Override" : null,
      vocalRange: input.vocalRange?.trim() || null,
      preferredRoles: input.preferredRoles?.trim() || null,
      auditionDate: new Date().toISOString().split("T")[0],
    })
    .returning();

  return {
    success: true,
    auditionId: extId(createdAudition),
    personId: extId(personRow),
    auditionNumber,
  };
}

export async function updateAuditionAdminPg(
  tenant: string,
  auditionExternalId: number,
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
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.auditions)
    .where(
      and(
        eq(schema.auditions.organizationId, orgId),
        or(
          eq(schema.auditions.baserowId, auditionExternalId),
          eq(schema.auditions.id, auditionExternalId)
        )
      )
    )
    .limit(1);

  if (!existing) return { success: false, error: "Audition record not found." };

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof input.status === "string") {
    updates.status = normalizeAuditionStatus(input.status);
  }
  if (typeof input.paidFees === "boolean") {
    updates.paidFees = input.paidFees;
    updates.productionFeeStatus = normalizeFeeStatus(input.paidFees, input.productionFeeStatus);
  } else if (typeof input.productionFeeStatus === "string") {
    updates.productionFeeStatus = input.productionFeeStatus;
  }
  if (typeof input.signedAgreement === "boolean") {
    updates.offBookAgreement = input.signedAgreement;
    updates.parentHelpAgreement = input.signedAgreement;
    updates.commitmentToCharacter = input.signedAgreement;
    updates.signaturesText = input.signedAgreement ? existing.signaturesText || "Admin Override" : null;
  }
  if (typeof input.measurementsTaken === "boolean") {
    updates.measurementsTaken = input.measurementsTaken;
  }
  if (typeof input.auditionNumber === "string") {
    updates.auditionNumber = input.auditionNumber.trim() || null;
  }
  if (input.slotId !== undefined) {
    if (input.slotId === null) {
      updates.slotId = null;
    } else {
      const [slot] = await db
        .select()
        .from(schema.auditionSlots)
        .where(
          and(
            eq(schema.auditionSlots.organizationId, orgId),
            or(
              eq(schema.auditionSlots.baserowId, input.slotId),
              eq(schema.auditionSlots.id, input.slotId)
            )
          )
        )
        .limit(1);
      updates.slotId = slot?.id ?? null;
    }
  }
  if (typeof input.vocalRange === "string") updates.vocalRange = input.vocalRange.trim() || null;
  if (typeof input.hairColor === "string") updates.hairColor = input.hairColor.trim() || null;
  if (typeof input.preferredRoles === "string") updates.preferredRoles = input.preferredRoles.trim() || null;
  if (typeof input.otherTalents === "string") updates.otherTalents = input.otherTalents.trim() || null;
  if (typeof input.adminNotes === "string") updates.adminNotes = input.adminNotes.trim() || null;

  await db
    .update(schema.auditions)
    .set(updates)
    .where(and(eq(schema.auditions.organizationId, orgId), eq(schema.auditions.id, existing.id)));

  return { success: true };
}

export async function dropCastMemberPg(
  tenant: string,
  productionExternalId: number,
  personExternalId: number,
  replacementPersonExternalId?: number | null
) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const prod = await resolveProduction(orgId, productionExternalId);
  if (!prod) return { success: false, error: "Production not found." };

  const person = await resolvePerson(orgId, personExternalId);
  if (!person) return { success: false, error: "Student not found." };

  const replacement = replacementPersonExternalId
    ? await resolvePerson(orgId, replacementPersonExternalId)
    : null;

  const db = getDb();

  // 1. Update audition status of dropped student to "Dropped"
  await db
    .update(schema.auditions)
    .set({ status: "Dropped", updatedAt: new Date() })
    .where(
      and(
        eq(schema.auditions.organizationId, orgId),
        eq(schema.auditions.productionId, prod.id),
        eq(schema.auditions.performerId, person.id)
      )
    );

  // 2. Reassign or unassign their role assignments
  const personAssignments = await db
    .select()
    .from(schema.assignments)
    .where(
      and(
        eq(schema.assignments.organizationId, orgId),
        eq(schema.assignments.productionId, prod.id),
        eq(schema.assignments.personId, person.id)
      )
    );

  for (const row of personAssignments) {
    await db
      .update(schema.assignments)
      .set({
        personId: replacement ? replacement.id : null,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.assignments.organizationId, orgId), eq(schema.assignments.id, row.id)));
  }

  // 3. If replacement provided, ensure their audition status is "Cast" (or create an audition row)
  if (replacement) {
    const [existingRepAud] = await db
      .select()
      .from(schema.auditions)
      .where(
        and(
          eq(schema.auditions.organizationId, orgId),
          eq(schema.auditions.productionId, prod.id),
          eq(schema.auditions.performerId, replacement.id)
        )
      )
      .limit(1);

    if (existingRepAud) {
      await db
        .update(schema.auditions)
        .set({ status: "Cast", updatedAt: new Date() })
        .where(eq(schema.auditions.id, existingRepAud.id));
    } else {
      await db.insert(schema.auditions).values({
        organizationId: orgId,
        productionId: prod.id,
        performerId: replacement.id,
        status: "Cast",
        auditionDate: new Date().toISOString().split("T")[0],
      });
    }
  }

  return { success: true, rolesAffected: personAssignments.length };
}

// ============================================================================
// 4. COMMITTEE VOLUNTEER LINKED TO PRODUCTION
// ============================================================================

export async function addCommitteeVolunteerLinkedPg(
  tenant: string,
  productionExternalId: number,
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
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const prod = await resolveProduction(orgId, productionExternalId);
  if (!prod) return { success: false, error: "Production not found." };

  const db = getDb();
  let parentRow = input.existingPersonId
    ? await resolvePerson(orgId, input.existingPersonId)
    : null;

  if (!parentRow) {
    const { firstName, lastName, fullName } = splitFullName(input.name || "");
    if (!fullName) return { success: false, error: "Volunteer name is required." };
    let email: string | null = null;
    try {
      email = validateEmailOptional(input.email);
    } catch (err: any) {
      return { success: false, error: err.message };
    }

    const [created] = await db
      .insert(schema.people)
      .values({
        organizationId: orgId,
        firstName,
        lastName,
        fullName,
        email,
        phone: input.phone?.trim() || null,
        roles: ["Parent/Guardian"],
      })
      .returning();
    parentRow = created;
  }

  const [pref] = await db
    .insert(schema.committeePrefs)
    .values({
      organizationId: orgId,
      productionId: prod.id,
      parentPersonId: parentRow.id,
      assignedPreShow: input.assignedPreShow || null,
      assignedShowWeek: input.assignedShowWeek || null,
      isChair: Boolean(input.isChair),
    })
    .returning();

  return {
    success: true,
    volunteer: {
      id: extId(pref),
      name: parentRow.fullName,
      email: parentRow.email || "",
      phone: parentRow.phone || "",
      studentName: "",
      preShow1: null,
      preShow2: null,
      preShow3: null,
      showWeek1: null,
      showWeek2: null,
      showWeek3: null,
      assignedPreShow: pref.assignedPreShow,
      assignedShowWeek: pref.assignedShowWeek,
      isChair: Boolean(pref.isChair),
    },
  };
}

// ============================================================================
// 5. PRODUCTION DETAILS, REHEARSAL EVENTS, SCENES & CONFLICTS CRUD
// ============================================================================

export async function updateProductionDetailsPg(
  tenant: string,
  productionExternalId: number,
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
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const prod = await resolveProduction(orgId, productionExternalId);
  if (!prod) return { success: false, error: "Production not found." };

  const db = getDb();
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof input.title === "string" && input.title.trim()) updates.title = input.title.trim();
  if (typeof input.status === "string" && input.status.trim()) updates.status = input.status.trim();
  if (typeof input.location === "string") updates.location = input.location.trim() || null;
  if (typeof input.productionFee === "number" && Number.isFinite(input.productionFee)) {
    updates.productionFee = input.productionFee;
  }
  if (typeof input.ticketPriceStandard === "number" && Number.isFinite(input.ticketPriceStandard)) {
    updates.ticketPriceStandard = input.ticketPriceStandard;
  }
  if (typeof input.ticketPriceAtDoor === "number" && Number.isFinite(input.ticketPriceAtDoor)) {
    updates.ticketPriceAtDoor = input.ticketPriceAtDoor;
  }
  if (input.firstRehearsalDate !== undefined) updates.firstRehearsalDate = input.firstRehearsalDate || null;
  if (input.openingNight !== undefined) updates.openingNight = input.openingNight || null;
  if (input.closingNight !== undefined) updates.closingNight = input.closingNight || null;

  if (input.seasonId !== undefined) {
    if (input.seasonId === null) {
      updates.seasonId = null;
    } else {
      const [s] = await db
        .select()
        .from(schema.seasons)
        .where(
          and(
            eq(schema.seasons.organizationId, orgId),
            or(eq(schema.seasons.baserowId, input.seasonId), eq(schema.seasons.id, input.seasonId))
          )
        )
        .limit(1);
      updates.seasonId = s?.id ?? null;
    }
  }

  const [updated] = await db
    .update(schema.productions)
    .set(updates)
    .where(and(eq(schema.productions.organizationId, orgId), eq(schema.productions.id, prod.id)))
    .returning();

  return {
    success: true,
    production: {
      id: extId(updated),
      title: updated.title,
      status: updated.status || "Active",
      location: updated.location || "",
      productionFee: updated.productionFee ?? 0,
    },
  };
}

export async function createEventPg(
  tenant: string,
  productionExternalId: number,
  input: {
    eventDate: string;
    startTime?: string;
    endTime?: string;
    eventType: string;
    isRequired?: boolean;
    notes?: string;
  }
) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const prod = await resolveProduction(orgId, productionExternalId);
  if (!prod) return { success: false, error: "Production not found." };

  if (!input.eventDate?.trim()) return { success: false, error: "Event date is required." };

  const db = getDb();
  const [created] = await db
    .insert(schema.events)
    .values({
      organizationId: orgId,
      productionId: prod.id,
      eventDate: input.eventDate.trim(),
      startTime: input.startTime?.trim() || "18:00",
      endTime: input.endTime?.trim() || "21:00",
      eventType: input.eventType.trim() || "Rehearsal",
      isRequired: Boolean(input.isRequired),
      notes: input.notes?.trim() || null,
    })
    .returning();

  return {
    success: true,
    event: {
      id: extId(created),
      date: created.eventDate || "",
      startTime: created.startTime || "",
      endTime: created.endTime || "",
      type: created.eventType || "Rehearsal",
      notes: created.notes || "",
    },
  };
}

export async function deleteEventPg(tenant: string, eventExternalId: number) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const db = getDb();
  await db
    .delete(schema.events)
    .where(
      and(
        eq(schema.events.organizationId, orgId),
        or(eq(schema.events.baserowId, eventExternalId), eq(schema.events.id, eventExternalId))
      )
    );

  return { success: true };
}

export async function createScenePg(
  tenant: string,
  productionExternalId: number,
  input: {
    sceneName: string;
    act?: string;
    sceneType?: string;
    sortOrder?: number;
    pages?: string;
  }
) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const prod = await resolveProduction(orgId, productionExternalId);
  if (!prod) return { success: false, error: "Production not found." };

  if (!input.sceneName?.trim()) return { success: false, error: "Scene name is required." };

  const db = getDb();
  const existing = await db
    .select({ sortOrder: schema.scenes.sortOrder })
    .from(schema.scenes)
    .where(and(eq(schema.scenes.organizationId, orgId), eq(schema.scenes.productionId, prod.id)));

  const maxOrder = existing.reduce((m, r) => Math.max(m, r.sortOrder ?? 0), 0);

  const [created] = await db
    .insert(schema.scenes)
    .values({
      organizationId: orgId,
      productionId: prod.id,
      sceneName: input.sceneName.trim(),
      act: input.act?.trim() || "Act 1",
      sceneType: input.sceneType?.trim() || "Scene",
      sortOrder: typeof input.sortOrder === "number" ? input.sortOrder : maxOrder + 1,
      pages: input.pages?.trim() || null,
      musicLoad: 1,
      danceLoad: 1,
      blockingLoad: 1,
    })
    .returning();

  return {
    success: true,
    scene: {
      id: extId(created),
      name: created.sceneName,
      act: created.act || "Act 1",
      type: created.sceneType || "Scene",
      order: created.sortOrder ?? 0,
      load: {
        music: created.musicLoad ?? 1,
        dance: created.danceLoad ?? 1,
        block: created.blockingLoad ?? 1,
      },
    },
  };
}

export async function updateScenePg(
  tenant: string,
  sceneExternalId: number,
  input: { sceneName?: string; act?: string; sceneType?: string; sortOrder?: number }
) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.scenes)
    .where(
      and(
        eq(schema.scenes.organizationId, orgId),
        or(eq(schema.scenes.baserowId, sceneExternalId), eq(schema.scenes.id, sceneExternalId))
      )
    )
    .limit(1);

  if (!existing) return { success: false, error: "Scene not found." };

  const updates: Record<string, unknown> = {};
  if (typeof input.sceneName === "string" && input.sceneName.trim()) {
    updates.sceneName = input.sceneName.trim();
  }
  if (typeof input.act === "string") updates.act = input.act.trim();
  if (typeof input.sceneType === "string") updates.sceneType = input.sceneType.trim();
  if (typeof input.sortOrder === "number") updates.sortOrder = input.sortOrder;

  if (Object.keys(updates).length > 0) {
    await db
      .update(schema.scenes)
      .set(updates)
      .where(and(eq(schema.scenes.organizationId, orgId), eq(schema.scenes.id, existing.id)));
  }

  return { success: true };
}

export async function deleteScenePg(tenant: string, sceneExternalId: number) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const db = getDb();
  await db
    .delete(schema.scenes)
    .where(
      and(
        eq(schema.scenes.organizationId, orgId),
        or(eq(schema.scenes.baserowId, sceneExternalId), eq(schema.scenes.id, sceneExternalId))
      )
    );

  return { success: true };
}

export async function createConflictPg(
  tenant: string,
  productionExternalId: number,
  input: {
    personId: number;
    eventId?: number | null;
    conflictType: string;
    notes?: string;
  }
) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const prod = await resolveProduction(orgId, productionExternalId);
  if (!prod) return { success: false, error: "Production not found." };

  const person = await resolvePerson(orgId, input.personId);
  if (!person) return { success: false, error: "Actor not found." };

  const db = getDb();
  let eventDbId: number | null = null;
  let eventDate = "";
  if (input.eventId) {
    const [ev] = await db
      .select()
      .from(schema.events)
      .where(
        and(
          eq(schema.events.organizationId, orgId),
          or(eq(schema.events.baserowId, input.eventId), eq(schema.events.id, input.eventId))
        )
      )
      .limit(1);
    if (ev) {
      eventDbId = ev.id;
      eventDate = ev.eventDate || "";
    }
  }

  const [created] = await db
    .insert(schema.conflicts)
    .values({
      organizationId: orgId,
      productionId: prod.id,
      personId: person.id,
      eventId: eventDbId,
      conflictType: input.conflictType || "Absent",
      notes: input.notes?.trim() || null,
      submittedVia: "Admin",
    })
    .returning();

  return {
    success: true,
    conflict: {
      id: extId(created),
      personId: extId(person),
      personName: person.fullName,
      eventId: input.eventId || null,
      date: eventDate,
      type: created.conflictType || "Absent",
      notes: created.notes || "",
    },
  };
}

export async function deleteConflictPg(tenant: string, conflictExternalId: number) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const db = getDb();
  await db
    .delete(schema.conflicts)
    .where(
      and(
        eq(schema.conflicts.organizationId, orgId),
        or(
          eq(schema.conflicts.baserowId, conflictExternalId),
          eq(schema.conflicts.id, conflictExternalId)
        )
      )
    );

  return { success: true };
}

// ============================================================================
// 6. ACADEMY CLASSES, ENROLLMENTS & ATTENDANCE
// ============================================================================

export async function getAcademyAdminOptionsPg(tenant: string) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { sessions: [], teachers: [], allPeople: [], spaces: [] };

  const db = getDb();
  const [sessionRows, peopleRows, spaceRows] = await Promise.all([
    db.select().from(schema.sessions).where(eq(schema.sessions.organizationId, orgId)).orderBy(desc(schema.sessions.id)),
    db.select().from(schema.people).where(eq(schema.people.organizationId, orgId)).orderBy(asc(schema.people.fullName)),
    db.select().from(schema.spaces).where(eq(schema.spaces.organizationId, orgId)).orderBy(asc(schema.spaces.roomName)),
  ]);

  return {
    sessions: sessionRows.map((s) => ({ id: extId(s), name: s.name })),
    teachers: peopleRows
      .filter((p) =>
        (p.roles || []).some((r) =>
          ["Admin", "Executive Director", "Staff", "Teacher", "Contractor", "Education Coordinator"].includes(r)
        )
      )
      .map((p) => ({ id: extId(p), name: p.fullName, email: p.email || "" })),
    allPeople: peopleRows.map((p) => ({
      id: extId(p),
      name: p.fullName,
      email: p.email || "",
      phone: p.phone || "",
    })),
    spaces: spaceRows.map((sp) => ({ id: extId(sp), name: sp.roomName })),
  };
}

export async function createClassAdminPg(
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
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const cleanedName = input.className.trim();
  if (!cleanedName) return { success: false, error: "Class name is required." };

  const db = getDb();

  let sessionDbId: number | null = null;
  if (input.sessionId) {
    const [s] = await db
      .select()
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.organizationId, orgId),
          or(eq(schema.sessions.baserowId, input.sessionId), eq(schema.sessions.id, input.sessionId))
        )
      )
      .limit(1);
    sessionDbId = s?.id ?? null;
  } else if (input.sessionName?.trim()) {
    const [createdSess] = await db
      .insert(schema.sessions)
      .values({ organizationId: orgId, name: input.sessionName.trim(), isActive: true })
      .returning();
    sessionDbId = createdSess.id;
  }

  let teacherDbId: number | null = null;
  if (input.teacherId) {
    const t = await resolvePerson(orgId, input.teacherId);
    teacherDbId = t?.id ?? null;
  }

  let spaceDbId: number | null = null;
  if (input.spaceId) {
    const [sp] = await db
      .select()
      .from(schema.spaces)
      .where(
        and(
          eq(schema.spaces.organizationId, orgId),
          or(eq(schema.spaces.baserowId, input.spaceId), eq(schema.spaces.id, input.spaceId))
        )
      )
      .limit(1);
    spaceDbId = sp?.id ?? null;
  }

  const [created] = await db
    .insert(schema.classes)
    .values({
      organizationId: orgId,
      className: cleanedName,
      sessionId: sessionDbId,
      teacherId: teacherDbId,
      spaceId: spaceDbId,
      location: input.location?.trim() || null,
      day: input.day?.trim() || "TBD",
      timeSlot: input.timeSlot?.trim() || "TBD",
      minAge: typeof input.minAge === "number" ? input.minAge : 8,
      maxAge: typeof input.maxAge === "number" ? input.maxAge : 18,
      type: input.type?.trim() || "Acting",
      status: input.status?.trim() || "Active",
    })
    .returning();

  return { success: true, classId: extId(created) };
}

export async function updateClassAdminPg(
  tenant: string,
  classExternalId: number,
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
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.classes)
    .where(
      and(
        eq(schema.classes.organizationId, orgId),
        or(eq(schema.classes.baserowId, classExternalId), eq(schema.classes.id, classExternalId))
      )
    )
    .limit(1);

  if (!existing) return { success: false, error: "Class not found." };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof input.className === "string" && input.className.trim()) {
    updates.className = input.className.trim();
  }
  if (input.teacherId !== undefined) {
    if (input.teacherId === null) {
      updates.teacherId = null;
    } else {
      const t = await resolvePerson(orgId, input.teacherId);
      updates.teacherId = t?.id ?? null;
    }
  }
  if (input.spaceId !== undefined) {
    if (input.spaceId === null) {
      updates.spaceId = null;
    } else {
      const [sp] = await db
        .select()
        .from(schema.spaces)
        .where(
          and(
            eq(schema.spaces.organizationId, orgId),
            or(eq(schema.spaces.baserowId, input.spaceId), eq(schema.spaces.id, input.spaceId))
          )
        )
        .limit(1);
      updates.spaceId = sp?.id ?? null;
    }
  }
  if (typeof input.location === "string") updates.location = input.location.trim() || null;
  if (typeof input.day === "string") updates.day = input.day.trim();
  if (typeof input.timeSlot === "string") updates.timeSlot = input.timeSlot.trim();
  if (typeof input.minAge === "number") updates.minAge = input.minAge;
  if (typeof input.maxAge === "number") updates.maxAge = input.maxAge;
  if (typeof input.type === "string") updates.type = input.type.trim();
  if (typeof input.status === "string") updates.status = input.status.trim();

  await db
    .update(schema.classes)
    .set(updates)
    .where(and(eq(schema.classes.organizationId, orgId), eq(schema.classes.id, existing.id)));

  return { success: true };
}

export async function deleteClassAdminPg(tenant: string, classExternalId: number) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const db = getDb();
  await db
    .delete(schema.classes)
    .where(
      and(
        eq(schema.classes.organizationId, orgId),
        or(eq(schema.classes.baserowId, classExternalId), eq(schema.classes.id, classExternalId))
      )
    );

  return { success: true };
}

export async function enrollStudentInClassPg(
  tenant: string,
  classExternalId: number,
  studentExternalId: number
) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const db = getDb();
  const [cls] = await db
    .select()
    .from(schema.classes)
    .where(
      and(
        eq(schema.classes.organizationId, orgId),
        or(eq(schema.classes.baserowId, classExternalId), eq(schema.classes.id, classExternalId))
      )
    )
    .limit(1);
  if (!cls) return { success: false, error: "Class not found." };

  const student = await resolvePerson(orgId, studentExternalId);
  if (!student) return { success: false, error: "Student not found." };

  await db
    .insert(schema.classEnrollments)
    .values({
      organizationId: orgId,
      classId: cls.id,
      studentId: student.id,
    })
    .onConflictDoNothing();

  return {
    success: true,
    student: {
      id: extId(student),
      name: student.fullName,
      age: student.dateOfBirth || "?",
      email: student.email || "",
      phone: student.phone || "",
    },
  };
}

export async function unenrollStudentFromClassPg(
  tenant: string,
  classExternalId: number,
  studentExternalId: number
) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const db = getDb();
  const [cls] = await db
    .select()
    .from(schema.classes)
    .where(
      and(
        eq(schema.classes.organizationId, orgId),
        or(eq(schema.classes.baserowId, classExternalId), eq(schema.classes.id, classExternalId))
      )
    )
    .limit(1);
  if (!cls) return { success: false, error: "Class not found." };

  const student = await resolvePerson(orgId, studentExternalId);
  if (!student) return { success: false, error: "Student not found." };

  await db
    .delete(schema.classEnrollments)
    .where(
      and(
        eq(schema.classEnrollments.organizationId, orgId),
        eq(schema.classEnrollments.classId, cls.id),
        eq(schema.classEnrollments.studentId, student.id)
      )
    );

  return { success: true };
}

export async function saveClassAttendancePg(
  tenant: string,
  classExternalId: number,
  dateIso: string,
  statuses: Record<number, string>
) {
  const orgId = await resolveOrgId(tenant);
  if (!orgId) return { success: false, error: "Organization not found." };

  const db = getDb();
  const noteTag = `class:${classExternalId}:${dateIso}`;
  let savedCount = 0;

  for (const [studentExtIdStr, status] of Object.entries(statuses)) {
    const studentExtId = Number(studentExtIdStr);
    if (!Number.isFinite(studentExtId) || !status) continue;
    const student = await resolvePerson(orgId, studentExtId);
    if (!student) continue;

    // Replace existing attendance row for this class+date+student
    await db
      .delete(schema.attendance)
      .where(
        and(
          eq(schema.attendance.organizationId, orgId),
          eq(schema.attendance.personId, student.id),
          eq(schema.attendance.notes, noteTag)
        )
      );

    await db.insert(schema.attendance).values({
      organizationId: orgId,
      personId: student.id,
      status,
      checkInTime: new Date().toISOString(),
      notes: noteTag,
    });
    savedCount++;
  }

  return { success: true, savedCount };
}
