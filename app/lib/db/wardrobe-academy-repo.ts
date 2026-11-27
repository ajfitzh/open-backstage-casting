// app/lib/db/wardrobe-academy-repo.ts
// Phase 2C PostgreSQL repository: Education/Academy Classes, Venue Logistics,
// Cast Measurements, and Garment Inventory (with SKU + QR payload support).

import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getOrganizationBySlugPg } from "./core-repo";
import {
  buildGarmentQrPayload,
  computeAgeFromDob,
  formatAgeRangeHelper,
  generateGarmentSku,
} from "./role-helpers";

function extId(row: { id: number; baserowId?: number | null }): number {
  return row.baserowId ?? row.id;
}

async function resolveProductionRow(orgId: number, externalProdId: number) {
  const db = getDb();
  const [prod] = await db
    .select()
    .from(schema.productions)
    .where(
      and(
        eq(schema.productions.organizationId, orgId),
        or(
          eq(schema.productions.baserowId, externalProdId),
          eq(schema.productions.id, externalProdId)
        )
      )
    )
    .limit(1);
  return prod ?? null;
}

async function resolveClassRow(orgId: number, externalClassId: number) {
  const db = getDb();
  const [cls] = await db
    .select()
    .from(schema.classes)
    .where(
      and(
        eq(schema.classes.organizationId, orgId),
        or(eq(schema.classes.baserowId, externalClassId), eq(schema.classes.id, externalClassId))
      )
    )
    .limit(1);
  return cls ?? null;
}

async function resolvePersonRow(orgId: number, externalPersonId: number) {
  const db = getDb();
  const [person] = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, orgId),
        or(eq(schema.people.baserowId, externalPersonId), eq(schema.people.id, externalPersonId))
      )
    )
    .limit(1);
  return person ?? null;
}

// ==============================================================================
// 🎓 EDUCATION / ACADEMY CLASSES
// ==============================================================================

export async function getClassesPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [classRows, sessionRows, peopleRows, spaceRows, venueRows, enrollmentRows] = await Promise.all([
    db
      .select()
      .from(schema.classes)
      .where(eq(schema.classes.organizationId, org.id))
      .orderBy(asc(schema.classes.className)),
    db.select().from(schema.sessions).where(eq(schema.sessions.organizationId, org.id)),
    db
      .select({
        id: schema.people.id,
        fullName: schema.people.fullName,
        firstName: schema.people.firstName,
        lastName: schema.people.lastName,
      })
      .from(schema.people)
      .where(eq(schema.people.organizationId, org.id)),
    db.select().from(schema.spaces).where(eq(schema.spaces.organizationId, org.id)),
    db.select().from(schema.venues).where(eq(schema.venues.organizationId, org.id)),
    db
      .select({ classId: schema.classEnrollments.classId })
      .from(schema.classEnrollments)
      .where(eq(schema.classEnrollments.organizationId, org.id)),
  ]);

  const sessionMap = new Map(sessionRows.map((s) => [s.id, s.name]));
  const personMap = new Map(
    peopleRows.map((p) => [
      p.id,
      p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || "TBA",
    ])
  );
  const venueMap = new Map(venueRows.map((v) => [v.id, v.name]));
  const spaceMap = new Map(
    spaceRows.map((s) => [
      s.id,
      {
        ext: extId(s),
        name: s.roomName,
        venueName: s.venueId ? venueMap.get(s.venueId) || null : null,
        capacity: s.capacity ?? null,
      },
    ])
  );
  const enrollmentCounts = new Map<number, number>();
  for (const e of enrollmentRows) {
    enrollmentCounts.set(e.classId, (enrollmentCounts.get(e.classId) || 0) + 1);
  }

  return classRows.map((row) => {
    const space = row.spaceId ? spaceMap.get(row.spaceId) : null;
    const minAge = row.minAge ?? 0;
    const maxAge = row.maxAge ?? 99;
    const displaySpaceName = space
      ? space.venueName && space.name.toLowerCase() !== "unknown"
        ? `${space.venueName} - ${space.name}`
        : space.venueName || space.name
      : "Unknown Room";

    return {
      id: extId(row),
      name: row.className || "Unnamed Class",
      session: (row.sessionId && sessionMap.get(row.sessionId)) || "Unknown Session",
      teacher: (row.teacherId && personMap.get(row.teacherId)) || "TBA",
      location: row.location || "Main Campus",
      spaceId: space?.ext ?? null,
      spaceName: displaySpaceName,
      roomCapacity: space?.capacity ?? null,
      day: row.day || "TBD",
      time: row.timeSlot || "TBD",
      type: row.type || "General",
      status: row.status || "Pending",
      description: row.description || "",
      objectives: row.objectives || "",
      minAge,
      maxAge,
      ageRange: formatAgeRangeHelper(minAge, maxAge),
      students: enrollmentCounts.get(row.id) || 0,
    };
  });
}

export async function getProposalsClientPg(tenantSlug: string) {
  const all = await getClassesPg(tenantSlug);
  if (all === null) return null;
  return all.filter((c) => c.status === "Proposed");
}

export async function getClassByIdPg(tenantSlug: string, externalClassId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const cls = await resolveClassRow(org.id, externalClassId);
  if (!cls) return null;

  const db = getDb();
  const [sessionRow, teacherRow, spaceRow, enrollmentRows] = await Promise.all([
    cls.sessionId
      ? db.select().from(schema.sessions).where(eq(schema.sessions.id, cls.sessionId)).limit(1)
      : Promise.resolve([]),
    cls.teacherId
      ? db.select().from(schema.people).where(eq(schema.people.id, cls.teacherId)).limit(1)
      : Promise.resolve([]),
    cls.spaceId
      ? db.select().from(schema.spaces).where(eq(schema.spaces.id, cls.spaceId)).limit(1)
      : Promise.resolve([]),
    db
      .select({ id: schema.classEnrollments.id })
      .from(schema.classEnrollments)
      .where(
        and(
          eq(schema.classEnrollments.organizationId, org.id),
          eq(schema.classEnrollments.classId, cls.id)
        )
      ),
  ]);

  const teacher = teacherRow[0];
  const teacherName = teacher
    ? teacher.fullName || `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim() || "TBA"
    : "TBA";

  return {
    id: extId(cls),
    name: cls.className || "Unnamed Class",
    session: sessionRow[0]?.name || "Unknown",
    teacher: teacherName,
    location: cls.location || "Main Campus",
    day: cls.day || "TBD",
    time: cls.timeSlot || "TBD",
    description: cls.description || "",
    ageRange: formatAgeRangeHelper(cls.minAge, cls.maxAge),
    spaceName: spaceRow[0]?.roomName || "",
    students: enrollmentRows.length,
  };
}

export async function getClassRosterPg(tenantSlug: string, externalClassId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const cls = await resolveClassRow(org.id, externalClassId);
  if (!cls) return [];

  const db = getDb();
  const enrollmentRows = await db
    .select({
      person: schema.people,
    })
    .from(schema.classEnrollments)
    .innerJoin(schema.people, eq(schema.classEnrollments.studentId, schema.people.id))
    .where(
      and(
        eq(schema.classEnrollments.organizationId, org.id),
        eq(schema.classEnrollments.classId, cls.id)
      )
    );

  const roster = enrollmentRows.map(({ person }) => ({
    id: extId(person),
    name:
      person.fullName ||
      `${person.firstName || ""} ${person.lastName || ""}`.trim() ||
      "Unknown Student",
    age: computeAgeFromDob(person.dateOfBirth),
    email: person.email || person.secondaryEmail || "",
    phone: person.phone || "",
    photo: person.headshotUrl || null,
    status: "Student",
    medical: person.medicalNotes || "None",
  }));

  if (cls.teacherId) {
    const [teacher] = await db
      .select()
      .from(schema.people)
      .where(eq(schema.people.id, cls.teacherId))
      .limit(1);
    if (teacher && !roster.some((r) => r.id === extId(teacher))) {
      roster.unshift({
        id: extId(teacher),
        name:
          teacher.fullName ||
          `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim() ||
          "Instructor",
        age: computeAgeFromDob(teacher.dateOfBirth),
        email: teacher.email || teacher.secondaryEmail || "",
        phone: teacher.phone || "",
        photo: teacher.headshotUrl || null,
        status: "Instructor",
        medical: teacher.medicalNotes || "None",
      });
    }
  }

  return roster;
}

export async function getTeacherApplicantsClientPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const peopleRows = await db
    .select()
    .from(schema.people)
    .where(eq(schema.people.organizationId, org.id));

  const targetRoles = new Set(["Faculty Applicant", "Faculty Interviewing", "Active Faculty"]);
  return peopleRows
    .filter((p) => (p.roles || []).some((r) => targetRoles.has(r)))
    .map((p) => ({
      id: extId(p),
      name: p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Unknown",
      email: p.email || p.secondaryEmail || "",
      status: p.roles || [],
      headshot: p.headshotUrl || null,
      notes: p.editedBio || "",
    }));
}

export async function getVenueLogisticsPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [venueRows, spaceRows, rateRows, classesData] = await Promise.all([
    db.select().from(schema.venues).where(eq(schema.venues.organizationId, org.id)),
    db.select().from(schema.spaces).where(eq(schema.spaces.organizationId, org.id)),
    db.select().from(schema.rentalRates).where(eq(schema.rentalRates.organizationId, org.id)),
    getClassesPg(tenantSlug),
  ]);

  const classesList = classesData || [];

  return venueRows.map((venue) => {
    const activeRate = rateRows.find((r) => r.venueId === venue.id);
    const venueSpaces = spaceRows
      .filter((s) => s.venueId === venue.id)
      .map((space) => {
        const spaceExternalId = extId(space);
        const occupiedBy = classesList.filter((cls) => cls.spaceId === spaceExternalId);
        return {
          id: spaceExternalId,
          name: space.roomName || "Unnamed Room",
          capacity: space.capacity || 0,
          floorType: space.floorType || "Unknown",
          classes: occupiedBy,
        };
      });

    return {
      id: extId(venue),
      name: venue.name || "Unknown Venue",
      type: venue.type || "General",
      contact: venue.contactName || "N/A",
      spaces: venueSpaces,
      rates: {
        hourly: Number(activeRate?.hourlyRate || 0),
        weekend: Number(activeRate?.weekendRate || 0),
        flat: Number(activeRate?.flatRate || 0),
      },
    };
  });
}

// ==============================================================================
// 🎓 EDUCATION MUTATIONS
// ==============================================================================

export async function submitProposalPg(
  tenantSlug: string,
  data: {
    name: string;
    description?: string;
    objectives?: string;
    session?: string;
    teacher?: string;
    type?: string;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  let sessionId: number | null = null;
  if (data.session?.trim()) {
    const [sess] = await db
      .select()
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.organizationId, org.id),
          ilike(schema.sessions.name, data.session.trim())
        )
      )
      .limit(1);
    sessionId = sess?.id ?? null;
  }

  let teacherId: number | null = null;
  if (data.teacher?.trim()) {
    const [person] = await db
      .select()
      .from(schema.people)
      .where(
        and(
          eq(schema.people.organizationId, org.id),
          ilike(schema.people.fullName, data.teacher.trim())
        )
      )
      .limit(1);
    teacherId = person?.id ?? null;
  }

  const [inserted] = await db
    .insert(schema.classes)
    .values({
      organizationId: org.id,
      className: data.name.trim(),
      description: data.description || null,
      objectives: data.objectives || null,
      sessionId,
      teacherId,
      type: data.type || "General",
      status: "Proposed",
    })
    .returning();

  return { success: true as const, id: extId(inserted) };
}

export async function claimBountyPg(
  tenantSlug: string,
  externalClassId: number,
  teacherName: string
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const cls = await resolveClassRow(org.id, externalClassId);
  if (!cls) return { success: false as const, error: "Class not found." };

  const db = getDb();
  const [teacher] = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, org.id),
        ilike(schema.people.fullName, teacherName.trim())
      )
    )
    .limit(1);

  if (!teacher) return { success: false as const, error: "Teacher not found in database" };

  await db
    .update(schema.classes)
    .set({ teacherId: teacher.id, status: "Proposed", updatedAt: new Date() })
    .where(eq(schema.classes.id, cls.id));

  return { success: true as const };
}

export async function updateApplicantStatusPg(
  tenantSlug: string,
  externalPersonId: number,
  oldTags: string[],
  newTag: string
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const person = await resolvePersonRow(org.id, externalPersonId);
  if (!person) return { success: false as const, error: "Person not found." };

  const hiringTags = new Set(["Faculty Applicant", "Faculty Interviewing", "Active Faculty"]);
  const baseTags = Array.isArray(person.roles) && person.roles.length > 0 ? person.roles : oldTags;
  const keptTags = baseTags.filter((t) => !hiringTags.has(t));
  const nextTags = Array.from(new Set([...keptTags, newTag]));

  const db = getDb();
  await db
    .update(schema.people)
    .set({ roles: nextTags, updatedAt: new Date() })
    .where(eq(schema.people.id, person.id));

  return { success: true as const };
}

export async function updateClassSchedulePg(
  tenantSlug: string,
  externalClassId: number,
  payload: { day: string; time: string; location: string; status: string }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const cls = await resolveClassRow(org.id, externalClassId);
  if (!cls) return { success: false as const, error: "Class not found." };

  const db = getDb();
  await db
    .update(schema.classes)
    .set({
      day: payload.day || "",
      timeSlot: payload.time || "",
      location: payload.location || "",
      status: payload.status || cls.status,
      updatedAt: new Date(),
    })
    .where(eq(schema.classes.id, cls.id));

  return { success: true as const };
}

// ==============================================================================
// ✂️ COSTUME MEASUREMENTS & GARMENT INVENTORY (QR / BARCODE)
// ==============================================================================

export interface CastMeasurementRow {
  personId: number;
  name: string;
  role: string;
  height: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  inseam: number | null;
  girth: number | null;
  neck: number | null;
  hatHead: number | null;
  shoeSize: number | null;
  gloveSize: string | null;
  measuredAt: string | null;
}

export async function getCastWithMeasurementsPg(
  tenantSlug: string,
  externalProdId: number
): Promise<CastMeasurementRow[] | null> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return [];

  const db = getDb();
  const [assignmentRows, auditionRows, roleRows] = await Promise.all([
    db
      .select()
      .from(schema.assignments)
      .where(
        and(
          eq(schema.assignments.organizationId, org.id),
          eq(schema.assignments.productionId, prod.id)
        )
      ),
    db
      .select()
      .from(schema.auditions)
      .where(
        and(
          eq(schema.auditions.organizationId, org.id),
          eq(schema.auditions.productionId, prod.id)
        )
      ),
    db
      .select()
      .from(schema.blueprintRoles)
      .where(eq(schema.blueprintRoles.organizationId, org.id)),
  ]);

  const roleMap = new Map(roleRows.map((r) => [r.id, r.roleName]));
  const personRoles = new Map<number, string[]>();

  for (const a of assignmentRows) {
    if (!a.personId) continue;
    const roleName = (a.roleId && roleMap.get(a.roleId)) || "Cast";
    const list = personRoles.get(a.personId) || [];
    if (!list.includes(roleName)) list.push(roleName);
    personRoles.set(a.personId, list);
  }

  for (const aud of auditionRows) {
    if (!aud.performerId) continue;
    if (!personRoles.has(aud.performerId)) {
      personRoles.set(aud.performerId, [aud.status === "Cast" ? "Ensemble" : "Auditionee"]);
    }
  }

  const personIds = Array.from(personRoles.keys());
  if (personIds.length === 0) return [];

  const [peopleRows, measurementRows] = await Promise.all([
    db
      .select()
      .from(schema.people)
      .where(and(eq(schema.people.organizationId, org.id), inArray(schema.people.id, personIds))),
    db
      .select()
      .from(schema.measurements)
      .where(
        and(
          eq(schema.measurements.organizationId, org.id),
          inArray(schema.measurements.personId, personIds)
        )
      )
      .orderBy(desc(schema.measurements.id)),
  ]);

  const latestMeasurementByPerson = new Map<number, (typeof measurementRows)[number]>();
  for (const m of measurementRows) {
    if (m.personId && !latestMeasurementByPerson.has(m.personId)) {
      latestMeasurementByPerson.set(m.personId, m);
    }
  }

  return peopleRows
    .map((person) => {
      const m = latestMeasurementByPerson.get(person.id);
      const roles = personRoles.get(person.id) || ["Ensemble"];
      return {
        personId: extId(person),
        name:
          person.fullName ||
          `${person.firstName || ""} ${person.lastName || ""}`.trim() ||
          "Unknown Actor",
        role: roles.join(", "),
        height: m?.height ?? person.heightInches ?? null,
        chest: m?.chest ?? null,
        waist: m?.waist ?? null,
        hips: m?.hips ?? null,
        inseam: m?.inseam ?? null,
        girth: m?.girth ?? null,
        neck: m?.neck ?? null,
        hatHead: m?.hatHead ?? null,
        shoeSize: m?.shoeSize ?? null,
        gloveSize: m?.gloveSize ?? null,
        measuredAt: m?.measuredAt ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function savePersonMeasurementsPg(
  tenantSlug: string,
  externalPersonId: number,
  data: {
    height?: number | null;
    chest?: number | null;
    waist?: number | null;
    hips?: number | null;
    inseam?: number | null;
    girth?: number | null;
    neck?: number | null;
    hatHead?: number | null;
    shoeSize?: number | null;
    gloveSize?: string | null;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const person = await resolvePersonRow(org.id, externalPersonId);
  if (!person) return { success: false as const, error: "Actor not found." };

  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.measurements)
    .where(
      and(
        eq(schema.measurements.organizationId, org.id),
        eq(schema.measurements.personId, person.id)
      )
    )
    .orderBy(desc(schema.measurements.id))
    .limit(1);

  const today = new Date().toISOString().split("T")[0];
  const payload = {
    measuredAt: today,
    height: data.height ?? null,
    chest: data.chest ?? null,
    waist: data.waist ?? null,
    hips: data.hips ?? null,
    inseam: data.inseam ?? null,
    girth: data.girth ?? null,
    neck: data.neck ?? null,
    hatHead: data.hatHead ?? null,
    shoeSize: data.shoeSize ?? null,
    gloveSize: data.gloveSize ?? null,
  };

  if (existing) {
    await db
      .update(schema.measurements)
      .set(payload)
      .where(eq(schema.measurements.id, existing.id));
  } else {
    await db.insert(schema.measurements).values({
      organizationId: org.id,
      personId: person.id,
      ...payload,
    });
  }

  if (data.height && data.height > 0) {
    await db
      .update(schema.people)
      .set({ heightInches: Math.round(data.height), updatedAt: new Date() })
      .where(eq(schema.people.id, person.id));
  }

  return { success: true as const };
}

export interface GarmentItemRecord {
  id: number;
  sku: string;
  qrCodeValue: string;
  photoUrl: string | null;
  category: string;
  binLocation: string;
  status: string;
  assignedProductionId: number | null;
  assignedProductionTitle: string | null;
  assignedPersonId: number | null;
  assignedPersonName: string | null;
  checkedOutAt: string | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  inseam: number | null;
  girth: number | null;
  neck: number | null;
  hatHead: number | null;
  shoeSize: number | null;
  gloveSize: string | null;
  notes: string;
}

function mapGarmentRow(
  tenantSlug: string,
  row: typeof schema.garmentInventory.$inferSelect,
  lookups?: {
    prodMap?: Map<number, { extId: number; title: string }>;
    personMap?: Map<number, { extId: number; name: string }>;
  }
): GarmentItemRecord {
  const prod = row.assignedProductionId ? lookups?.prodMap?.get(row.assignedProductionId) : null;
  const person = row.assignedPersonId ? lookups?.personMap?.get(row.assignedPersonId) : null;
  return {
    id: extId(row),
    sku: row.sku,
    qrCodeValue: row.qrCodeValue || buildGarmentQrPayload(tenantSlug, row.sku),
    photoUrl: row.photoUrl || null,
    category: row.category || "Costume",
    binLocation: row.binLocation || "",
    status: row.status || "Available",
    assignedProductionId: prod?.extId ?? row.assignedProductionId ?? null,
    assignedProductionTitle: prod?.title ?? null,
    assignedPersonId: person?.extId ?? row.assignedPersonId ?? null,
    assignedPersonName: person?.name ?? null,
    checkedOutAt: row.checkedOutAt ? row.checkedOutAt.toISOString() : null,
    chest: row.chest ?? null,
    waist: row.waist ?? null,
    hips: row.hips ?? null,
    inseam: row.inseam ?? null,
    girth: row.girth ?? null,
    neck: row.neck ?? null,
    hatHead: row.hatHead ?? null,
    shoeSize: row.shoeSize ?? null,
    gloveSize: row.gloveSize ?? null,
    notes: row.notes || "",
  };
}

async function buildAssignmentLookups(
  orgId: number,
  prodIds: number[],
  personIds: number[]
) {
  const db = getDb();
  const uniqueProds = Array.from(new Set(prodIds));
  const uniquePeople = Array.from(new Set(personIds));

  const [prodRows, personRows] = await Promise.all([
    uniqueProds.length > 0
      ? db
          .select({
            id: schema.productions.id,
            baserowId: schema.productions.baserowId,
            title: schema.productions.title,
          })
          .from(schema.productions)
          .where(
            and(
              eq(schema.productions.organizationId, orgId),
              inArray(schema.productions.id, uniqueProds)
            )
          )
      : Promise.resolve([]),
    uniquePeople.length > 0
      ? db
          .select({
            id: schema.people.id,
            baserowId: schema.people.baserowId,
            fullName: schema.people.fullName,
            firstName: schema.people.firstName,
            lastName: schema.people.lastName,
          })
          .from(schema.people)
          .where(
            and(eq(schema.people.organizationId, orgId), inArray(schema.people.id, uniquePeople))
          )
      : Promise.resolve([]),
  ]);

  const prodMap = new Map(
    prodRows.map((p) => [p.id, { extId: p.baserowId ?? p.id, title: p.title }])
  );
  const personMap = new Map(
    personRows.map((p) => [
      p.id,
      {
        extId: p.baserowId ?? p.id,
        name:
          p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || `Person #${p.id}`,
      },
    ])
  );
  return { prodMap, personMap };
}

export async function listGarmentsPg(tenantSlug: string): Promise<GarmentItemRecord[]> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return [];

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.garmentInventory)
    .where(eq(schema.garmentInventory.organizationId, org.id))
    .orderBy(desc(schema.garmentInventory.updatedAt), desc(schema.garmentInventory.id));

  const lookups = await buildAssignmentLookups(
    org.id,
    rows.map((r) => r.assignedProductionId).filter((id): id is number => id != null),
    rows.map((r) => r.assignedPersonId).filter((id): id is number => id != null)
  );

  return rows.map((row) => mapGarmentRow(org.slug, row, lookups));
}

export async function getGarmentBySkuPg(
  tenantSlug: string,
  skuOrQr: string
): Promise<GarmentItemRecord | null> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const raw = (skuOrQr || "").trim();
  if (!raw) return null;

  // Support scanning either raw SKU ("OB-DRES-001") or QR URI ("openbackstage://cytfred/garment/OB-DRES-001")
  const extractedSku = raw.includes("/garment/")
    ? decodeURIComponent(raw.split("/garment/").pop() || "").trim()
    : raw;

  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.garmentInventory)
    .where(
      and(
        eq(schema.garmentInventory.organizationId, org.id),
        or(
          ilike(schema.garmentInventory.sku, extractedSku),
          ilike(schema.garmentInventory.qrCodeValue, raw)
        )
      )
    )
    .limit(1);

  if (!row) return null;
  const lookups = await buildAssignmentLookups(
    org.id,
    row.assignedProductionId ? [row.assignedProductionId] : [],
    row.assignedPersonId ? [row.assignedPersonId] : []
  );
  return mapGarmentRow(org.slug, row, lookups);
}

export async function checkoutGarmentPg(
  tenantSlug: string,
  externalGarmentId: number,
  input: {
    status: string;
    productionId?: number | null;
    personId?: number | null;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.garmentInventory)
    .where(
      and(
        eq(schema.garmentInventory.organizationId, org.id),
        or(
          eq(schema.garmentInventory.baserowId, externalGarmentId),
          eq(schema.garmentInventory.id, externalGarmentId)
        )
      )
    )
    .limit(1);

  if (!existing) return { success: false as const, error: "Garment not found." };

  const prodRow = input.productionId ? await resolveProductionRow(org.id, input.productionId) : null;
  const personRow = input.personId ? await resolvePersonRow(org.id, input.personId) : null;
  const isReturning = input.status === "Available";

  const [updated] = await db
    .update(schema.garmentInventory)
    .set({
      status: input.status,
      assignedProductionId:
        input.productionId !== undefined ? (prodRow?.id ?? null) : existing.assignedProductionId,
      assignedPersonId: isReturning
        ? null
        : input.personId !== undefined
          ? (personRow?.id ?? null)
          : existing.assignedPersonId,
      checkedOutAt: input.status === "Checked Out" ? new Date() : isReturning ? null : existing.checkedOutAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.garmentInventory.id, existing.id))
    .returning();

  const lookups = await buildAssignmentLookups(
    org.id,
    updated.assignedProductionId ? [updated.assignedProductionId] : [],
    updated.assignedPersonId ? [updated.assignedPersonId] : []
  );
  return { success: true as const, item: mapGarmentRow(org.slug, updated, lookups) };
}

export interface UpsertGarmentInput {
  sku?: string;
  category?: string;
  binLocation?: string;
  photoUrl?: string | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  inseam?: number | null;
  girth?: number | null;
  neck?: number | null;
  hatHead?: number | null;
  shoeSize?: number | null;
  gloveSize?: string | null;
  notes?: string;
}

export async function createGarmentPg(tenantSlug: string, input: UpsertGarmentInput) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const existingRows = await db
    .select({ sku: schema.garmentInventory.sku })
    .from(schema.garmentInventory)
    .where(eq(schema.garmentInventory.organizationId, org.id));

  const sku = (input.sku || "").trim().toUpperCase() ||
    generateGarmentSku(input.category, existingRows.map((r) => r.sku));

  if (existingRows.some((r) => r.sku.toUpperCase() === sku)) {
    return { success: false as const, error: `SKU "${sku}" already exists in inventory.` };
  }

  const qrCodeValue = buildGarmentQrPayload(org.slug, sku);

  const [inserted] = await db
    .insert(schema.garmentInventory)
    .values({
      organizationId: org.id,
      sku,
      qrCodeValue,
      photoUrl: input.photoUrl || null,
      category: input.category?.trim() || "Costume",
      binLocation: input.binLocation?.trim() || null,
      chest: input.chest ?? null,
      waist: input.waist ?? null,
      hips: input.hips ?? null,
      inseam: input.inseam ?? null,
      girth: input.girth ?? null,
      neck: input.neck ?? null,
      hatHead: input.hatHead ?? null,
      shoeSize: input.shoeSize ?? null,
      gloveSize: input.gloveSize?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .returning();

  return { success: true as const, item: mapGarmentRow(org.slug, inserted) };
}

export async function updateGarmentPg(
  tenantSlug: string,
  externalId: number,
  input: UpsertGarmentInput
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.garmentInventory)
    .where(
      and(
        eq(schema.garmentInventory.organizationId, org.id),
        or(
          eq(schema.garmentInventory.baserowId, externalId),
          eq(schema.garmentInventory.id, externalId)
        )
      )
    )
    .limit(1);

  if (!existing) return { success: false as const, error: "Garment not found." };

  const nextSku = (input.sku || existing.sku).trim().toUpperCase();
  const qrCodeValue = buildGarmentQrPayload(org.slug, nextSku);

  const [updated] = await db
    .update(schema.garmentInventory)
    .set({
      sku: nextSku,
      qrCodeValue,
      photoUrl: input.photoUrl !== undefined ? input.photoUrl : existing.photoUrl,
      category: input.category !== undefined ? input.category.trim() : existing.category,
      binLocation: input.binLocation !== undefined ? input.binLocation.trim() : existing.binLocation,
      chest: input.chest !== undefined ? input.chest : existing.chest,
      waist: input.waist !== undefined ? input.waist : existing.waist,
      hips: input.hips !== undefined ? input.hips : existing.hips,
      inseam: input.inseam !== undefined ? input.inseam : existing.inseam,
      girth: input.girth !== undefined ? input.girth : existing.girth,
      neck: input.neck !== undefined ? input.neck : existing.neck,
      hatHead: input.hatHead !== undefined ? input.hatHead : existing.hatHead,
      shoeSize: input.shoeSize !== undefined ? input.shoeSize : existing.shoeSize,
      gloveSize: input.gloveSize !== undefined ? input.gloveSize : existing.gloveSize,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.garmentInventory.id, existing.id))
    .returning();

  return { success: true as const, item: mapGarmentRow(org.slug, updated) };
}

export async function deleteGarmentPg(tenantSlug: string, externalId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.garmentInventory)
    .where(
      and(
        eq(schema.garmentInventory.organizationId, org.id),
        or(
          eq(schema.garmentInventory.baserowId, externalId),
          eq(schema.garmentInventory.id, externalId)
        )
      )
    )
    .limit(1);

  if (!existing) return { success: false as const, error: "Garment not found." };

  await db.delete(schema.garmentInventory).where(eq(schema.garmentInventory.id, existing.id));
  return { success: true as const };
}

// ==============================================================================
// 🎛️ TECH EQUIPMENT INVENTORY (SOUND, LIGHTING, STAGE, VIDEO + QR TAGS)
// ==============================================================================

export interface TechEquipmentRecord {
  id: number;
  department: string;
  sku: string;
  qrCodeValue: string;
  name: string;
  modelName: string;
  manufacturer: string;
  category: string;
  serialNumber: string;
  status: string;
  location: string;
  assignedProductionId: number | null;
  assignedProductionTitle: string | null;
  assignedPersonId: number | null;
  assignedPersonName: string | null;
  checkedOutAt: string | null;
  photoUrl: string | null;
  manualUrl: string | null;
  specs: Record<string, unknown>;
  notes: string;
  lastStatusUpdate: string | null;
}

function mapEquipmentRow(
  tenantSlug: string,
  row: typeof schema.techEquipment.$inferSelect,
  lookups?: {
    prodMap?: Map<number, { extId: number; title: string }>;
    personMap?: Map<number, { extId: number; name: string }>;
  }
): TechEquipmentRecord {
  const prod = row.assignedProductionId ? lookups?.prodMap?.get(row.assignedProductionId) : null;
  const person = row.assignedPersonId ? lookups?.personMap?.get(row.assignedPersonId) : null;
  return {
    id: row.id,
    department: row.department || "Sound",
    sku: row.sku,
    qrCodeValue:
      row.qrCodeValue || `openbackstage://${tenantSlug}/equipment/${encodeURIComponent(row.sku)}`,
    name: row.name,
    modelName: row.modelName || "",
    manufacturer: row.manufacturer || "",
    category: row.category || "",
    serialNumber: row.serialNumber || "",
    status: row.status || "Available",
    location: row.location || "",
    assignedProductionId: prod?.extId ?? row.assignedProductionId ?? null,
    assignedProductionTitle: prod?.title ?? null,
    assignedPersonId: person?.extId ?? row.assignedPersonId ?? null,
    assignedPersonName: person?.name ?? null,
    checkedOutAt: row.checkedOutAt ? row.checkedOutAt.toISOString() : null,
    photoUrl: row.photoUrl || null,
    manualUrl: row.manualUrl || null,
    specs: (row.specs || {}) as Record<string, unknown>,
    notes: row.notes || "",
    lastStatusUpdate: row.lastStatusUpdate || null,
  };
}

export async function listEquipmentPg(tenantSlug: string): Promise<TechEquipmentRecord[]> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return [];

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.techEquipment)
    .where(eq(schema.techEquipment.organizationId, org.id))
    .orderBy(asc(schema.techEquipment.department), asc(schema.techEquipment.sku));

  const lookups = await buildAssignmentLookups(
    org.id,
    rows.map((r) => r.assignedProductionId).filter((id): id is number => id != null),
    rows.map((r) => r.assignedPersonId).filter((id): id is number => id != null)
  );

  return rows.map((r) => mapEquipmentRow(org.slug, r, lookups));
}

export async function getEquipmentBySkuPg(
  tenantSlug: string,
  skuOrQr: string
): Promise<TechEquipmentRecord | null> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const raw = (skuOrQr || "").trim();
  if (!raw) return null;

  const extractedSku = raw.includes("/equipment/")
    ? decodeURIComponent(raw.split("/equipment/").pop() || "").trim()
    : raw;

  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.techEquipment)
    .where(
      and(
        eq(schema.techEquipment.organizationId, org.id),
        or(
          ilike(schema.techEquipment.sku, extractedSku),
          ilike(schema.techEquipment.qrCodeValue, raw)
        )
      )
    )
    .limit(1);

  if (!row) return null;
  const lookups = await buildAssignmentLookups(
    org.id,
    row.assignedProductionId ? [row.assignedProductionId] : [],
    row.assignedPersonId ? [row.assignedPersonId] : []
  );
  return mapEquipmentRow(org.slug, row, lookups);
}

export async function getCheckoutPickerOptionsPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { productions: [], people: [] };

  const db = getDb();
  const [prodRows, peopleRows] = await Promise.all([
    db
      .select({
        id: schema.productions.id,
        baserowId: schema.productions.baserowId,
        title: schema.productions.title,
        status: schema.productions.status,
      })
      .from(schema.productions)
      .where(eq(schema.productions.organizationId, org.id))
      .orderBy(desc(schema.productions.id))
      .limit(50),
    db
      .select({
        id: schema.people.id,
        baserowId: schema.people.baserowId,
        fullName: schema.people.fullName,
        firstName: schema.people.firstName,
        lastName: schema.people.lastName,
      })
      .from(schema.people)
      .where(eq(schema.people.organizationId, org.id))
      .orderBy(asc(schema.people.fullName))
      .limit(400),
  ]);

  return {
    productions: prodRows.map((p) => ({
      id: p.baserowId ?? p.id,
      title: p.title,
      status: p.status || "",
    })),
    people: peopleRows.map((p) => ({
      id: p.baserowId ?? p.id,
      name: p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || `Person #${p.id}`,
    })),
  };
}

export interface CreateEquipmentInput {
  department: string;
  sku?: string;
  name: string;
  modelName?: string;
  manufacturer?: string;
  category?: string;
  serialNumber?: string;
  status?: string;
  location?: string;
  photoUrl?: string | null;
  notes?: string;
}

export async function createEquipmentPg(tenantSlug: string, input: CreateEquipmentInput) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const existingRows = await db
    .select({ sku: schema.techEquipment.sku })
    .from(schema.techEquipment)
    .where(eq(schema.techEquipment.organizationId, org.id));

  const dept = (input.department || "Sound").trim();
  const prefix =
    dept.toLowerCase().startsWith("light")
      ? "LGT"
      : dept.toLowerCase().startsWith("sound")
        ? "SND"
        : dept.toLowerCase().startsWith("vid")
          ? "VID"
          : "STG";

  const existingSet = new Set(existingRows.map((r) => r.sku.toUpperCase()));
  let sku = (input.sku || "").trim().toUpperCase();
  if (!sku) {
    for (let i = 1; i <= 9999; i++) {
      const candidate = `${prefix}-${String(i).padStart(3, "0")}`;
      if (!existingSet.has(candidate)) {
        sku = candidate;
        break;
      }
    }
  }
  if (existingSet.has(sku)) {
    return { success: false as const, error: `SKU "${sku}" already exists.` };
  }

  const qrCodeValue = `openbackstage://${org.slug}/equipment/${encodeURIComponent(sku)}`;
  const today = new Date().toISOString().split("T")[0];

  const [inserted] = await db
    .insert(schema.techEquipment)
    .values({
      organizationId: org.id,
      department: dept,
      sku,
      qrCodeValue,
      name: input.name.trim(),
      modelName: input.modelName?.trim() || null,
      manufacturer: input.manufacturer?.trim() || null,
      category: input.category?.trim() || dept,
      serialNumber: input.serialNumber?.trim() || null,
      status: input.status?.trim() || "Available",
      location: input.location?.trim() || "Storage Closet",
      photoUrl: input.photoUrl || null,
      notes: input.notes?.trim() || null,
      lastStatusUpdate: today,
    })
    .returning();

  return { success: true as const, item: mapEquipmentRow(org.slug, inserted) };
}

export async function updateEquipmentStatusPg(
  tenantSlug: string,
  equipmentId: number,
  status: string,
  location?: string,
  assignment?: {
    productionId?: number | null;
    personId?: number | null;
    clearAssignment?: boolean;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  const prodRow =
    assignment?.productionId && assignment.productionId > 0
      ? await resolveProductionRow(org.id, assignment.productionId)
      : null;
  const personRow =
    assignment?.personId && assignment.personId > 0
      ? await resolvePersonRow(org.id, assignment.personId)
      : null;

  const setPatch: Record<string, unknown> = {
    status,
    ...(location !== undefined ? { location: location.trim() } : {}),
    lastStatusUpdate: today,
    updatedAt: new Date(),
  };

  if (assignment?.clearAssignment) {
    setPatch.assignedProductionId = null;
    setPatch.assignedPersonId = null;
    setPatch.checkedOutAt = null;
  } else {
    if (assignment?.productionId !== undefined) {
      setPatch.assignedProductionId = prodRow?.id ?? null;
    }
    if (assignment?.personId !== undefined) {
      setPatch.assignedPersonId = personRow?.id ?? null;
    }
    if (status === "Checked Out") {
      setPatch.checkedOutAt = new Date();
    } else if (status === "Available") {
      setPatch.assignedPersonId = null;
      setPatch.checkedOutAt = null;
    }
  }

  const [updated] = await db
    .update(schema.techEquipment)
    .set(setPatch)
    .where(
      and(
        eq(schema.techEquipment.organizationId, org.id),
        eq(schema.techEquipment.id, equipmentId)
      )
    )
    .returning();

  if (!updated) return { success: false as const, error: "Equipment item not found." };

  const lookups = await buildAssignmentLookups(
    org.id,
    updated.assignedProductionId ? [updated.assignedProductionId] : [],
    updated.assignedPersonId ? [updated.assignedPersonId] : []
  );
  return { success: true as const, item: mapEquipmentRow(org.slug, updated, lookups) };
}

export async function deleteEquipmentPg(tenantSlug: string, equipmentId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  await db
    .delete(schema.techEquipment)
    .where(
      and(
        eq(schema.techEquipment.organizationId, org.id),
        eq(schema.techEquipment.id, equipmentId)
      )
    );
  return { success: true as const };
}
