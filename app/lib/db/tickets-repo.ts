// app/lib/db/tickets-repo.ts
// Neon PostgreSQL repository for General Admission Performances, Ticket Orders,
// Emailed QR Tickets, and Door Scanner check-in.

import { and, asc, desc, eq, gte, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getOrganizationBySlugPg } from "./core-repo";
import {
  buildTicketQrPayload,
  computeRemainingSeats,
  generateTicketCode,
  parseTicketQrPayload,
} from "@/app/lib/ticketing-helpers";
import {
  formatSeatLabel,
  type PublicSeatAvailability,
  type PublicSeatItem,
} from "@/app/lib/seat-picker-helpers";

function extId(row: { id: number; baserowId?: number | null }): number {
  return row.baserowId ?? row.id;
}

async function resolveProductionRow(orgId: number, externalProdId: number) {
  const db = getDb();
  const [byId] = await db
    .select()
    .from(schema.productions)
    .where(and(eq(schema.productions.organizationId, orgId), eq(schema.productions.id, externalProdId)))
    .limit(1);
  if (byId) return byId;

  const [byBaserow] = await db
    .select()
    .from(schema.productions)
    .where(
      and(
        eq(schema.productions.organizationId, orgId),
        eq(schema.productions.baserowId, externalProdId)
      )
    )
    .limit(1);
  return byBaserow ?? null;
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

export interface PerformanceSummary {
  id: number;
  productionId: number;
  productionTitle: string;
  label: string;
  performanceDate: string;
  doorsOpenAt: string;
  ticketPrice: number;
  salesOpen: boolean;
  totalInventory: number;
  ticketsSold: number;
  remainingSeats: number;
  checkedInCount: number;
}

export async function listPublicBoxOfficePg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [prodRows, perfRows] = await Promise.all([
    db
      .select()
      .from(schema.productions)
      .where(eq(schema.productions.organizationId, org.id))
      .orderBy(desc(schema.productions.id)),
    db
      .select()
      .from(schema.performances)
      .where(eq(schema.performances.organizationId, org.id))
      .orderBy(asc(schema.performances.performanceDate), asc(schema.performances.id)),
  ]);

  const prodMap = new Map(prodRows.map((p) => [p.id, p]));
  const cutoffMs = Date.now() - 12 * 60 * 60 * 1000;
  const openPerfs = perfRows.filter((perf) => {
    if (!perf.salesOpen || !perf.productionId) return false;
    const prod = prodMap.get(perf.productionId);
    if (!prod) return false;
    const status = (prod.status || "").toLowerCase();
    if (status === "archived" || status === "canceled" || status === "cancelled") return false;
    if (perf.performanceDate) {
      const parsed = Date.parse(perf.performanceDate);
      if (Number.isFinite(parsed) && parsed < cutoffMs) return false;
    }
    return true;
  });

  // Group open performances by production
  const grouped = new Map<
    number,
    {
      productionId: number;
      internalProductionId: number;
      title: string;
      location: string;
      image: string | null;
      defaultPrice: number;
      performances: PerformanceSummary[];
    }
  >();

  for (const perf of openPerfs) {
    const prod = prodMap.get(perf.productionId!);
    if (!prod) continue;
    const price = Number(perf.ticketPrice ?? prod.ticketPriceStandard ?? 15);
    const totalInventory = Number(perf.totalInventory ?? 0);
    const ticketsSold = Number(perf.ticketsSold ?? 0);

    if (!grouped.has(prod.id)) {
      grouped.set(prod.id, {
        productionId: prod.id,
        internalProductionId: prod.id,
        title: prod.title,
        location: prod.location || org.name,
        image: prod.showImageUrl || null,
        defaultPrice: Number(prod.ticketPriceStandard ?? 15),
        performances: [],
      });
    }

    grouped.get(prod.id)!.performances.push({
      id: perf.id,
      productionId: prod.id,
      productionTitle: prod.title,
      label: perf.label || "General Admission",
      performanceDate: perf.performanceDate || "",
      doorsOpenAt: perf.doorsOpenAt || "",
      ticketPrice: price,
      salesOpen: perf.salesOpen,
      totalInventory,
      ticketsSold,
      remainingSeats: computeRemainingSeats(totalInventory, ticketsSold),
      checkedInCount: 0,
    });
  }

  // Load cast names for these productions so buyers can optionally credit a student
  const internalProdIds = Array.from(grouped.keys());
  const castByProd = new Map<number, { id: number; name: string }[]>();

  if (internalProdIds.length > 0) {
    const assignmentRows = await db
      .select({
        productionId: schema.assignments.productionId,
        personId: schema.assignments.personId,
      })
      .from(schema.assignments)
      .where(
        and(
          eq(schema.assignments.organizationId, org.id),
          inArray(schema.assignments.productionId, internalProdIds)
        )
      );

    const personIds = Array.from(
      new Set(assignmentRows.map((a) => a.personId).filter((id): id is number => id != null))
    );

    if (personIds.length > 0) {
      const peopleRows = await db
        .select({
          id: schema.people.id,
          baserowId: schema.people.baserowId,
          fullName: schema.people.fullName,
          firstName: schema.people.firstName,
          lastName: schema.people.lastName,
        })
        .from(schema.people)
        .where(and(eq(schema.people.organizationId, org.id), inArray(schema.people.id, personIds)));

      const pMap = new Map(
        peopleRows.map((p) => [
          p.id,
          {
            id: p.baserowId ?? p.id,
            name: p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || `Actor #${p.id}`,
          },
        ])
      );

      for (const a of assignmentRows) {
        if (!a.productionId || !a.personId) continue;
        const person = pMap.get(a.personId);
        if (!person) continue;
        const list = castByProd.get(a.productionId) || [];
        if (!list.some((x) => x.id === person.id)) list.push(person);
        castByProd.set(a.productionId, list);
      }

      for (const list of castByProd.values()) {
        list.sort((a, b) => a.name.localeCompare(b.name));
      }
    }
  }

  const showsList = Array.from(grouped.values())
    .sort((a, b) => {
      const aTime = Date.parse(a.performances[0]?.performanceDate || "") || Number.MAX_SAFE_INTEGER;
      const bTime = Date.parse(b.performances[0]?.performanceDate || "") || Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })
    .map((show) => ({
      productionId: show.productionId,
      title: show.title,
      location: show.location,
      image: show.image,
      defaultPrice: show.defaultPrice,
      performances: show.performances,
      castMembers: castByProd.get(show.internalProductionId) || [],
    }));

  return {
    orgName: org.name,
    orgSlug: org.slug,
    shows: showsList,
  };
}

export async function getBoxOfficeDashboardPg(tenantSlug: string, externalProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return null;

  const db = getDb();
  const [perfRows, orderRows, ticketRows] = await Promise.all([
    db
      .select()
      .from(schema.performances)
      .where(
        and(
          eq(schema.performances.organizationId, org.id),
          eq(schema.performances.productionId, prod.id)
        )
      )
      .orderBy(asc(schema.performances.performanceDate), asc(schema.performances.id)),
    db
      .select()
      .from(schema.ticketOrders)
      .where(
        and(
          eq(schema.ticketOrders.organizationId, org.id),
          eq(schema.ticketOrders.productionId, prod.id)
        )
      )
      .orderBy(desc(schema.ticketOrders.createdAt))
      .limit(100),
    db
      .select({
        performanceId: schema.tickets.performanceId,
        status: schema.tickets.status,
      })
      .from(schema.tickets)
      .where(
        and(
          eq(schema.tickets.organizationId, org.id),
          eq(schema.tickets.productionId, prod.id)
        )
      ),
  ]);

  const checkedInByPerf = new Map<number, number>();
  for (const t of ticketRows) {
    if (t.status === "checked_in") {
      checkedInByPerf.set(t.performanceId, (checkedInByPerf.get(t.performanceId) || 0) + 1);
    }
  }

  const referrerIds = Array.from(
    new Set(orderRows.map((o) => o.referredByPersonId).filter((id): id is number => id != null))
  );
  const referrerMap = new Map<number, string>();
  if (referrerIds.length > 0) {
    const peopleRows = await db
      .select({
        id: schema.people.id,
        fullName: schema.people.fullName,
        firstName: schema.people.firstName,
        lastName: schema.people.lastName,
      })
      .from(schema.people)
      .where(and(eq(schema.people.organizationId, org.id), inArray(schema.people.id, referrerIds)));

    for (const p of peopleRows) {
      referrerMap.set(
        p.id,
        p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || `Actor #${p.id}`
      );
    }
  }

  const perfLabelMap = new Map(perfRows.map((p) => [p.id, p.label || p.performanceDate || "Performance"]));

  const performances: PerformanceSummary[] = perfRows.map((perf) => {
    const totalInventory = Number(perf.totalInventory ?? 0);
    const ticketsSold = Number(perf.ticketsSold ?? 0);
    return {
      id: perf.id,
      productionId: prod.id,
      productionTitle: prod.title,
      label: perf.label || "General Admission",
      performanceDate: perf.performanceDate || "",
      doorsOpenAt: perf.doorsOpenAt || "",
      ticketPrice: Number(perf.ticketPrice ?? prod.ticketPriceStandard ?? 15),
      salesOpen: perf.salesOpen,
      totalInventory,
      ticketsSold,
      remainingSeats: computeRemainingSeats(totalInventory, ticketsSold),
      checkedInCount: checkedInByPerf.get(perf.id) || 0,
    };
  });

  const paidOrders = orderRows.filter((o) => o.status === "paid");
  const orderRevenueCents = paidOrders.reduce((acc, o) => acc + o.totalCents, 0);
  const paidQtyByPerf = new Map<number, number>();
  for (const o of paidOrders) {
    paidQtyByPerf.set(o.performanceId, (paidQtyByPerf.get(o.performanceId) || 0) + o.quantity);
  }

  let externalTicketsSold = 0;
  let estimatedExternalRevenueCents = 0;
  for (const perf of performances) {
    const paidQty = paidQtyByPerf.get(perf.id) || 0;
    const unlinkedSold = Math.max(0, perf.ticketsSold - paidQty);
    if (unlinkedSold > 0) {
      externalTicketsSold += unlinkedSold;
      estimatedExternalRevenueCents += Math.round(unlinkedSold * perf.ticketPrice * 100);
    }
  }

  const grossRevenueCents = orderRevenueCents + estimatedExternalRevenueCents;
  const totalTicketsSold = performances.reduce((acc, p) => acc + p.ticketsSold, 0);
  const totalCheckedIn = performances.reduce((acc, p) => acc + p.checkedInCount, 0);

  return {
    orgName: org.name,
    productionId: prod.id,
    productionTitle: prod.title,
    venueId: prod.venueId ?? null,
    venueName: prod.location || null,
    defaultTicketPrice: Number(prod.ticketPriceStandard ?? 15),
    performances,
    stats: {
      totalTicketsSold,
      totalCheckedIn,
      grossRevenueCents,
      orderRevenueCents,
      estimatedExternalRevenueCents,
      externalTicketsSold,
      paidOrderCount: paidOrders.length,
    },
    orders: orderRows.map((o) => ({
      id: o.id,
      performanceId: o.performanceId,
      performanceLabel: perfLabelMap.get(o.performanceId) || "Performance",
      buyerName: o.buyerName,
      buyerEmail: o.buyerEmail,
      quantity: o.quantity,
      totalCents: o.totalCents,
      status: o.status,
      creditedActor: o.referredByPersonId ? referrerMap.get(o.referredByPersonId) || null : null,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}

export async function createPerformancePg(
  tenantSlug: string,
  externalProdId: number,
  input: {
    label: string;
    performanceDate: string;
    doorsOpenAt?: string;
    totalInventory: number;
    ticketPrice: number;
    salesOpen?: boolean;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return { success: false as const, error: "Production not found." };

  const db = getDb();
  const [inserted] = await db
    .insert(schema.performances)
    .values({
      organizationId: org.id,
      productionId: prod.id,
      label: input.label.trim() || "Evening Performance",
      performanceDate: input.performanceDate.trim(),
      doorsOpenAt: input.doorsOpenAt?.trim() || null,
      totalInventory: Math.max(1, Math.floor(input.totalInventory)),
      ticketPrice: Math.max(1, Number(input.ticketPrice)),
      salesOpen: input.salesOpen ?? true,
      ticketsSold: 0,
    })
    .returning();

  return {
    success: true as const,
    performance: {
      id: inserted.id,
      productionId: prod.id,
      productionTitle: prod.title,
      label: inserted.label || "General Admission",
      performanceDate: inserted.performanceDate || "",
      doorsOpenAt: inserted.doorsOpenAt || "",
      ticketPrice: Number(inserted.ticketPrice ?? prod.ticketPriceStandard ?? 15),
      salesOpen: inserted.salesOpen,
      totalInventory: Number(inserted.totalInventory ?? 0),
      ticketsSold: Number(inserted.ticketsSold ?? 0),
      remainingSeats: computeRemainingSeats(inserted.totalInventory, inserted.ticketsSold),
      checkedInCount: 0,
    } satisfies PerformanceSummary,
  };
}

export async function updatePerformancePg(
  tenantSlug: string,
  performanceId: number,
  patch: {
    salesOpen?: boolean;
    totalInventory?: number;
    ticketPrice?: number;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const [updated] = await db
    .update(schema.performances)
    .set({
      ...(patch.salesOpen !== undefined ? { salesOpen: patch.salesOpen } : {}),
      ...(patch.totalInventory !== undefined
        ? { totalInventory: Math.max(0, Math.floor(patch.totalInventory)) }
        : {}),
      ...(patch.ticketPrice !== undefined ? { ticketPrice: Math.max(1, Number(patch.ticketPrice)) } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.performances.organizationId, org.id),
        eq(schema.performances.id, performanceId)
      )
    )
    .returning();

  if (!updated) return { success: false as const, error: "Performance not found." };
  return { success: true as const, performance: updated };
}

export async function getPerformanceForCheckoutPg(tenantSlug: string, performanceId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [perf] = await db
    .select()
    .from(schema.performances)
    .where(
      and(
        eq(schema.performances.organizationId, org.id),
        eq(schema.performances.id, performanceId)
      )
    )
    .limit(1);

  if (!perf || !perf.productionId) return null;

  const [prod] = await db
    .select()
    .from(schema.productions)
    .where(
      and(
        eq(schema.productions.organizationId, org.id),
        eq(schema.productions.id, perf.productionId)
      )
    )
    .limit(1);

  if (!prod) return null;

  return {
    org,
    production: prod,
    performance: perf,
    unitPriceDollars: Number(perf.ticketPrice ?? prod.ticketPriceStandard ?? 15),
    remainingSeats: computeRemainingSeats(perf.totalInventory, perf.ticketsSold),
  };
}

export async function getPerformanceSeatingMapPg(tenantSlug: string, performanceId: number) {
  const ctx = await getPerformanceForCheckoutPg(tenantSlug, performanceId);
  if (!ctx) return null;

  const db = getDb();
  const venueId = ctx.production.venueId;
  if (!venueId) {
    return {
      hasSeatingMap: false,
      venueId: null,
      venueName: ctx.production.location || ctx.org.name,
      seats: [] as PublicSeatItem[],
    };
  }

  const [venueRow] = await db
    .select({ id: schema.venues.id, name: schema.venues.name })
    .from(schema.venues)
    .where(and(eq(schema.venues.organizationId, ctx.org.id), eq(schema.venues.id, venueId)))
    .limit(1);

  const seatRows = await db
    .select()
    .from(schema.seats)
    .where(and(eq(schema.seats.organizationId, ctx.org.id), eq(schema.seats.venueId, venueId)))
    .orderBy(asc(schema.seats.section), asc(schema.seats.rowLabel), asc(schema.seats.seatNumber));

  if (seatRows.length === 0) {
    return {
      hasSeatingMap: false,
      venueId,
      venueName: venueRow?.name || ctx.production.location || ctx.org.name,
      seats: [] as PublicSeatItem[],
    };
  }

  // Sold / active tickets for this performance
  const takenTicketRows = await db
    .select({ seatId: schema.tickets.seatId })
    .from(schema.tickets)
    .where(
      and(
        eq(schema.tickets.organizationId, ctx.org.id),
        eq(schema.tickets.performanceId, ctx.performance.id),
        isNotNull(schema.tickets.seatId),
        ne(schema.tickets.status, "void")
      )
    );

  // Recent pending checkout holds (15 minutes) so two buyers don't race for the same seat
  const holdCutoff = new Date(Date.now() - 15 * 60 * 1000);
  const pendingHoldRows = await db
    .select({ seatIds: schema.ticketOrders.seatIds })
    .from(schema.ticketOrders)
    .where(
      and(
        eq(schema.ticketOrders.organizationId, ctx.org.id),
        eq(schema.ticketOrders.performanceId, ctx.performance.id),
        eq(schema.ticketOrders.status, "pending"),
        gte(schema.ticketOrders.createdAt, holdCutoff)
      )
    );

  const takenSeatIds = new Set<number>();
  for (const r of takenTicketRows) {
    if (r.seatId) takenSeatIds.add(r.seatId);
  }
  for (const o of pendingHoldRows) {
    for (const sid of o.seatIds || []) {
      takenSeatIds.add(sid);
    }
  }

  const seats: PublicSeatItem[] = seatRows.map((s) => {
    let availability: PublicSeatAvailability = "available";
    const rawStatus = (s.status || "available").toLowerCase();
    if (takenSeatIds.has(s.id)) {
      availability = "taken";
    } else if (rawStatus === "house_hold" || rawStatus === "unavailable" || rawStatus === "held") {
      availability = "held";
    } else if (rawStatus === "ada") {
      availability = "ada";
    }

    return {
      id: s.id,
      section: s.section || "Main",
      rowLabel: s.rowLabel || "A",
      seatNumber: s.seatNumber ?? 1,
      availability,
      gridX: s.gridX ?? null,
      gridY: s.gridY ?? null,
    };
  });

  return {
    hasSeatingMap: true,
    venueId,
    venueName: venueRow?.name || ctx.production.location || ctx.org.name,
    seats,
  };
}

export async function createPendingTicketOrderPg(input: {
  organizationId: number;
  productionId: number;
  performanceId: number;
  referredByExternalPersonId?: number | null;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  seatIds?: number[];
}) {
  const db = getDb();
  let internalPersonId: number | null = null;
  if (input.referredByExternalPersonId && input.referredByExternalPersonId > 0) {
    const person = await resolvePersonRow(input.organizationId, input.referredByExternalPersonId);
    internalPersonId = person?.id ?? null;
  }

  const [order] = await db
    .insert(schema.ticketOrders)
    .values({
      organizationId: input.organizationId,
      productionId: input.productionId,
      performanceId: input.performanceId,
      referredByPersonId: internalPersonId,
      buyerName: input.buyerName,
      buyerEmail: input.buyerEmail,
      quantity: input.quantity,
      unitPriceCents: input.unitPriceCents,
      totalCents: input.totalCents,
      seatIds: input.seatIds && input.seatIds.length > 0 ? input.seatIds : [],
      status: "pending",
    })
    .returning();

  return order;
}

export async function attachStripeSessionToOrderPg(orderId: number, stripeSessionId: string) {
  const db = getDb();
  await db
    .update(schema.ticketOrders)
    .set({ stripeSessionId, updatedAt: new Date() })
    .where(eq(schema.ticketOrders.id, orderId));
}

export async function fulfillTicketOrderPg(
  tenantSlug: string,
  orderId: number,
  paymentIntentId?: string | null
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const [order] = await db
    .select()
    .from(schema.ticketOrders)
    .where(
      and(
        eq(schema.ticketOrders.organizationId, org.id),
        eq(schema.ticketOrders.id, orderId)
      )
    )
    .limit(1);

  if (!order) return { success: false as const, error: "Ticket order not found." };

  const [prodRows, perfRows] = await Promise.all([
    db
      .select()
      .from(schema.productions)
      .where(eq(schema.productions.id, order.productionId))
      .limit(1),
    db
      .select()
      .from(schema.performances)
      .where(eq(schema.performances.id, order.performanceId))
      .limit(1),
  ]);

  const prod = prodRows[0];
  const perf = perfRows[0];

  // Idempotent guard: atomically transition pending -> paid so concurrent webhook + return page never double-mint tickets.
  const updatedOrders = await db
    .update(schema.ticketOrders)
    .set({
      status: "paid",
      stripePaymentIntentId: paymentIntentId ?? order.stripePaymentIntentId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.ticketOrders.id, order.id),
        eq(schema.ticketOrders.status, "pending")
      )
    )
    .returning();

  let alreadyFulfilled = updatedOrders.length === 0;

  if (!alreadyFulfilled) {
    // Increment sold count on the performance
    await db
      .update(schema.performances)
      .set({
        ticketsSold: sql`COALESCE(${schema.performances.ticketsSold}, 0) + ${order.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.performances.id, order.performanceId));

    // Resolve reserved seat metadata if this order includes specific seat IDs
    const orderSeatIds = Array.isArray(order.seatIds) ? order.seatIds : [];
    const seatById = new Map<number, { id: number; label: string }>();
    if (orderSeatIds.length > 0) {
      const seatRows = await db
        .select()
        .from(schema.seats)
        .where(
          and(
            eq(schema.seats.organizationId, org.id),
            inArray(schema.seats.id, orderSeatIds)
          )
        );
      for (const s of seatRows) {
        seatById.set(s.id, { id: s.id, label: formatSeatLabel(s) });
      }
    }

    // Mint individual QR tickets
    const ticketRowsToInsert = Array.from({ length: order.quantity }, (_, idx) => {
      const code = generateTicketCode();
      const seatInfo = orderSeatIds[idx] ? seatById.get(orderSeatIds[idx]) : undefined;
      const baseHolder =
        order.quantity > 1
          ? `${order.buyerName} (Ticket ${idx + 1} of ${order.quantity})`
          : order.buyerName;
      return {
        organizationId: org.id,
        orderId: order.id,
        productionId: order.productionId,
        performanceId: order.performanceId,
        code,
        qrCodeValue: buildTicketQrPayload(org.slug, code),
        seatId: seatInfo?.id ?? null,
        seatLabel: seatInfo?.label ?? null,
        holderName: seatInfo ? `${baseHolder} • ${seatInfo.label}` : baseHolder,
        status: "valid",
      };
    });

    await db.insert(schema.tickets).values(ticketRowsToInsert);
  }

  const mintedTickets = await db
    .select()
    .from(schema.tickets)
    .where(
      and(
        eq(schema.tickets.organizationId, org.id),
        eq(schema.tickets.orderId, order.id)
      )
    )
    .orderBy(asc(schema.tickets.id));

  return {
    success: true as const,
    alreadyFulfilled,
    orgName: org.name,
    orgSlug: org.slug,
    order: { ...order, status: "paid" },
    productionTitle: prod?.title || "Production",
    productionLocation: prod?.location || org.name,
    performanceLabel: perf?.label || "General Admission",
    performanceDate: perf?.performanceDate || "",
    tickets: mintedTickets,
  };
}

export async function markTicketOrderEmailSentPg(orderId: number) {
  const db = getDb();
  await db
    .update(schema.ticketOrders)
    .set({ emailSentAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.ticketOrders.id, orderId));
}

export async function getTicketOrderBySessionIdPg(tenantSlug: string, stripeSessionId: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [order] = await db
    .select()
    .from(schema.ticketOrders)
    .where(
      and(
        eq(schema.ticketOrders.organizationId, org.id),
        eq(schema.ticketOrders.stripeSessionId, stripeSessionId)
      )
    )
    .limit(1);

  if (!order) return null;

  const [prodRows, perfRows, ticketRows] = await Promise.all([
    db.select().from(schema.productions).where(eq(schema.productions.id, order.productionId)).limit(1),
    db.select().from(schema.performances).where(eq(schema.performances.id, order.performanceId)).limit(1),
    db
      .select()
      .from(schema.tickets)
      .where(
        and(eq(schema.tickets.organizationId, org.id), eq(schema.tickets.orderId, order.id))
      )
      .orderBy(asc(schema.tickets.id)),
  ]);

  return {
    orgName: org.name,
    orgSlug: org.slug,
    order,
    productionTitle: prodRows[0]?.title || "Production",
    productionLocation: prodRows[0]?.location || org.name,
    performanceLabel: perfRows[0]?.label || "General Admission",
    performanceDate: perfRows[0]?.performanceDate || "",
    tickets: ticketRows,
  };
}

export async function scanTicketAtDoorPg(
  tenantSlug: string,
  codeOrQr: string,
  scannedBy: string,
  expectedPerformanceId?: number | null
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { outcome: "invalid" as const, message: "Organization not found." };

  const parsed = parseTicketQrPayload(codeOrQr);
  const lookupCode = parsed?.code || (codeOrQr || "").trim().toUpperCase();
  if (!lookupCode) return { outcome: "invalid" as const, message: "Empty ticket code." };

  const db = getDb();
  const [ticket] = await db
    .select()
    .from(schema.tickets)
    .where(
      and(
        eq(schema.tickets.organizationId, org.id),
        or(eq(schema.tickets.code, lookupCode), eq(schema.tickets.qrCodeValue, codeOrQr.trim()))
      )
    )
    .limit(1);

  if (!ticket) {
    return {
      outcome: "invalid" as const,
      message: `No valid ticket found for code "${lookupCode}".`,
    };
  }

  const [perfRows, prodRows] = await Promise.all([
    db.select().from(schema.performances).where(eq(schema.performances.id, ticket.performanceId)).limit(1),
    db.select().from(schema.productions).where(eq(schema.productions.id, ticket.productionId)).limit(1),
  ]);

  const perfLabel = perfRows[0]?.label || perfRows[0]?.performanceDate || "Performance";
  const prodTitle = prodRows[0]?.title || "Production";

  if (expectedPerformanceId && ticket.performanceId !== expectedPerformanceId) {
    return {
      outcome: "wrong_performance" as const,
      message: `Wrong showtime! This ticket is for ${prodTitle} — ${perfLabel}.`,
      ticket: {
        code: ticket.code,
        holderName: ticket.holderName || "Guest",
        performanceLabel: perfLabel,
        productionTitle: prodTitle,
      },
    };
  }

  if (ticket.status === "void") {
    return {
      outcome: "invalid" as const,
      message: `Ticket ${ticket.code} has been voided.`,
    };
  }

  if (ticket.status === "checked_in") {
    return {
      outcome: "already_scanned" as const,
      message: `ALREADY SCANNED at ${ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString() : "earlier"} (${ticket.holderName || "Guest"}).`,
      ticket: {
        code: ticket.code,
        holderName: ticket.holderName || "Guest",
        performanceLabel: perfLabel,
        productionTitle: prodTitle,
        checkedInAt: ticket.checkedInAt ? ticket.checkedInAt.toISOString() : null,
      },
    };
  }

  const now = new Date();
  await db
    .update(schema.tickets)
    .set({
      status: "checked_in",
      checkedInAt: now,
      checkedInBy: scannedBy,
    })
    .where(eq(schema.tickets.id, ticket.id));

  return {
    outcome: "admitted" as const,
    message: `ADMITTED: ${ticket.holderName || "Guest"} (${perfLabel})`,
    ticket: {
      code: ticket.code,
      holderName: ticket.holderName || "Guest",
      performanceLabel: perfLabel,
      productionTitle: prodTitle,
      checkedInAt: now.toISOString(),
    },
  };
}
