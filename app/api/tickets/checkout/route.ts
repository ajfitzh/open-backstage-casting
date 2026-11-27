// app/api/tickets/checkout/route.ts
// Public general-admission ticket Stripe Checkout endpoint.

import { NextRequest, NextResponse } from "next/server";
import { isPostgresEnabled } from "@/db";
import { getStripeClient } from "@/app/lib/stripe-helpers";
import {
  attachStripeSessionToOrderPg,
  createPendingTicketOrderPg,
  getPerformanceForCheckoutPg,
} from "@/app/lib/db/tickets-repo";
import { validateTicketOrderRequest } from "@/app/lib/ticketing-helpers";

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
      unitPriceCents: validation.unitPriceCents,
      totalCents: validation.totalCents,
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
                "General Admission QR Ticket",
              ]
                .filter(Boolean)
                .join(" • "),
            },
            unit_amount: validation.unitPriceCents,
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
      },
      success_url: `${origin}/tickets/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/tickets?canceled=1`,
    });

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
