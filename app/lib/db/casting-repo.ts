// app/lib/db/casting-repo.ts
// Phase 2B PostgreSQL repository: Auditions, Casting, Check-In, Family Hub, and Stripe Fulfillment.

import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getOrganizationBySlugPg } from "./core-repo";
import { pickUniqueAuditionNumber, formatHeightFromInches, computeAgeFromDob } from "./role-helpers";

function extId(row: { id: number; baserowId: number | null }): number {
  return row.baserowId ?? row.id;
}

async function resolveProduction(orgId: number, externalId: number) {
  const db = getDb();
  const [prod] = await db
    .select()
    .from(schema.productions)
    .where(
      and(
        eq(schema.productions.organizationId, orgId),
        or(eq(schema.productions.baserowId, externalId), eq(schema.productions.id, externalId))
      )
    )
    .limit(1);
  return prod ?? null;
}

async function resolvePerson(orgId: number, externalId: number) {
  const db = getDb();
  const [person] = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, orgId),
        or(eq(schema.people.baserowId, externalId), eq(schema.people.id, externalId))
      )
    )
    .limit(1);
  return person ?? null;
}

async function resolveRole(orgId: number, externalId: number) {
  const db = getDb();
  const [role] = await db
    .select()
    .from(schema.blueprintRoles)
    .where(
      and(
        eq(schema.blueprintRoles.organizationId, orgId),
        or(
          eq(schema.blueprintRoles.baserowId, externalId),
          eq(schema.blueprintRoles.id, externalId)
        )
      )
    )
    .limit(1);
  return role ?? null;
}

async function resolveAudition(orgId: number, externalId: number) {
  const db = getDb();
  const [aud] = await db
    .select()
    .from(schema.auditions)
    .where(
      and(
        eq(schema.auditions.organizationId, orgId),
        or(eq(schema.auditions.baserowId, externalId), eq(schema.auditions.id, externalId))
      )
    )
    .limit(1);
  return aud ?? null;
}

async function resolveSlot(orgId: number, externalId: number) {
  const db = getDb();
  const [slot] = await db
    .select()
    .from(schema.auditionSlots)
    .where(
      and(
        eq(schema.auditionSlots.organizationId, orgId),
        or(
          eq(schema.auditionSlots.baserowId, externalId),
          eq(schema.auditionSlots.id, externalId)
        )
      )
    )
    .limit(1);
  return slot ?? null;
}

async function resolveAssignment(orgId: number, externalId: number) {
  const db = getDb();
  const [assignment] = await db
    .select()
    .from(schema.assignments)
    .where(
      and(
        eq(schema.assignments.organizationId, orgId),
        or(
          eq(schema.assignments.baserowId, externalId),
          eq(schema.assignments.id, externalId)
        )
      )
    )
    .limit(1);
  return assignment ?? null;
}

// ==============================================================================
// CASTING & ROLES READS / WRITES
// ==============================================================================

export async function getRolesPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.blueprintRoles)
    .where(eq(schema.blueprintRoles.organizationId, org.id))
    .orderBy(asc(schema.blueprintRoles.roleName));

  return rows.map((row) => ({
    id: extId(row),
    name: row.roleName,
    type: row.roleType || "Ensemble",
  }));
}

export async function getAssignmentsPg(tenantSlug: string, productionId?: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  let internalProdId: number | null = null;
  if (productionId) {
    const prod = await resolveProduction(org.id, productionId);
    if (!prod) return [];
    internalProdId = prod.id;
  }

  const rows = await db
    .select({
      assignment: schema.assignments,
      person: schema.people,
      role: schema.blueprintRoles,
    })
    .from(schema.assignments)
    .leftJoin(schema.people, eq(schema.assignments.personId, schema.people.id))
    .leftJoin(schema.blueprintRoles, eq(schema.assignments.roleId, schema.blueprintRoles.id))
    .where(
      internalProdId !== null
        ? and(
            eq(schema.assignments.organizationId, org.id),
            eq(schema.assignments.productionId, internalProdId)
          )
        : eq(schema.assignments.organizationId, org.id)
    );

  return rows.map((r) => ({
    id: extId(r.assignment),
    assignment: r.role?.roleName || "Unknown Role",
    personId: r.person ? extId(r.person) : 0,
    personName:
      r.person?.fullName?.trim() ||
      `${r.person?.firstName || ""} ${r.person?.lastName || ""}`.trim() ||
      "Unknown Actor",
  }));
}

export async function createCastAssignmentPg(
  tenantSlug: string,
  personId: number,
  roleId: number,
  productionId: number
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { error: true, details: "Organization not found." };

  const [person, role, prod] = await Promise.all([
    resolvePerson(org.id, personId),
    resolveRole(org.id, roleId),
    resolveProduction(org.id, productionId),
  ]);

  if (!person || !role || !prod) {
    return { error: true, details: "Could not resolve person, role, or production." };
  }

  const db = getDb();
  const [created] = await db
    .insert(schema.assignments)
    .values({
      organizationId: org.id,
      personId: person.id,
      roleId: role.id,
      productionId: prod.id,
    })
    .returning();

  return { ...created, id: extId(created) };
}

export async function updateCastAssignmentPg(
  tenantSlug: string,
  assignmentId: number,
  personId: number | null
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { error: true, details: "Organization not found." };

  const existing = await resolveAssignment(org.id, assignmentId);
  if (!existing) return { error: true, details: "Assignment not found." };

  let internalPersonId: number | null = null;
  if (personId !== null) {
    const person = await resolvePerson(org.id, personId);
    internalPersonId = person?.id ?? null;
  }

  const db = getDb();
  const [updated] = await db
    .update(schema.assignments)
    .set({ personId: internalPersonId, updatedAt: new Date() })
    .where(eq(schema.assignments.id, existing.id))
    .returning();

  return { ...updated, id: extId(updated) };
}

export async function generateCastingRowsPg(tenantSlug: string, productionId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const prod = await resolveProduction(org.id, productionId);
  if (!prod) return { success: false as const, error: "Production not found." };

  const db = getDb();
  const roles = prod.masterShowId
    ? await db
        .select()
        .from(schema.blueprintRoles)
        .where(
          and(
            eq(schema.blueprintRoles.organizationId, org.id),
            eq(schema.blueprintRoles.masterShowId, prod.masterShowId)
          )
        )
    : await db
        .select()
        .from(schema.blueprintRoles)
        .where(eq(schema.blueprintRoles.organizationId, org.id));

  if (roles.length === 0) {
    return { success: false as const, error: "No Blueprint Roles found for this production." };
  }

  await db.insert(schema.assignments).values(
    roles.map((role) => ({
      organizationId: org.id,
      productionId: prod.id,
      roleId: role.id,
    }))
  );

  return { success: true as const, count: roles.length };
}

// ==============================================================================
// AUDITIONS READS
// ==============================================================================

export async function getAuditionSlotsPg(tenantSlug: string, productionId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const prod = await resolveProduction(org.id, productionId);
  if (!prod) return [];

  const db = getDb();
  const [slots, bookingCounts] = await Promise.all([
    db
      .select()
      .from(schema.auditionSlots)
      .where(
        and(
          eq(schema.auditionSlots.organizationId, org.id),
          eq(schema.auditionSlots.productionId, prod.id)
        )
      )
      .orderBy(asc(schema.auditionSlots.id)),
    db
      .select({
        slotId: schema.auditions.slotId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.auditions)
      .where(
        and(
          eq(schema.auditions.organizationId, org.id),
          eq(schema.auditions.productionId, prod.id)
        )
      )
      .groupBy(schema.auditions.slotId),
  ]);

  const countMap = new Map<number, number>();
  for (const row of bookingCounts) {
    if (row.slotId !== null) countMap.set(row.slotId, row.count);
  }

  return slots.map((slot) => {
    const rawLabel = slot.timeLabel || "TBD TBD";
    const capacity = slot.capacity ?? 0;
    const taken = countMap.get(slot.id) ?? 0;
    const remaining = Math.max(0, capacity - taken);

    return {
      id: extId(slot).toString(),
      day: rawLabel.split(" ")[0] || "TBD",
      time: rawLabel.split(" ").slice(1).join(" ") || rawLabel,
      capacity,
      taken,
      remaining,
      isFull: remaining <= 0,
    };
  });
}

export async function getAuditioneesPg(tenantSlug: string, productionId?: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  let internalProdId: number | null = null;
  if (productionId) {
    const prod = await resolveProduction(org.id, productionId);
    if (!prod) return [];
    internalProdId = prod.id;
  }

  const rows = await db
    .select({
      aud: schema.auditions,
      person: schema.people,
      slotLabel: schema.auditionSlots.timeLabel,
    })
    .from(schema.auditions)
    .leftJoin(schema.people, eq(schema.auditions.performerId, schema.people.id))
    .leftJoin(schema.auditionSlots, eq(schema.auditions.slotId, schema.auditionSlots.id))
    .where(
      internalProdId !== null
        ? and(
            eq(schema.auditions.organizationId, org.id),
            eq(schema.auditions.productionId, internalProdId)
          )
        : eq(schema.auditions.organizationId, org.id)
    )
    .orderBy(asc(schema.auditions.id));

  return rows.map(({ aud, person, slotLabel }) => {
    const performerName =
      person?.fullName?.trim() ||
      `${person?.firstName || ""} ${person?.lastName || ""}`.trim() ||
      "Unknown Actor";
    const performerExtId = person ? extId(person) : null;

    let avatarUrl = person?.headshotUrl || "";
    if (!avatarUrl || !avatarUrl.startsWith("http")) {
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(performerName)}&background=27272a&color=60a5fa`;
    }

    const age = computeAgeFromDob(person?.dateOfBirth || null);

    return {
      id: extId(aud),
      performerId: performerExtId,
      name: performerName,
      studentId: performerExtId,
      role: "Auditionee",
      status: aud.checkedIn ? "Checked In" : "Pending",
      timeSlot: slotLabel || "WALK-IN",
      auditionDay: aud.auditionDate
        ? new Date(aud.auditionDate).toLocaleDateString("en-US", { weekday: "long" })
        : "",
      avatar: avatarUrl,
      lobbyNote: aud.lobbyNote || "",
      checkedIn: aud.checkedIn === true,

      backingTrack: aud.backingTrackUrl || "",
      song: aud.song || "",
      monologue: aud.monologue || "",
      vocalScore: Number(aud.vocalScore ?? 0),
      actingScore: Number(aud.actingScore ?? 0),
      danceScore: Number(aud.danceScore ?? 0),
      presenceScore: Number(aud.stagePresenceScore ?? 0),
      actingNotes: aud.actingNotes || "",
      musicNotes: aud.musicNotes || "",
      choreoNotes: aud.choreographyNotes || "",
      dropInNotes: aud.dropInNotes || "",
      adminNotes: aud.adminNotes || "",

      auditionNumber: aud.auditionNumber || "",
      preferredRoles: aud.preferredRoles || "",
      stageRomance: aud.stageRomance === true,
      willingToAlterAppearance: aud.willingToAlterAppearance === true,
      otherTalents: aud.otherTalents || "",
      hairColor: aud.hairColor || "",
      height: formatHeightFromInches(person?.heightInches ?? null),
      age: age > 0 ? String(age) : "",
      vocalRange: aud.vocalRange || "",
      dob: person?.dateOfBirth || "",
      conflicts: "",
      video: aud.auditionVideoUrl || "",
      showHistory: "",
    };
  });
}

export async function getExistingAuditionsPg(
  tenantSlug: string,
  email: string,
  productionId: number
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return [];

  const prod = await resolveProduction(org.id, productionId);
  if (!prod) return [];

  const db = getDb();
  const rows = await db
    .select({
      aud: schema.auditions,
      person: schema.people,
      slot: schema.auditionSlots,
      castRoleName: schema.blueprintRoles.roleName,
    })
    .from(schema.auditions)
    .innerJoin(schema.people, eq(schema.auditions.performerId, schema.people.id))
    .leftJoin(schema.auditionSlots, eq(schema.auditions.slotId, schema.auditionSlots.id))
    .leftJoin(
      schema.assignments,
      and(
        eq(schema.assignments.productionId, prod.id),
        eq(schema.assignments.personId, schema.people.id)
      )
    )
    .leftJoin(schema.blueprintRoles, eq(schema.assignments.roleId, schema.blueprintRoles.id))
    .where(
      and(
        eq(schema.auditions.organizationId, org.id),
        eq(schema.auditions.productionId, prod.id),
        or(
          eq(schema.people.email, cleanEmail),
          eq(schema.people.secondaryEmail, cleanEmail),
          eq(schema.people.familyEmail, cleanEmail)
        )
      )
    );

  // Deduplicate by audition id in case a student has multiple cast roles
  const byAudId = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    if (!byAudId.has(row.aud.id)) byAudId.set(row.aud.id, row);
  }

  return Array.from(byAudId.values()).map(({ aud, person, slot, castRoleName }) => {
    const totalInches = person.heightInches ?? 0;
    const ft = totalInches > 0 ? Math.floor(totalInches / 12).toString() : "";
    const inch = totalInches > 0 ? (totalInches % 12).toString() : "";
    const studentName =
      person.fullName?.trim() || `${person.firstName} ${person.lastName}`.trim() || "Student";

    return {
      id: extId(aud),
      studentId: extId(person),
      name: studentName,
      status: aud.status || "Pending",
      role: castRoleName || "",
      signatures: aud.signaturesText || "",
      bio: aud.programBio || "",
      congratsAd: aud.congratsAdText || "",
      paidFees: Boolean(aud.paidFees),
      productionFeeStatus: aud.productionFeeStatus || "",
      time: slot?.timeLabel || "Pending Time",
      timeSlot: slot?.timeLabel || "Pending Time",
      song: aud.song || "No Song Selected",
      adminNotes: aud.adminNotes || "",
      checkedIn: Boolean(aud.checkedIn),
      isCheckedIn: Boolean(aud.checkedIn),
      rawAuditionData: {
        fullName: studentName,
        dob: person.dateOfBirth || "",
        grade: aud.grade || "",
        heightFt: ft,
        heightIn: inch,
        hairColor: aud.hairColor || "",
        songTitle: aud.song || "",
        musicFileName: aud.backingTrackUrl || "",
        vocalRange: aud.vocalRange || "",
        auditionSlotId: slot ? extId(slot) : "",
        conflicts: "",
        headshotUrl: person.headshotUrl || null,
        cytWebsiteRegistered: true,
        callbackStatus: aud.callbackStatus || "Unknown",
      },
    };
  });
}

// ==============================================================================
// AUDITIONS WRITES (FORM SUBMISSION, SCORING, BIO, CHECK-IN, STRIPE)
// ==============================================================================

export async function submitAuditionPg(
  tenantSlug: string,
  studentId: number,
  productionId: number,
  extraData: { vocal?: number; acting?: number; dance?: number; presence?: number; notes?: string }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { error: true, details: "Organization not found." };

  const [person, prod] = await Promise.all([
    resolvePerson(org.id, studentId),
    resolveProduction(org.id, productionId),
  ]);
  if (!person || !prod) return { error: true, details: "Invalid student or production." };

  const db = getDb();
  const [created] = await db
    .insert(schema.auditions)
    .values({
      organizationId: org.id,
      performerId: person.id,
      productionId: prod.id,
      auditionDate: new Date().toISOString().split("T")[0],
      vocalScore: extraData.vocal ?? 0,
      actingScore: extraData.acting ?? 0,
      danceScore: extraData.dance ?? 0,
      stagePresenceScore: extraData.presence ?? 0,
      actingNotes: extraData.notes ?? "",
    })
    .returning();

  return { ...created, id: extId(created) };
}

export async function submitRealAuditionPg(
  tenantSlug: string,
  productionId: number,
  formData: any,
  lookupEmail: string
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const prod = await resolveProduction(org.id, productionId);
  if (!prod) return { success: false as const, error: "Production not found." };

  const db = getDb();
  const cleanEmail = (lookupEmail || "").trim().toLowerCase();
  const fullName = (formData.fullName || "").trim();
  const nameParts = fullName.split(/\s+/);
  const firstName = nameParts[0] || "Student";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
  const heightInches = (parseInt(formData.heightFt) || 0) * 12 + (parseInt(formData.heightIn) || 0);

  // 1. Resolve or create student in people
  const [existingPerson] = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, org.id),
        ilike(schema.people.firstName, firstName),
        ilike(schema.people.lastName, lastName),
        or(eq(schema.people.email, cleanEmail), eq(schema.people.secondaryEmail, cleanEmail))
      )
    )
    .limit(1);

  let personId: number;
  if (existingPerson) {
    personId = existingPerson.id;
    await db
      .update(schema.people)
      .set({
        dateOfBirth: formData.dob || existingPerson.dateOfBirth,
        heightInches: heightInches > 0 ? heightInches : existingPerson.heightInches,
        headshotUrl: formData.headshotUrl || existingPerson.headshotUrl,
        updatedAt: new Date(),
      })
      .where(eq(schema.people.id, existingPerson.id));
  } else {
    const [createdPerson] = await db
      .insert(schema.people)
      .values({
        organizationId: org.id,
        firstName,
        lastName,
        fullName: fullName || firstName,
        email: cleanEmail,
        dateOfBirth: formData.dob || null,
        heightInches: heightInches > 0 ? heightInches : null,
        headshotUrl: formData.headshotUrl || null,
        roles: ["Guest"],
      })
      .returning();
    personId = createdPerson.id;
  }

  // 2. Validate audition slot capacity (prevents overbooking!)
  let internalSlotId: number | null = null;
  let slotLabel = "your scheduled time";
  if (formData.auditionSlotId) {
    const slot = await resolveSlot(org.id, Number(formData.auditionSlotId));
    if (slot) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.auditions)
        .where(
          and(
            eq(schema.auditions.organizationId, org.id),
            eq(schema.auditions.slotId, slot.id)
          )
        );
      if (slot.capacity > 0 && count >= slot.capacity) {
        return {
          success: false as const,
          error: `The audition slot "${slot.timeLabel}" just filled up. Please pick another time slot.`,
        };
      }
      internalSlotId = slot.id;
      slotLabel = slot.timeLabel;
    }
  }

  // 3. Pick unique random audition number for this production
  const existingAuditions = await db
    .select({ auditionNumber: schema.auditions.auditionNumber })
    .from(schema.auditions)
    .where(
      and(
        eq(schema.auditions.organizationId, org.id),
        eq(schema.auditions.productionId, prod.id)
      )
    );

  const existingNumbers = new Set<number>();
  for (const row of existingAuditions) {
    const num = Number.parseInt(row.auditionNumber || "", 10);
    if (!Number.isNaN(num)) existingNumbers.add(num);
  }
  const assignedNumber = pickUniqueAuditionNumber(existingNumbers);

  const conflictString = Object.entries(formData.conflicts || {})
    .filter(([, val]: any) => val?.level !== "available")
    .map(([key, val]: any) => `${key}: ${val.level} (${val.notes || "No notes"})`)
    .join("\n");

  const extraDataString = `Grade: ${formData.grade || "N/A"}\nRoles: ${formData.preferredRoles || "N/A"}\nStage Romance: ${formData.acceptRomance ? "Yes" : "No"}\nCallbacks: ${formData.callbackStatus || "No Answer"}\nChair Interest: ${formData.chairInterest || "No"}`;

  // 4. Insert audition record
  const [audition] = await db
    .insert(schema.auditions)
    .values({
      organizationId: org.id,
      performerId: personId,
      productionId: prod.id,
      slotId: internalSlotId,
      auditionDate: new Date().toISOString().split("T")[0],
      song: formData.songTitle || "None",
      hairColor: formData.hairColor || "",
      acceptAnyRole: Boolean(formData.acceptAnyRole),
      offBookAgreement: Boolean(formData.offBookAgreement),
      parentHelpAgreement: Boolean(formData.parentCommitteeAgreement),
      signaturesText: `${formData.studentSignature ? "Yes" : "No"} (S), ${formData.parentSignature ? "Yes" : "No"} (P)`,
      backingTrackUrl: formData.practiceAudio || formData.musicFileUrl || "",
      grade: formData.grade || null,
      willingToAlterAppearance: Boolean(formData.willingToAlterAppearance),
      fearOfHeights: Boolean(formData.fearOfHeights),
      otherTalents: formData.otherTalents || "",
      adminNotes: `Conflicts:\n${conflictString || "None"}\n\nExtra Info:\n${extraDataString}`,
      voiceType: formData.voiceType || "Unsure",
      vocalRange: formData.vocalRange || "",
      auditionNumber: String(assignedNumber),
      preferredRoles: formData.preferredRoles || "",
      stageRomance: Boolean(formData.acceptRomance),
      callbackStatus: formData.callbackStatus || "",
      status: "Pending",
    })
    .returning();

  // 5. Save committee preferences
  if (formData.preShow1 || formData.show1 || formData.chairInterest) {
    await db.insert(schema.committeePrefs).values({
      organizationId: org.id,
      productionId: prod.id,
      studentPersonId: personId,
      preShow1: formData.preShow1 || null,
      preShow2: formData.preShow2 || null,
      preShow3: formData.preShow3 || null,
      showWeek1: formData.show1 || null,
      showWeek2: formData.show2 || null,
      showWeek3: formData.show3 || null,
      isChair: formData.chairInterest === "yes",
    });
  }

  return {
    success: true as const,
    auditionId: extId(audition),
    auditionNumber: assignedNumber,
    slotLabel,
    firstName,
    lastName,
  };
}

export async function cancelAuditionPg(tenantSlug: string, auditionId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const aud = await resolveAudition(org.id, auditionId);
  if (!aud) return { success: false as const, error: "Audition not found." };

  const db = getDb();
  await db.delete(schema.auditions).where(eq(schema.auditions.id, aud.id));
  return { success: true as const };
}

export async function saveAuditionScorePg(
  tenantSlug: string,
  auditionId: number,
  scores: { vocal: number; acting: number; dance: number; presence: number; notes: string },
  judgeRole: string
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const aud = await resolveAudition(org.id, auditionId);
  if (!aud) return { success: false as const, error: "Audition not found." };

  const updates: Partial<typeof schema.auditions.$inferInsert> = {
    vocalScore: scores.vocal,
    actingScore: scores.acting,
    danceScore: scores.dance,
    stagePresenceScore: scores.presence,
    updatedAt: new Date(),
  };

  if (scores.notes !== undefined) {
    if (judgeRole === "Music") updates.musicNotes = scores.notes;
    else if (judgeRole === "Drop-In") updates.dropInNotes = scores.notes;
    else if (judgeRole === "Admin") updates.adminNotes = scores.notes;
    else if (judgeRole === "Choreo" || judgeRole === "Choreography") {
      updates.choreographyNotes = scores.notes;
    } else {
      updates.actingNotes = scores.notes;
    }
  }

  const db = getDb();
  await db.update(schema.auditions).set(updates).where(eq(schema.auditions.id, aud.id));
  return { success: true as const };
}

export async function saveStudentBioPg(tenantSlug: string, auditionId: number, bio: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { error: true };
  const aud = await resolveAudition(org.id, auditionId);
  if (!aud) return { error: true };
  const db = getDb();
  const [updated] = await db
    .update(schema.auditions)
    .set({ programBio: bio, updatedAt: new Date() })
    .where(eq(schema.auditions.id, aud.id))
    .returning();
  return updated;
}

export async function saveCongratsAdPg(tenantSlug: string, auditionId: number, adText: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { error: true };
  const aud = await resolveAudition(org.id, auditionId);
  if (!aud) return { error: true };
  const db = getDb();
  const [updated] = await db
    .update(schema.auditions)
    .set({ congratsAdText: adText, updatedAt: new Date() })
    .where(eq(schema.auditions.id, aud.id))
    .returning();
  return updated;
}

export async function saveTicketsSoldPg(
  tenantSlug: string,
  studentId: number,
  productionId: number,
  tickets: number
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { error: "Organization not found" };
  const [student, prod] = await Promise.all([
    resolvePerson(org.id, studentId),
    resolveProduction(org.id, productionId),
  ]);
  if (!student || !prod) return { error: "Committee Pref row not found" };

  const db = getDb();
  const [pref] = await db
    .select()
    .from(schema.committeePrefs)
    .where(
      and(
        eq(schema.committeePrefs.organizationId, org.id),
        eq(schema.committeePrefs.studentPersonId, student.id),
        eq(schema.committeePrefs.productionId, prod.id)
      )
    )
    .limit(1);

  if (!pref) return { error: "Committee Pref row not found" };

  const [updated] = await db
    .update(schema.committeePrefs)
    .set({ ticketsSold: tickets })
    .where(eq(schema.committeePrefs.id, pref.id))
    .returning();
  return updated;
}

export async function acceptRoleAndSignPg(
  tenantSlug: string,
  auditionId: number,
  signatures: string
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };
  const aud = await resolveAudition(org.id, auditionId);
  if (!aud) return { success: false as const, error: "Audition not found." };

  const db = getDb();
  await db
    .update(schema.auditions)
    .set({ signaturesText: signatures, updatedAt: new Date() })
    .where(eq(schema.auditions.id, aud.id));
  return { success: true as const };
}

export async function saveCheckInPg(
  tenantSlug: string,
  auditionId: number,
  status: string,
  lobbyNote: string,
  performerId?: number | null,
  updatedName?: string,
  updatedPhone?: string,
  updatedEmail?: string
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const aud = await resolveAudition(org.id, auditionId);
  if (!aud) return { success: false as const, error: "Audition not found." };

  const isCheckedIn = status === "Checked In" || status === "Late";
  const db = getDb();

  await db
    .update(schema.auditions)
    .set({
      lobbyNote: lobbyNote || "",
      checkedIn: isCheckedIn,
      updatedAt: new Date(),
    })
    .where(eq(schema.auditions.id, aud.id));

  if (performerId && (updatedPhone || updatedEmail || updatedName)) {
    const person = await resolvePerson(org.id, performerId);
    if (person) {
      const updates: Partial<typeof schema.people.$inferInsert> = { updatedAt: new Date() };
      if (updatedName?.trim()) {
        const clean = updatedName.trim();
        const parts = clean.split(/\s+/);
        updates.firstName = parts[0];
        updates.lastName = parts.slice(1).join(" ");
        updates.fullName = clean;
      }
      if (updatedPhone) updates.phone = updatedPhone.trim();
      if (updatedEmail) updates.email = updatedEmail.trim().toLowerCase();
      await db.update(schema.people).set(updates).where(eq(schema.people.id, person.id));
    }
  }

  return { success: true as const };
}

export async function markAuditionPaidPg(tenantSlug: string, auditionId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const aud = await resolveAudition(org.id, auditionId);
  if (!aud) return { success: false as const, error: "Audition not found." };

  const db = getDb();
  await db
    .update(schema.auditions)
    .set({
      paidFees: true,
      productionFeeStatus: "Paid",
      updatedAt: new Date(),
    })
    .where(eq(schema.auditions.id, aud.id));

  return { success: true as const };
}

// ==============================================================================
// FAMILY HUB READS / WRITES
// ==============================================================================

export async function getFamilyMembersPg(tenantSlug: string, email: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return [];

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, org.id),
        or(
          eq(schema.people.email, cleanEmail),
          eq(schema.people.secondaryEmail, cleanEmail),
          eq(schema.people.familyEmail, cleanEmail)
        )
      )
    );

  return rows.map((p) => ({
    id: extId(p),
    firstName: p.firstName || "",
    lastName: p.lastName || "",
    dateOfBirth: p.dateOfBirth || "Not Set",
    headshot: p.headshotUrl || null,
    address: p.address || "",
    emergencyContact: p.emergencyContactName || "",
    tShirtSize: p.tShirtSize || "",
    allergies: p.medicalNotes || "",
    tylenol: Boolean(p.tylenolApproval),
    ibuprofen: Boolean(p.ibuprofenApproval),
  }));
}

export async function updateStudentMasterProfilePg(
  tenantSlug: string,
  personId: number,
  data: {
    address?: string;
    emergencyContact?: string;
    tShirtSize?: string;
    allergies?: string;
    tylenol?: boolean;
    ibuprofen?: boolean;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const person = await resolvePerson(org.id, personId);
  if (!person) return { success: false as const, error: "Person not found." };

  const db = getDb();
  await db
    .update(schema.people)
    .set({
      address: data.address || "",
      emergencyContactName: data.emergencyContact || "",
      tShirtSize: data.tShirtSize || "",
      medicalNotes: data.allergies || "",
      tylenolApproval: Boolean(data.tylenol),
      ibuprofenApproval: Boolean(data.ibuprofen),
      updatedAt: new Date(),
    })
    .where(eq(schema.people.id, person.id));

  return { success: true as const };
}

export async function updateAuditionDetailsPg(
  tenantSlug: string,
  auditionId: number,
  updateData: any
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const aud = await resolveAudition(org.id, auditionId);
  if (!aud) return { success: false as const, error: "Audition not found." };

  if (aud.checkedIn) {
    return {
      success: false as const,
      error: "Audition is locked. Please speak to the stage manager to make changes.",
    };
  }

  const db = getDb();
  const [updated] = await db
    .update(schema.auditions)
    .set({
      hairColor: updateData.hairColor ?? aud.hairColor,
      preferredRoles: updateData.preferredRoles ?? aud.preferredRoles,
      voiceType: updateData.voiceType ?? aud.voiceType,
      acceptAnyRole:
        updateData.acceptAnyRole !== undefined ? Boolean(updateData.acceptAnyRole) : aud.acceptAnyRole,
      stageRomance:
        updateData.stageRomance !== undefined ? Boolean(updateData.stageRomance) : aud.stageRomance,
      willingToAlterAppearance:
        updateData.willingToAlterAppearance !== undefined
          ? Boolean(updateData.willingToAlterAppearance)
          : aud.willingToAlterAppearance,
      fearOfHeights:
        updateData.fearOfHeights !== undefined ? Boolean(updateData.fearOfHeights) : aud.fearOfHeights,
      otherTalents: updateData.otherTalents ?? aud.otherTalents,
      song: updateData.songTitle ?? aud.song,
      backingTrackUrl: updateData.musicFileUrl ?? aud.backingTrackUrl,
      grade: updateData.grade ?? aud.grade,
      updatedAt: new Date(),
    })
    .where(eq(schema.auditions.id, aud.id))
    .returning();

  if (aud.performerId && (updateData.headshotUrl || updateData.height)) {
    const peopleUpdates: Partial<typeof schema.people.$inferInsert> = { updatedAt: new Date() };
    if (updateData.headshotUrl && !String(updateData.headshotUrl).startsWith("data:")) {
      peopleUpdates.headshotUrl = updateData.headshotUrl;
    }
    if (updateData.height) {
      const parsedHeight = Number.parseInt(String(updateData.height), 10);
      if (!Number.isNaN(parsedHeight) && parsedHeight > 0) {
        peopleUpdates.heightInches = parsedHeight;
      }
    }
    await db
      .update(schema.people)
      .set(peopleUpdates)
      .where(eq(schema.people.id, aud.performerId));
  }

  return { success: true as const, data: updated };
}
