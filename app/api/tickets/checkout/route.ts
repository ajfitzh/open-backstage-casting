// app/api/tickets/checkout/route.ts
// Public general-admission ticket Stripe Checkout endpoint.

import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb, isPostgresEnabled, schema } from "@/db";
import { getStripeClient } from "@/app/lib/stripe-helpers";
import {
  attachStripeSessionToOrderPg,
  createPendingTicketOrderPg,
  getPerformanceForCheckoutPg,
  getPerformanceSeatingMapPg,
} from "@/app/lib/db/tickets-repo";
import { sellDoorTicketsPg, validatePromoCodePg } from "@/app/lib/db/phase2-repo";
import {
  MAX_TICKETS_PER_ORDER,
  validateTicketOrderRequest,
} from "@/app/lib/ticketing-helpers";
import {
  formatShortSeatTag,
  validateRequestedSeats,
} from "@/app/lib/seat-picker-helpers";

export async function POST(req: NextRequest) {
  if (!isPostgresEnabled()) {
    return NextResponse.json({ error: "Ticketing requires PostgreSQL." }, { status: 503 });
  }

  try {
    const body = await req.json();
    const tenant = typeof body.tenant === "string" ? body.tenant.trim().toLowerCase() : "";
    const performanceId = Number(body.performanceId);
    const referredByPersonId = body.referredByPersonId ? Number(body.referredByPersonId) : null;

    if (!tenant || !Number.isInteger(performanceId) || performanceId <= 0) {
      return NextResponse.json(
        { error: "Valid tenant and performanceId are required." },
        { status: 400 }
      );
    }

    const perfContext = await getPerformanceForCheckoutPg(tenant, performanceId);
    if (!perfContext) {
      return NextResponse.json({ error: "Performance not found." }, { status: 404 });
    }

    const validation = validateTicketOrderRequest({
      quantity: body.quantity,
      remainingSeats: perfContext.remainingSeats,
      salesOpen: perfContext.performance.salesOpen,
      unitPriceDollars: perfContext.unitPriceDollars,
      buyerName: body.buyerName,
      buyerEmail: body.buyerEmail,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Optional Reserved Seat Validation (when venue has a seating map configured)
    const rawSeatIds: number[] = Array.isArray(body.seatIds)
      ? body.seatIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isInteger(id) && id > 0)
      : [];
    let validatedSeatIds: number[] = [];
    let seatSummaryTags: string[] = [];

    const seatMap = await getPerformanceSeatingMapPg(tenant, perfContext.performance.id);
    if (seatMap?.hasSeatingMap && rawSeatIds.length > 0) {
      const venueSeatIds = new Set(seatMap.seats.map((s) => s.id));
      const unavailableSeatIds = new Set(
        seatMap.seats
          .filter((s) => s.availability === "taken" || s.availability === "held")
          .map((s) => s.id)
      );
      const seatCheck = validateRequestedSeats({
        requestedSeatIds: rawSeatIds,
        venueSeatIds,
        unavailableSeatIds,
        maxPerOrder: MAX_TICKETS_PER_ORDER,
      });
      if (!seatCheck.ok) {
        return NextResponse.json(
          { error: seatCheck.error, conflictSeatIds: seatCheck.conflictSeatIds },
          { status: seatCheck.conflictSeatIds ? 409 : 400 }
        );
      }
      if (seatCheck.seatIds.length !== validation.quantity) {
        return NextResponse.json(
          { error: "Selected seat count must match ticket quantity." },
          { status: 400 }
        );
      }
      validatedSeatIds = seatCheck.seatIds;
      const seatLookup = new Map(seatMap.seats.map((s) => [s.id, s]));
      seatSummaryTags = validatedSeatIds
        .map((id) => seatLookup.get(id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .map((s) => formatShortSeatTag(s));
    }

    const rawPromo = typeof body.promoCode === "string" ? body.promoCode.trim() : "";
    let finalUnitCents = validation.unitPriceCents;
    let finalTotalCents = validation.totalCents;
    let appliedPromo: { promoId: number; code: string; discountCents: number } | null = null;

    if (rawPromo) {
      const promoRes = await validatePromoCodePg(
        tenant,
        rawPromo,
        validation.unitPriceCents,
        validation.quantity
      );
      if (!promoRes.ok) {
        return NextResponse.json({ error: promoRes.error }, { status: 400 });
      }
      finalTotalCents = promoRes.totalCents;
      finalUnitCents = promoRes.effectiveUnitCents;
      appliedPromo = {
        promoId: promoRes.promoId,
        code: promoRes.code,
        discountCents: promoRes.discountCents,
      };
    }

    // 100% Comp / Free Promo Code -> issue QR tickets immediately without Stripe
    if (finalTotalCents === 0 && appliedPromo) {
      const compOrder = await sellDoorTicketsPg(tenant, perfContext.performance.id, {
        quantity: validation.quantity,
        buyerName: validation.buyerName,
        buyerEmail: validation.buyerEmail,
        paymentMethod: "comp",
      });
      if (!compOrder.success) {
        return NextResponse.json({ error: compOrder.error }, { status: 400 });
      }
      const db = getDb();
      await db
        .update(schema.promoCodes)
        .set({ currentUses: sql`coalesce(${schema.promoCodes.currentUses}, 0) + 1` })
        .where(eq(schema.promoCodes.id, appliedPromo.promoId));

      return NextResponse.json({
        compOrder: true,
        orderId: compOrder.orderId,
        tickets: compOrder.tickets,
        code: appliedPromo.code,
      });
    }

    const order = await createPendingTicketOrderPg({
      organizationId: perfContext.org.id,
      productionId: perfContext.production.id,
      performanceId: perfContext.performance.id,
      referredByExternalPersonId:
        referredByPersonId && Number.isInteger(referredByPersonId) && referredByPersonId > 0
          ? referredByPersonId
          : null,
      buyerName: validation.buyerName,
      buyerEmail: validation.buyerEmail,
      quantity: validation.quantity,
      unitPriceCents: finalUnitCents,
      totalCents: finalTotalCents,
      seatIds: validatedSeatIds,
    });

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: validation.buyerEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${perfContext.production.title} — ${perfContext.performance.label || "General Admission"}`,
              description: [
                perfContext.performance.performanceDate || null,
                perfContext.production.location || perfContext.org.name,
                seatSummaryTags.length > 0 ? `Reserved Seats: ${seatSummaryTags.join(", ")}` : null,
                appliedPromo ? `Promo ${appliedPromo.code} applied` : seatSummaryTags.length > 0 ? "Reserved QR Ticket" : "General Admission QR Ticket",
              ]
                .filter(Boolean)
                .join(" • "),
            },
            unit_amount: finalUnitCents,
          },
          quantity: validation.quantity,
        },
      ],
      metadata: {
        type: "ticket_order",
        tenant: perfContext.org.slug,
        orderId: String(order.id),
        productionId: String(perfContext.production.id),
        performanceId: String(perfContext.performance.id),
        ...(appliedPromo ? { promoCode: appliedPromo.code } : {}),
      },
      success_url: `${origin}/tickets/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/tickets?canceled=1`,
    });

    if (appliedPromo) {
      const db = getDb();
      await db
        .update(schema.promoCodes)
        .set({ currentUses: sql`coalesce(${schema.promoCodes.currentUses}, 0) + 1` })
        .where(eq(schema.promoCodes.id, appliedPromo.promoId));
    }

    await attachStripeSessionToOrderPg(order.id, session.id);

    return NextResponse.json({ url: session.url, sessionId: session.id, orderId: order.id });
  } catch (err: any) {
    console.error("[Tickets Checkout] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Unable to start ticket checkout." },
      { status: 500 }
    );
  }
}
