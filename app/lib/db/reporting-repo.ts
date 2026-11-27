// app/lib/db/reporting-repo.ts
// Neon PostgreSQL repository for Classroom/Space Planning, Venue Rental Rates,
// Production Financial Reports, and Analytics Revenue Enrichment.

import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getOrganizationBySlugPg } from "./core-repo";
import { formatAgeRangeHelper } from "./role-helpers";

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

function sessionSortWeight(name: string): number {
  const yearMatch = name.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
  const lower = name.toLowerCase();
  const term = lower.includes("fall")
    ? 4
    : lower.includes("summer")
      ? 3
      : lower.includes("spring")
        ? 2
        : lower.includes("winter")
          ? 1
          : 0;
  return year * 10 + term;
}

export interface ClassroomVenueItem {
  id: number;
  name: string;
  address: string;
  seatingCapacity: number | null;
  flatRate: number;
  hourlyRate: number;
  weekendRate: number;
}

export interface ClassroomSpaceItem {
  id: number;
  venueId: number | null;
  venueName: string;
  roomName: string;
  capacity: number | null;
  squareFootage: number | null;
  floorType: string;
  isPlaceholder: boolean;
  classCount: number;
}

export interface ClassroomPlannerClass {
  id: number;
  name: string;
  session: string;
  teacher: string;
  location: string;
  spaceId: number | null;
  roomName: string;
  venueId: number | null;
  venueName: string;
  day: string;
  time: string;
  type: string;
  status: string;
  ageRange: string;
  students: number;
  isPlaceholderSpace: boolean;
}

export async function getClassroomPlannerDataPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [venueRows, spaceRows, rateRows, sessionRows, classRows, peopleRows, enrollmentRows] =
    await Promise.all([
      db
        .select()
        .from(schema.venues)
        .where(eq(schema.venues.organizationId, org.id))
        .orderBy(asc(schema.venues.name)),
      db
        .select()
        .from(schema.spaces)
        .where(eq(schema.spaces.organizationId, org.id))
        .orderBy(asc(schema.spaces.roomName)),
      db
        .select()
        .from(schema.rentalRates)
        .where(eq(schema.rentalRates.organizationId, org.id)),
      db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.organizationId, org.id)),
      db
        .select()
        .from(schema.classes)
        .where(eq(schema.classes.organizationId, org.id))
        .orderBy(asc(schema.classes.className)),
      db
        .select({
          id: schema.people.id,
          fullName: schema.people.fullName,
          firstName: schema.people.firstName,
          lastName: schema.people.lastName,
        })
        .from(schema.people)
        .where(eq(schema.people.organizationId, org.id)),
      db
        .select({ classId: schema.classEnrollments.classId })
        .from(schema.classEnrollments)
        .where(eq(schema.classEnrollments.organizationId, org.id)),
    ]);

  const rateByVenue = new Map<number, (typeof rateRows)[number]>();
  for (const r of rateRows) {
    if (r.venueId && !rateByVenue.has(r.venueId)) rateByVenue.set(r.venueId, r);
  }

  const venueMap = new Map(venueRows.map((v) => [v.id, v]));
  const sessionMap = new Map(sessionRows.map((s) => [s.id, s.name]));
  const teacherMap = new Map(
    peopleRows.map((p) => [
      p.id,
      p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || "TBA",
    ])
  );

  const enrollmentCounts = new Map<number, number>();
  for (const e of enrollmentRows) {
    enrollmentCounts.set(e.classId, (enrollmentCounts.get(e.classId) || 0) + 1);
  }

  const spaceClassCounts = new Map<number, number>();
  for (const c of classRows) {
    if (c.spaceId) {
      spaceClassCounts.set(c.spaceId, (spaceClassCounts.get(c.spaceId) || 0) + 1);
    }
  }

  const spaceMap = new Map(spaceRows.map((s) => [s.id, s]));

  const venues: ClassroomVenueItem[] = venueRows.map((v) => {
    const rate = rateByVenue.get(v.id);
    return {
      id: v.id,
      name: v.name,
      address: v.address || "",
      seatingCapacity: v.seatingCapacity ?? null,
      flatRate: Number(rate?.flatRate ?? 0),
      hourlyRate: Number(rate?.hourlyRate ?? 0),
      weekendRate: Number(rate?.weekendRate ?? 0),
    };
  });

  const spaces: ClassroomSpaceItem[] = spaceRows.map((s) => {
    const venue = s.venueId ? venueMap.get(s.venueId) : null;
    const isPlaceholder =
      !s.roomName ||
      s.roomName.trim().toLowerCase() === "unknown" ||
      /^room\s+\d+$/i.test(s.roomName.trim());
    return {
      id: s.id,
      venueId: s.venueId ?? null,
      venueName: venue?.name || "Unassigned Venue",
      roomName: s.roomName || "Unknown",
      capacity: s.capacity ?? null,
      squareFootage: s.squareFootage ?? null,
      floorType: s.floorType || "",
      isPlaceholder,
      classCount: spaceClassCounts.get(s.id) || 0,
    };
  });

  const classes: ClassroomPlannerClass[] = classRows.map((c) => {
    const sp = c.spaceId ? spaceMap.get(c.spaceId) : null;
    const venue = sp?.venueId ? venueMap.get(sp.venueId) : null;
    const isPlaceholderSpace =
      !sp ||
      !sp.roomName ||
      sp.roomName.trim().toLowerCase() === "unknown";

    return {
      id: extId(c),
      name: c.className || "Unnamed Class",
      session: (c.sessionId && sessionMap.get(c.sessionId)) || "Unknown Session",
      teacher: (c.teacherId && teacherMap.get(c.teacherId)) || "TBA",
      location: c.location || "Unspecified Area",
      spaceId: sp?.id ?? null,
      roomName: sp?.roomName || "Unassigned Room",
      venueId: venue?.id ?? null,
      venueName: venue?.name || c.location || "Unassigned Venue",
      day: c.day || "TBD",
      time: c.timeSlot || "TBD",
      type: c.type || "General",
      status: c.status || "Active",
      ageRange: formatAgeRangeHelper(c.minAge, c.maxAge),
      students: enrollmentCounts.get(c.id) || 0,
      isPlaceholderSpace,
    };
  });

  const sessions = Array.from(
    new Set([
      ...sessionRows.map((s) => s.name),
      ...classes.map((c) => c.session).filter((s) => s !== "Unknown Session"),
    ])
  ).sort((a, b) => sessionSortWeight(b) - sessionSortWeight(a));

  return { venues, spaces, sessions, classes };
}

export async function upsertClassroomSpacePg(
  tenantSlug: string,
  input: {
    id?: number | null;
    venueId: number | null;
    roomName: string;
    capacity: number | null;
    squareFootage: number | null;
    floorType?: string | null;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const roomName = (input.roomName || "").trim();
  if (!roomName) return { success: false as const, error: "Room name is required." };

  const db = getDb();
  const payload = {
    venueId: input.venueId && input.venueId > 0 ? input.venueId : null,
    roomName,
    capacity: input.capacity && input.capacity > 0 ? Math.floor(input.capacity) : null,
    squareFootage:
      input.squareFootage && input.squareFootage > 0 ? Math.floor(input.squareFootage) : null,
    floorType: input.floorType?.trim() || null,
    updatedAt: new Date(),
  };

  if (input.id && input.id > 0) {
    const [updated] = await db
      .update(schema.spaces)
      .set(payload)
      .where(
        and(eq(schema.spaces.organizationId, org.id), eq(schema.spaces.id, input.id))
      )
      .returning();
    if (!updated) return { success: false as const, error: "Space not found." };
    return { success: true as const, space: updated };
  }

  const [inserted] = await db
    .insert(schema.spaces)
    .values({
      organizationId: org.id,
      ...payload,
    })
    .returning();

  return { success: true as const, space: inserted };
}

export async function deleteClassroomSpacePg(tenantSlug: string, spaceId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  await db
    .delete(schema.spaces)
    .where(and(eq(schema.spaces.organizationId, org.id), eq(schema.spaces.id, spaceId)));

  return { success: true as const };
}

export async function assignClassSpaceSchedulePg(
  tenantSlug: string,
  externalClassId: number,
  input: {
    spaceId?: number | null;
    day?: string;
    time?: string;
    location?: string;
    status?: string;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const [cls] = await db
    .select()
    .from(schema.classes)
    .where(
      and(
        eq(schema.classes.organizationId, org.id),
        or(eq(schema.classes.baserowId, externalClassId), eq(schema.classes.id, externalClassId))
      )
    )
    .limit(1);

  if (!cls) return { success: false as const, error: "Class not found." };

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.spaceId !== undefined) patch.spaceId = input.spaceId && input.spaceId > 0 ? input.spaceId : null;
  if (input.day !== undefined) patch.day = input.day;
  if (input.time !== undefined) patch.timeSlot = input.time;
  if (input.location !== undefined) patch.location = input.location;
  if (input.status !== undefined) patch.status = input.status;

  await db.update(schema.classes).set(patch).where(eq(schema.classes.id, cls.id));
  return { success: true as const };
}

export async function upsertVenueRentalRatePg(
  tenantSlug: string,
  venueId: number,
  input: {
    flatRate?: number | null;
    hourlyRate?: number | null;
    weekendRate?: number | null;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const [venue] = await db
    .select()
    .from(schema.venues)
    .where(
      and(
        eq(schema.venues.organizationId, org.id),
        or(eq(schema.venues.id, venueId), eq(schema.venues.baserowId, venueId))
      )
    )
    .limit(1);

  if (!venue) return { success: false as const, error: "Venue not found." };

  const [existing] = await db
    .select()
    .from(schema.rentalRates)
    .where(
      and(
        eq(schema.rentalRates.organizationId, org.id),
        eq(schema.rentalRates.venueId, venue.id)
      )
    )
    .limit(1);

  const payload = {
    flatRate: input.flatRate !== undefined ? input.flatRate : (existing?.flatRate ?? null),
    hourlyRate: input.hourlyRate !== undefined ? input.hourlyRate : (existing?.hourlyRate ?? null),
    weekendRate:
      input.weekendRate !== undefined ? input.weekendRate : (existing?.weekendRate ?? null),
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(schema.rentalRates)
      .set(payload)
      .where(eq(schema.rentalRates.id, existing.id));
  } else {
    await db.insert(schema.rentalRates).values({
      organizationId: org.id,
      venueId: venue.id,
      name: `${venue.name} Standard Rate`,
      ...payload,
    });
  }

  return { success: true as const };
}

// ============================================================================
// PRODUCTION FINANCIAL REPORT (/reports)
// ============================================================================

export async function getProductionFinancialReportPg(tenantSlug: string, externalProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return null;

  const db = getDb();
  const [auditionRows, assignmentRows, perfRows, orderRows, allOrgAuditions] = await Promise.all([
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
      .from(schema.assignments)
      .where(
        and(
          eq(schema.assignments.organizationId, org.id),
          eq(schema.assignments.productionId, prod.id)
        )
      ),
    db
      .select()
      .from(schema.performances)
      .where(
        and(
          eq(schema.performances.organizationId, org.id),
          eq(schema.performances.productionId, prod.id)
        )
      ),
    db
      .select()
      .from(schema.ticketOrders)
      .where(
        and(
          eq(schema.ticketOrders.organizationId, org.id),
          eq(schema.ticketOrders.productionId, prod.id)
        )
      )
      .orderBy(desc(schema.ticketOrders.createdAt)),
    db
      .select({
        performerId: schema.auditions.performerId,
        productionId: schema.auditions.productionId,
      })
      .from(schema.auditions)
      .where(eq(schema.auditions.organizationId, org.id)),
  ]);

  const personIds = Array.from(
    new Set([
      ...auditionRows.map((a) => a.performerId).filter((id): id is number => id != null),
      ...assignmentRows.map((a) => a.personId).filter((id): id is number => id != null),
      ...orderRows.map((o) => o.referredByPersonId).filter((id): id is number => id != null),
    ])
  );

  const peopleRows =
    personIds.length > 0
      ? await db
          .select()
          .from(schema.people)
          .where(and(eq(schema.people.organizationId, org.id), inArray(schema.people.id, personIds)))
      : [];

  const personMap = new Map(
    peopleRows.map((p) => [
      p.id,
      {
        extId: extId(p),
        name: p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || `Person #${p.id}`,
        email: p.email || p.secondaryEmail || "",
      },
    ])
  );

  // Track which performers appeared in prior productions for accurate New vs Returning calculation
  const priorShowsByPerson = new Map<number, Set<number>>();
  for (const a of allOrgAuditions) {
    if (!a.performerId || !a.productionId || a.productionId === prod.id) continue;
    const set = priorShowsByPerson.get(a.performerId) || new Set();
    set.add(a.productionId);
    priorShowsByPerson.set(a.performerId, set);
  }

  // Count paid online ticket referrals per cast member
  const paidOrders = orderRows.filter((o) => o.status === "paid");
  const referralTicketsByPerson = new Map<number, { tickets: number; revenueCents: number }>();
  for (const o of paidOrders) {
    if (!o.referredByPersonId) continue;
    const prev = referralTicketsByPerson.get(o.referredByPersonId) || {
      tickets: 0,
      revenueCents: 0,
    };
    prev.tickets += o.quantity;
    prev.revenueCents += o.totalCents;
    referralTicketsByPerson.set(o.referredByPersonId, prev);
  }

  const productionFee = Number(prod.productionFee ?? 0);
  const ticketPrice = Number(prod.ticketPriceStandard ?? 15);

  // Build unified cast financial ledger
  const ledgerMap = new Map<
    number,
    {
      personId: number;
      name: string;
      email: string;
      auditionStatus: string;
      isReturning: boolean;
      feePaid: boolean;
      feeStatus: string;
      ticketsCredited: number;
      ticketRevenueCredited: number;
    }
  >();

  for (const aud of auditionRows) {
    if (!aud.performerId) continue;
    const p = personMap.get(aud.performerId);
    const ref = referralTicketsByPerson.get(aud.performerId);
    const feePaid = Boolean(aud.paidFees || aud.productionFeeStatus === "Paid");
    ledgerMap.set(aud.performerId, {
      personId: p?.extId ?? aud.performerId,
      name: p?.name || `Performer #${aud.performerId}`,
      email: p?.email || "",
      auditionStatus: aud.status || "Auditionee",
      isReturning: (priorShowsByPerson.get(aud.performerId)?.size || 0) > 0,
      feePaid,
      feeStatus: feePaid ? "Paid" : aud.productionFeeStatus || "Unpaid",
      ticketsCredited: ref?.tickets || 0,
      ticketRevenueCredited: (ref?.revenueCents || 0) / 100,
    });
  }

  for (const asg of assignmentRows) {
    if (!asg.personId || ledgerMap.has(asg.personId)) continue;
    const p = personMap.get(asg.personId);
    const ref = referralTicketsByPerson.get(asg.personId);
    ledgerMap.set(asg.personId, {
      personId: p?.extId ?? asg.personId,
      name: p?.name || `Cast #${asg.personId}`,
      email: p?.email || "",
      auditionStatus: "Cast",
      isReturning: (priorShowsByPerson.get(asg.personId)?.size || 0) > 0,
      feePaid: false,
      feeStatus: "Unpaid",
      ticketsCredited: ref?.tickets || 0,
      ticketRevenueCredited: (ref?.revenueCents || 0) / 100,
    });
  }

  const ledger = Array.from(ledgerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const paidCount = ledger.filter((r) => r.feePaid).length;
  const unpaidCount = ledger.length - paidCount;
  const feesCollected = paidCount * productionFee;
  const feesOutstanding = unpaidCount * productionFee;

  const onlineBoxOfficeCents = paidOrders.reduce((acc, o) => acc + o.totalCents, 0);
  const onlineTicketsSold = paidOrders.reduce((acc, o) => acc + o.quantity, 0);
  const totalPerfTicketsSold = perfRows.reduce((acc, p) => acc + Number(p.ticketsSold || 0), 0);
  const totalPerfCapacity = perfRows.reduce((acc, p) => acc + Number(p.totalInventory || 0), 0);
  const estimatedBoxOfficeTotal = Math.max(
    onlineBoxOfficeCents / 100,
    totalPerfTicketsSold * ticketPrice
  );

  return {
    productionTitle: prod.title,
    productionFee,
    ticketPrice,
    summary: {
      totalCast: ledger.length,
      newStudents: ledger.filter((r) => !r.isReturning).length,
      returningStudents: ledger.filter((r) => r.isReturning).length,
      paidCount,
      unpaidCount,
      feesCollected,
      feesOutstanding,
      onlineBoxOfficeRevenue: onlineBoxOfficeCents / 100,
      onlineTicketsSold,
      totalPerfTicketsSold,
      totalPerfCapacity,
      estimatedBoxOfficeTotal,
      combinedProjectedRevenue: feesCollected + estimatedBoxOfficeTotal,
    },
    ledger,
    performances: perfRows.map((p) => ({
      id: p.id,
      label: p.label || p.performanceDate || "Performance",
      date: p.performanceDate || "",
      sold: Number(p.ticketsSold || 0),
      capacity: Number(p.totalInventory || 0),
      price: Number(p.ticketPrice ?? ticketPrice),
    })),
  };
}

// ============================================================================
// ANALYTICS ENRICHMENT (REAL PRICES, ACTUAL STRIPE ORDERS, SAVED VENUE RENTS)
// ============================================================================

export async function getAnalyticsEnrichmentPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [prodRows, perfRows, orderRows, venueRows, rateRows] = await Promise.all([
    db
      .select({
        id: schema.productions.id,
        baserowId: schema.productions.baserowId,
        ticketPriceStandard: schema.productions.ticketPriceStandard,
        productionFee: schema.productions.productionFee,
      })
      .from(schema.productions)
      .where(eq(schema.productions.organizationId, org.id)),
    db
      .select({
        id: schema.performances.id,
        productionId: schema.performances.productionId,
        ticketPrice: schema.performances.ticketPrice,
      })
      .from(schema.performances)
      .where(eq(schema.performances.organizationId, org.id)),
    db
      .select({
        productionId: schema.ticketOrders.productionId,
        totalCents: schema.ticketOrders.totalCents,
        status: schema.ticketOrders.status,
      })
      .from(schema.ticketOrders)
      .where(
        and(
          eq(schema.ticketOrders.organizationId, org.id),
          eq(schema.ticketOrders.status, "paid")
        )
      ),
    db
      .select({
        id: schema.venues.id,
        baserowId: schema.venues.baserowId,
        name: schema.venues.name,
      })
      .from(schema.venues)
      .where(eq(schema.venues.organizationId, org.id)),
    db
      .select()
      .from(schema.rentalRates)
      .where(eq(schema.rentalRates.organizationId, org.id)),
  ]);

  const internalToExtProd = new Map(prodRows.map((p) => [p.id, extId(p)]));
  const priceByExtProd = new Map<number, number>();
  for (const p of prodRows) {
    if (p.ticketPriceStandard && p.ticketPriceStandard > 0) {
      priceByExtProd.set(extId(p), p.ticketPriceStandard);
    }
  }

  const stripeCentsByExtProd = new Map<number, number>();
  for (const o of orderRows) {
    const extProd = internalToExtProd.get(o.productionId) ?? o.productionId;
    stripeCentsByExtProd.set(extProd, (stripeCentsByExtProd.get(extProd) || 0) + o.totalCents);
  }

  const venueNameById = new Map(venueRows.map((v) => [v.id, v.name]));
  const venueIdByName: Record<string, number> = {};
  for (const v of venueRows) {
    venueIdByName[v.name] = v.id;
  }

  const savedRentByVenueName: Record<string, number> = {};
  for (const r of rateRows) {
    if (!r.venueId) continue;
    const vName = venueNameById.get(r.venueId);
    if (vName && r.flatRate != null) {
      savedRentByVenueName[vName] = Number(r.flatRate);
    }
  }

  const perfPriceById = new Map<number, number>();
  for (const p of perfRows) {
    if (p.ticketPrice && p.ticketPrice > 0) perfPriceById.set(p.id, p.ticketPrice);
  }

  return {
    priceByExtProd,
    stripeCentsByExtProd,
    perfPriceById,
    venueIdByName,
    savedRentByVenueName,
  };
}
