import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/app/lib/auth-guard";
import { getStripeClient, sanitizeReturnPath } from "@/app/lib/stripe-helpers";
import { isPostgresEnabled } from "@/db";
import { getOrganizationBillingPg } from "@/app/lib/db/core-repo";

export async function POST(req: NextRequest) {
  const guard = await requireAdminAccess();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.error.startsWith("Unauthorized") ? 401 : 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const tenant = typeof body?.tenant === "string" ? body.tenant.trim().toLowerCase() : "";
    if (!tenant) {
      return NextResponse.json({ error: "Missing tenant slug." }, { status: 400 });
    }

    if (!isPostgresEnabled()) {
      return NextResponse.json({ error: "Billing portal requires PostgreSQL." }, { status: 400 });
    }

    const orgBilling = await getOrganizationBillingPg(tenant);
    if (!orgBilling?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No active Stripe customer found for this organization yet. Upgrade to a paid plan first." },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") || "http://localhost:3001";
    const returnPath = sanitizeReturnPath(body?.returnPath, "/settings");
    const stripe = getStripeClient();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: orgBilling.stripeCustomerId,
      return_url: `${origin}${returnPath}`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error("[Org Billing Portal] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to open Stripe billing portal." },
      { status: 500 }
    );
  }
}
