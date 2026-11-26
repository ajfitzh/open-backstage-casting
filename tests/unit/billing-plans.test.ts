import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidOrgPlanId,
  normalizeOrgPlanId,
  ORG_BILLING_PLANS,
  parseBillingMetadata,
  resolvePlanFromSubscriptionStatus,
} from "../../app/lib/billing-plans.ts";

test("ORG_BILLING_PLANS defines starter, pro, and enterprise tiers cleanly", () => {
  assert.equal(ORG_BILLING_PLANS.starter.monthlyPriceDollars, 0);
  assert.equal(ORG_BILLING_PLANS.pro.monthlyPriceDollars, 49);
  assert.equal(ORG_BILLING_PLANS.enterprise.monthlyPriceDollars, 129);
  assert.equal(isValidOrgPlanId("pro"), true);
  assert.equal(isValidOrgPlanId("unknown"), false);
  assert.equal(normalizeOrgPlanId("ENTERPRISE"), "enterprise");
  assert.equal(normalizeOrgPlanId("invalid"), "starter");
});

test("parseBillingMetadata validates org_subscription metadata safely", () => {
  assert.deepEqual(
    parseBillingMetadata({
      billingType: "org_subscription",
      tenant: "CYTFred",
      planId: "pro",
    }),
    { tenant: "cytfred", planId: "pro" }
  );

  // Ignores cast production-fee sessions
  assert.equal(
    parseBillingMetadata({ tenant: "cytfred", auditionId: "123" }),
    null
  );
  assert.equal(parseBillingMetadata(null), null);
});

test("resolvePlanFromSubscriptionStatus downgrades canceled/unpaid orgs to starter", () => {
  assert.equal(resolvePlanFromSubscriptionStatus("active", "pro"), "pro");
  assert.equal(resolvePlanFromSubscriptionStatus("trialing", "enterprise"), "enterprise");
  assert.equal(resolvePlanFromSubscriptionStatus("past_due", "pro"), "pro");
  assert.equal(resolvePlanFromSubscriptionStatus("canceled", "pro"), "starter");
  assert.equal(resolvePlanFromSubscriptionStatus("unpaid", "enterprise"), "starter");
});
