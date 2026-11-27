// app/lib/db/phase2-repo.ts
// Phase 2 PostgreSQL repository:
// - Walk-up Door Ticket Sales (Cash / Card Terminal / Comp)
// - Order Cancellation/Refund + Ticket Capacity Restoration
// - Promo / Comp Codes CRUD & Validation
// - Cast Track ("All" | "Cast A" | "Cast B" | "Understudy") Updates
// - Family Self-Service Conflict Submission

import { and, desc, eq, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getOrganizationBySlugPg } from "./core-repo";
import { buildTicketQrPayload, generateTicketCode } from "../ticketing-helpers";
import {
  applyPromoCodeDiscount,
  normalizeCastTrack,
  normalizePromoCode,
  type PromoDiscountType,
} from "../phase2-helpers";

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

async function resolvePerformance(orgId: number, externalId: number) {
  const db = getDb();
  const [perf] = await db
    .select()
    .from(schema.performances)
    .where(
      and(
        eq(schema.performances.organizationId, orgId),
        or(eq(schema.performances.baserowId, externalId), eq(schema.performances.id, externalId))
      )
    )
    .limit(1);
  return perf ?? null;
}

export async function sellDoorTicketsPg(
  tenantSlug: string,
  performanceId: number,
  input: {
    buyerName: string;
    buyerEmail?: string;
    quantity: number;
    paymentMethod: "cash" | "comp" | "card_terminal";
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const perf = await resolvePerformance(org.id, performanceId);
  if (!perf || !perf.productionId) {
    return { success: false as const, error: "Performance not found." };
  }

  const qty = Math.max(1, Math.min(25, Math.floor(Number(input.quantity) || 1)));
  const remaining = Math.max(0, (perf.totalInventory ?? 0) - (perf.ticketsSold ?? 0));
  if (perf.totalInventory && perf.totalInventory > 0 && qty > remaining) {
    return {
      success: false as const,
      error: `Only ${remaining} seat(s) remaining for this performance.`,
    };
  }

  const buyerName = (input.buyerName || "Walk-Up Guest").trim();
  const buyerEmail = (input.buyerEmail || "walkup@boxoffice.local").trim().toLowerCase();
  const unitCents =
    input.paymentMethod === "comp" ? 0 : Math.round((perf.ticketPrice ?? 15) * 100);
  const totalCents = unitCents * qty;

  const db = getDb();
  const [order] = await db
    .insert(schema.ticketOrders)
    .values({
      organizationId: org.id,
      productionId: perf.productionId,
      performanceId: perf.id,
      buyerName,
      buyerEmail,
      quantity: qty,
      unitPriceCents: unitCents,
      totalCents,
      status: input.paymentMethod === "comp" ? "comp" : "paid",
      stripeSessionId: `door_${input.paymentMethod}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    })
    .returning();

  const createdTickets = [];
  for (let i = 0; i < qty; i++) {
    const code = generateTicketCode();
    const [t] = await db
      .insert(schema.tickets)
      .values({
        organizationId: org.id,
        productionId: perf.productionId,
        orderId: order.id,
        performanceId: perf.id,
        code,
        qrCodeValue: buildTicketQrPayload(org.slug, code),
        holderName: buyerName,
        status: "valid",
      })
      .returning();
    createdTickets.push(t);
  }

  await db
    .update(schema.performances)
    .set({
      ticketsSold: sql`coalesce(${schema.performances.ticketsSold}, 0) + ${qty}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.performances.id, perf.id));

  return {
    success: true as const,
    orderId: order.id,
    totalCents,
    performanceLabel: perf.label || "Performance",
    performanceDate: perf.performanceDate || "",
    orgName: org.name,
    tickets: createdTickets.map((t) => ({ id: t.id, code: t.code })),
  };
}

export async function cancelTicketOrderPg(tenantSlug: string, orderId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const [order] = await db
    .select()
    .from(schema.ticketOrders)
    .where(
      and(eq(schema.ticketOrders.organizationId, org.id), eq(schema.ticketOrders.id, orderId))
    )
    .limit(1);

  if (!order) return { success: false as const, error: "Order not found." };
  if (order.status === "refunded" || order.status === "canceled") {
    return { success: false as const, error: "Order is already canceled/refunded." };
  }

  await db
    .update(schema.ticketOrders)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(eq(schema.ticketOrders.id, order.id));

  await db
    .update(schema.tickets)
    .set({ status: "void" })
    .where(
      and(eq(schema.tickets.organizationId, org.id), eq(schema.tickets.orderId, order.id))
    );

  await db
    .update(schema.performances)
    .set({
      ticketsSold: sql`greatest(0, coalesce(${schema.performances.ticketsSold}, 0) - ${order.quantity})`,
      updatedAt: new Date(),
    })
    .where(eq(schema.performances.id, order.performanceId));

  return { success: true as const, restoredSeats: order.quantity };
}

export async function getOrderForResendPg(tenantSlug: string, orderId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [order] = await db
    .select()
    .from(schema.ticketOrders)
    .where(
      and(eq(schema.ticketOrders.organizationId, org.id), eq(schema.ticketOrders.id, orderId))
    )
    .limit(1);
  if (!order) return null;

  const [perf, prod, ticketRows] = await Promise.all([
    db
      .select()
      .from(schema.performances)
      .where(eq(schema.performances.id, order.performanceId))
      .limit(1),
    db
      .select()
      .from(schema.productions)
      .where(eq(schema.productions.id, order.productionId))
      .limit(1),
    db
      .select()
      .from(schema.tickets)
      .where(
        and(eq(schema.tickets.organizationId, org.id), eq(schema.tickets.orderId, order.id))
      ),
  ]);

  return {
    orgName: org.name,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    productionTitle: prod[0]?.title || "Production",
    performanceLabel: perf[0]?.label || "Performance",
    performanceDate: perf[0]?.performanceDate || "",
    codes: ticketRows.filter((t) => t.status !== "void").map((t) => t.code),
  };
}

export async function listPromoCodesPg(tenantSlug: string, productionId?: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return [];

  const db = getDb();
  let internalProdId: number | null = null;
  if (productionId) {
    const prod = await resolveProduction(org.id, productionId);
    internalProdId = prod?.id ?? null;
  }

  const rows = await db
    .select()
    .from(schema.promoCodes)
    .where(
      internalProdId
        ? and(
            eq(schema.promoCodes.organizationId, org.id),
            or(
              eq(schema.promoCodes.productionId, internalProdId),
              sql`${schema.promoCodes.productionId} is null`
            )
          )
        : eq(schema.promoCodes.organizationId, org.id)
    )
    .orderBy(desc(schema.promoCodes.createdAt));

  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    discountType: r.discountType as PromoDiscountType,
    discountValue: r.discountValue,
    maxUses: r.maxUses,
    currentUses: r.currentUses,
    active: r.active,
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
  }));
}

export async function createPromoCodePg(
  tenantSlug: string,
  input: {
    productionId?: number | null;
    code: string;
    discountType: PromoDiscountType;
    discountValue: number;
    maxUses?: number | null;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const code = normalizePromoCode(input.code);
  if (code.length < 3) {
    return { success: false as const, error: "Promo code must be at least 3 characters." };
  }

  let internalProdId: number | null = null;
  if (input.productionId) {
    const prod = await resolveProduction(org.id, input.productionId);
    internalProdId = prod?.id ?? null;
  }

  const db = getDb();
  try {
    const [created] = await db
      .insert(schema.promoCodes)
      .values({
        organizationId: org.id,
        productionId: internalProdId,
        code,
        discountType: input.discountType,
        discountValue: input.discountType === "comp" ? 100 : Math.max(0, Number(input.discountValue || 0)),
        maxUses: input.maxUses && input.maxUses > 0 ? Math.floor(input.maxUses) : null,
        active: true,
      })
      .returning();

    return {
      success: true as const,
      promo: {
        id: created.id,
        code: created.code,
        discountType: created.discountType as PromoDiscountType,
        discountValue: created.discountValue,
        maxUses: created.maxUses,
        currentUses: created.currentUses,
        active: created.active,
        expiresAt: created.expiresAt ? created.expiresAt.toISOString() : null,
      },
    };
  } catch (err: any) {
    if (String(err?.message || "").toLowerCase().includes("unique")) {
      return { success: false as const, error: `Promo code "${code}" already exists.` };
    }
    return { success: false as const, error: "Could not create promo code." };
  }
}

export async function togglePromoCodePg(tenantSlug: string, promoId: number, active: boolean) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  await db
    .update(schema.promoCodes)
    .set({ active })
    .where(and(eq(schema.promoCodes.organizationId, org.id), eq(schema.promoCodes.id, promoId)));
  return { success: true as const };
}

export async function validatePromoCodePg(
  tenantSlug: string,
  rawCode: string,
  unitPriceCents: number,
  quantity: number
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { ok: false as const, error: "Organization not found." };

  const code = normalizePromoCode(rawCode);
  if (!code) return { ok: false as const, error: "Enter a promo code." };

  const db = getDb();
  const [promo] = await db
    .select()
    .from(schema.promoCodes)
    .where(and(eq(schema.promoCodes.organizationId, org.id), eq(schema.promoCodes.code, code)))
    .limit(1);

  if (!promo) return { ok: false as const, error: `Promo code "${code}" not found.` };

  const calc = applyPromoCodeDiscount({
    unitPriceCents,
    quantity,
    promo: {
      code: promo.code,
      discountType: promo.discountType as PromoDiscountType,
      discountValue: promo.discountValue,
      active: promo.active,
      maxUses: promo.maxUses,
      currentUses: promo.currentUses,
      expiresAt: promo.expiresAt,
    },
  });

  if (!calc.ok) return calc;
  return {
    promoId: promo.id,
    code: promo.code,
    discountType: promo.discountType as PromoDiscountType,
    ...calc,
  };
}

export async function updateAssignmentCastTrackPg(
  tenantSlug: string,
  assignmentExternalId: number,
  castTrack: string
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.assignments)
    .where(
      and(
        eq(schema.assignments.organizationId, org.id),
        or(
          eq(schema.assignments.baserowId, assignmentExternalId),
          eq(schema.assignments.id, assignmentExternalId)
        )
      )
    )
    .limit(1);

  if (!existing) return { success: false as const, error: "Assignment not found." };

  const normalized = normalizeCastTrack(castTrack);
  await db
    .update(schema.assignments)
    .set({ castTrack: normalized, updatedAt: new Date() })
    .where(eq(schema.assignments.id, existing.id));

  return { success: true as const, castTrack: normalized };
}

export async function submitFamilyConflictPg(
  tenantSlug: string,
  productionId: number,
  userEmail: string,
  input: {
    studentExternalId: number;
    eventExternalId?: number | null;
    conflictType: string;
    notes: string;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const prod = await resolveProduction(org.id, productionId);
  if (!prod) return { success: false as const, error: "Production not found." };

  const cleanEmail = (userEmail || "").trim().toLowerCase();
  const db = getDb();

  // Verify the student belongs to this family's email
  const [student] = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, org.id),
        or(
          eq(schema.people.baserowId, input.studentExternalId),
          eq(schema.people.id, input.studentExternalId)
        ),
        or(
          eq(schema.people.email, cleanEmail),
          eq(schema.people.secondaryEmail, cleanEmail),
          eq(schema.people.familyEmail, cleanEmail)
        )
      )
    )
    .limit(1);

  if (!student) {
    return { success: false as const, error: "You can only log conflicts for your own students." };
  }

  let internalEventId: number | null = null;
  if (input.eventExternalId) {
    const [ev] = await db
      .select({ id: schema.events.id })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.organizationId, org.id),
          or(
            eq(schema.events.baserowId, input.eventExternalId),
            eq(schema.events.id, input.eventExternalId)
          )
        )
      )
      .limit(1);
    internalEventId = ev?.id ?? null;
  }

  await db.insert(schema.conflicts).values({
    organizationId: org.id,
    productionId: prod.id,
    personId: student.id,
    eventId: internalEventId,
    conflictType: (input.conflictType || "Absent").trim(),
    notes: (input.notes || "").trim(),
    submittedVia: "Family Hub",
  });

  return { success: true as const };
}
