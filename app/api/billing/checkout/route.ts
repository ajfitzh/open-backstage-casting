import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/app/lib/auth-guard";
import { dollarsToCents, getStripeClient, sanitizeReturnPath } from "@/app/lib/stripe-helpers";
import { isValidOrgPlanId, ORG_BILLING_PLANS } from "@/app/lib/billing-plans";
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
    const planId = body?.planId;

    if (!tenant || !isValidOrgPlanId(planId) || planId === "starter") {
      return NextResponse.json(
        { error: "Please select a paid organization plan (pro or enterprise)." },
        { status: 400 }
      );
    }

    const plan = ORG_BILLING_PLANS[planId];
    const origin = req.headers.get("origin") || "http://localhost:3001";
    const returnPath = sanitizeReturnPath(body?.returnPath, "/settings");
    const separator = returnPath.includes("?") ? "&" : "?";

    const orgBilling = isPostgresEnabled() ? await getOrganizationBillingPg(tenant) : null;
    const stripe = getStripeClient();

    const configuredPriceId = plan.priceEnvKey ? process.env[plan.priceEnvKey] : undefined;
    const lineItems = configuredPriceId
      ? [{ price: configuredPriceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: "usd",
              recurring: { interval: "month" as const },
              product_data: {
                name: `Open Backstage — ${plan.name}`,
                description: `${plan.tagline} (${orgBilling?.name || tenant})`,
              },
              unit_amount: dollarsToCents(plan.monthlyPriceDollars),
            },
            quantity: 1,
          },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      ...(orgBilling?.stripeCustomerId
        ? { customer: orgBilling.stripeCustomerId }
        : { customer_email: guard.user.email || undefined }),
      line_items: lineItems,
      metadata: {
        billingType: "org_subscription",
        tenant,
        planId,
      },
      subscription_data: {
        metadata: {
          billingType: "org_subscription",
          tenant,
          planId,
        },
      },
      success_url: `${origin}${returnPath}${separator}billing=success&plan=${planId}`,
      cancel_url: `${origin}${returnPath}${separator}billing=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[Org Billing Checkout] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to start Stripe subscription checkout." },
      { status: 500 }
    );
  }
}
