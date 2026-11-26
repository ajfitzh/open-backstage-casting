// app/lib/billing-plans.ts
// Pure SaaS organization subscription plans and Stripe billing webhook helpers.

export type OrgPlanId = "starter" | "pro" | "enterprise";

export interface OrgBillingPlan {
  id: OrgPlanId;
  name: string;
  tagline: string;
  monthlyPriceDollars: number;
  priceEnvKey?: string;
  features: string[];
  highlighted?: boolean;
}

export const ORG_BILLING_PLANS: Record<OrgPlanId, OrgBillingPlan> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Free forever for small theater groups & pilot shows",
    monthlyPriceDollars: 0,
    features: [
      "1 active production at a time",
      "Unlimited audition submissions & family portal",
      "PostgreSQL workspace & custom subdomain",
      "Basic costume pull sheet & QR labels",
    ],
  },
  pro: {
    id: "pro",
    name: "Production Pro",
    tagline: "Full-season platform for growing youth & community theaters",
    monthlyPriceDollars: 49,
    priceEnvKey: "STRIPE_PRICE_PRO",
    highlighted: true,
    features: [
      "Unlimited concurrent productions & seasons",
      "Full Wardrobe QR inventory + camera scanner",
      "Academy classes, committees & scheduling suite",
      "Box office analytics & automated nightly reports",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Multi-Chapter",
    tagline: "For multi-campus academies & regional theater networks",
    monthlyPriceDollars: 129,
    priceEnvKey: "STRIPE_PRICE_ENTERPRISE",
    features: [
      "Everything in Production Pro",
      "Multi-campus venues, spaces & rental rate tracking",
      "Custom Stripe fee routing & finance exports",
      "Priority onboarding & data migration support",
    ],
  },
};

export function isValidOrgPlanId(value: unknown): value is OrgPlanId {
  return value === "starter" || value === "pro" || value === "enterprise";
}

export function normalizeOrgPlanId(value: unknown): OrgPlanId {
  const clean = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (isValidOrgPlanId(clean)) return clean;
  return "starter";
}

export interface ParsedBillingMetadata {
  tenant: string;
  planId: OrgPlanId;
}

export function parseBillingMetadata(
  metadata: Record<string, string | null | undefined> | null | undefined
): ParsedBillingMetadata | null {
  if (!metadata) return null;
  if (metadata.billingType !== "org_subscription") return null;

  const tenant = (metadata.tenant || "").trim().toLowerCase();
  const planId = normalizeOrgPlanId(metadata.planId);
  if (!tenant) return null;

  return { tenant, planId };
}

export function resolvePlanFromSubscriptionStatus(
  status: string | null | undefined,
  requestedPlan: OrgPlanId
): OrgPlanId {
  const normalized = (status || "").toLowerCase();
  if (
    normalized === "active" ||
    normalized === "trialing" ||
    normalized === "past_due"
  ) {
    return requestedPlan;
  }
  return "starter";
}
