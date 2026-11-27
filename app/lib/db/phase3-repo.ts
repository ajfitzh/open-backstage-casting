// app/lib/db/phase3-repo.ts
// Phase 3 PostgreSQL repository:
// - Public Academy Class Catalog & Enrollment / Waitlist
// - Venue Reserved Seating Map CRUD (seats table)
// - Printable Avery QR Label Inventory Queries

import { and, asc, eq, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getOrganizationBySlugPg } from "./core-repo";
import { computeClassAvailability, type SeatDraft, type SeatStatus } from "../phase3-helpers";
import type { QrLabelItem } from "../label-pdf";

export async function listPublicClassesPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [classRows, enrollmentRows, peopleRows, spaceRows] = await Promise.all([
    db
      .select()
      .from(schema.classes)
      .where(eq(schema.classes.organizationId, org.id))
      .orderBy(asc(schema.classes.day), asc(schema.classes.className)),
    db
      .select()
      .from(schema.classEnrollments)
      .where(eq(schema.classEnrollments.organizationId, org.id)),
    db
      .select({ id: schema.people.id, fullName: schema.people.fullName })
      .from(schema.people)
      .where(eq(schema.people.organizationId, org.id)),
    db
      .select({ id: schema.spaces.id, roomName: schema.spaces.roomName, capacity: schema.spaces.capacity })
      .from(schema.spaces)
      .where(eq(schema.spaces.organizationId, org.id)),
  ]);

  const teacherMap = new Map(peopleRows.map((p) => [p.id, p.fullName]));
  const spaceMap = new Map(spaceRows.map((s) => [s.id, s]));

  const enrolledCountMap = new Map<number, number>();
  const waitlistCountMap = new Map<number, number>();
  for (const e of enrollmentRows) {
    if (e.status === "waitlisted") {
      waitlistCountMap.set(e.classId, (waitlistCountMap.get(e.classId) || 0) + 1);
    } else if (e.status !== "canceled") {
      enrolledCountMap.set(e.classId, (enrolledCountMap.get(e.classId) || 0) + 1);
    }
  }

  const activeClasses = classRows
    .filter((c) => !c.status || c.status.toLowerCase() === "active" || c.status.toLowerCase() === "open")
    .map((c) => {
      const space = c.spaceId ? spaceMap.get(c.spaceId) : null;
      const cap = c.capacity || space?.capacity || 20;
      const enrolledCount = enrolledCountMap.get(c.id) || 0;
      const waitlistedCount = waitlistCountMap.get(c.id) || 0;
      const availability = computeClassAvailability({
        capacity: cap,
        enrolledCount,
        waitlistEnabled: c.waitlistEnabled,
      });

      return {
        id: c.id,
        className: c.className,
        teacherName: c.teacherId ? teacherMap.get(c.teacherId) || "Faculty TBA" : "Faculty TBA",
        location: c.location || space?.roomName || "Location TBA",
        roomName: space?.roomName || c.location || "Studio TBA",
        day: c.day || "Schedule TBA",
        timeSlot: c.timeSlot || "",
        minAge: c.minAge,
        maxAge: c.maxAge,
        type: c.type || "Academy Class",
        description: c.description || "",
        tuitionCents: c.tuitionCents ?? 0,
        capacity: availability.capacity,
        enrolledCount: availability.enrolledCount,
        waitlistedCount,
        remaining: availability.remaining,
        isFull: availability.isFull,
        canWaitlist: availability.canWaitlist,
      };
    });

  return { org, classes: activeClasses };
}

export async function findOrCreateClassStudentPg(
  tenantSlug: string,
  input: { studentName: string; studentEmail: string; parentEmail?: string }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const cleanEmail = input.studentEmail.trim().toLowerCase();
  const cleanName = input.studentName.trim();
  const parts = cleanName.split(/\s+/);
  const firstName = parts[0] || cleanName;
  const lastName = parts.slice(1).join(" ");

  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.people)
    .where(and(eq(schema.people.organizationId, org.id), eq(schema.people.email, cleanEmail)))
    .limit(1);

  if (existing) return { org, person: existing };

  const [created] = await db
    .insert(schema.people)
    .values({
      organizationId: org.id,
      firstName,
      lastName,
      fullName: cleanName,
      email: cleanEmail,
      familyEmail: input.parentEmail?.trim().toLowerCase() || cleanEmail,
      roles: ["Student"],
    })
    .returning();

  return { org, person: created };
}

export async function enrollStudentInClassPg(
  tenantSlug: string,
  input: {
    classId: number;
    studentId: number;
    status: "enrolled" | "waitlisted";
    paidCents?: number;
    stripeSessionId?: string | null;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const [cls] = await db
    .select()
    .from(schema.classes)
    .where(and(eq(schema.classes.organizationId, org.id), eq(schema.classes.id, input.classId)))
    .limit(1);

  if (!cls) return { success: false as const, error: "Class not found." };

  const [existing] = await db
    .select()
    .from(schema.classEnrollments)
    .where(
      and(
        eq(schema.classEnrollments.organizationId, org.id),
        eq(schema.classEnrollments.classId, cls.id),
        eq(schema.classEnrollments.studentId, input.studentId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(schema.classEnrollments)
      .set({
        status: input.status,
        paidCents: input.paidCents ?? existing.paidCents,
        stripeSessionId: input.stripeSessionId ?? existing.stripeSessionId,
      })
      .where(eq(schema.classEnrollments.id, existing.id));
    return { success: true as const, enrollmentId: existing.id, status: input.status };
  }

  const [created] = await db
    .insert(schema.classEnrollments)
    .values({
      organizationId: org.id,
      classId: cls.id,
      studentId: input.studentId,
      status: input.status,
      paidCents: input.paidCents ?? 0,
      stripeSessionId: input.stripeSessionId ?? null,
    })
    .returning();

  return { success: true as const, enrollmentId: created.id, status: input.status };
}

export async function listVenueSeatsPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { venues: [], seatsByVenue: {} as Record<number, SeatDraft[]> };

  const db = getDb();
  let venueRows = await db
    .select()
    .from(schema.venues)
    .where(eq(schema.venues.organizationId, org.id))
    .orderBy(asc(schema.venues.name));

  if (venueRows.length === 0) {
    const [defaultVenue] = await db
      .insert(schema.venues)
      .values({
        organizationId: org.id,
        name: "Main Stage Theater",
        seatingCapacity: 120,
        type: "Performance Venue",
      })
      .returning();
    venueRows = [defaultVenue];
  }

  const seatRows = await db
    .select()
    .from(schema.seats)
    .where(eq(schema.seats.organizationId, org.id))
    .orderBy(asc(schema.seats.gridY), asc(schema.seats.gridX), asc(schema.seats.seatNumber));

  const seatsByVenue: Record<number, SeatDraft[]> = {};
  for (const v of venueRows) seatsByVenue[v.id] = [];

  for (const s of seatRows) {
    if (!s.venueId) continue;
    if (!seatsByVenue[s.venueId]) seatsByVenue[s.venueId] = [];
    seatsByVenue[s.venueId].push({
      id: s.id,
      section: s.section || "Orchestra",
      rowLabel: s.rowLabel || "A",
      seatNumber: s.seatNumber || 1,
      status: (s.status as SeatStatus) || "available",
      gridX: s.gridX ?? 0,
      gridY: s.gridY ?? 0,
    });
  }

  return {
    venues: venueRows.map((v) => ({
      id: v.id,
      name: v.name,
      seatingCapacity: v.seatingCapacity ?? 0,
    })),
    seatsByVenue,
  };
}

export async function saveVenueSeatsPg(
  tenantSlug: string,
  venueId: number,
  seats: SeatDraft[]
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const [venue] = await db
    .select()
    .from(schema.venues)
    .where(and(eq(schema.venues.organizationId, org.id), eq(schema.venues.id, venueId)))
    .limit(1);

  if (!venue) return { success: false as const, error: "Venue not found." };

  await db
    .delete(schema.seats)
    .where(and(eq(schema.seats.organizationId, org.id), eq(schema.seats.venueId, venue.id)));

  if (seats.length > 0) {
    await db.insert(schema.seats).values(
      seats.map((s) => ({
        organizationId: org.id,
        venueId: venue.id,
        section: s.section || "Orchestra",
        rowLabel: s.rowLabel || "A",
        seatNumber: s.seatNumber,
        status: s.status || "available",
        gridX: s.gridX,
        gridY: s.gridY,
      }))
    );
  }

  const activeCount = seats.filter((s) => s.status !== "blocked").length;
  await db
    .update(schema.venues)
    .set({ seatingCapacity: activeCount, updatedAt: new Date() })
    .where(eq(schema.venues.id, venue.id));

  return { success: true as const, savedCount: seats.length, activeCapacity: activeCount };
}

export async function listInventoryForQrLabelsPg(
  tenantSlug: string,
  type: "garments" | "equipment",
  productionExternalId?: number | null
): Promise<{ orgName: string; items: QrLabelItem[] } | null> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  let internalProdId: number | null = null;
  if (productionExternalId) {
    const [prod] = await db
      .select()
      .from(schema.productions)
      .where(
        and(
          eq(schema.productions.organizationId, org.id),
          or(
            eq(schema.productions.baserowId, productionExternalId),
            eq(schema.productions.id, productionExternalId)
          )
        )
      )
      .limit(1);
    internalProdId = prod?.id ?? null;
  }

  if (type === "garments") {
    const rows = await db
      .select()
      .from(schema.garmentInventory)
      .where(
        internalProdId
          ? and(
              eq(schema.garmentInventory.organizationId, org.id),
              eq(schema.garmentInventory.assignedProductionId, internalProdId)
            )
          : eq(schema.garmentInventory.organizationId, org.id)
      )
      .orderBy(asc(schema.garmentInventory.sku));

    return {
      orgName: org.name,
      items: rows.map((r) => ({
        sku: r.sku,
        title: r.category || "Wardrobe Garment",
        subtitle: r.notes || r.status || "Available",
        location: r.binLocation || "Costume Shop",
        qrValue: r.qrCodeValue || `openbackstage://${org.slug}/garment/${encodeURIComponent(r.sku)}`,
      })),
    };
  }

  const rows = await db
    .select()
    .from(schema.techEquipment)
    .where(
      internalProdId
        ? and(
            eq(schema.techEquipment.organizationId, org.id),
            eq(schema.techEquipment.assignedProductionId, internalProdId)
          )
        : eq(schema.techEquipment.organizationId, org.id)
    )
    .orderBy(asc(schema.techEquipment.sku));

  return {
    orgName: org.name,
    items: rows.map((r) => ({
      sku: r.sku,
      title: r.name,
      subtitle: [r.department, r.modelName].filter(Boolean).join(" • "),
      location: r.location || "Tech Cage",
      qrValue: r.qrCodeValue || `openbackstage://${org.slug}/equipment/${encodeURIComponent(r.sku)}`,
    })),
  };
}
