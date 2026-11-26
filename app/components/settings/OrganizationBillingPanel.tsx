"use client";

import React, { useState } from "react";
import { Check, CreditCard, ExternalLink, Loader2, Sparkles } from "lucide-react";
import {
  normalizeOrgPlanId,
  ORG_BILLING_PLANS,
  type OrgPlanId,
} from "@/app/lib/billing-plans";
import type { OrganizationBillingSummary } from "@/app/lib/db/core-repo";

interface OrganizationBillingPanelProps {
  tenant: string;
  isAdmin: boolean;
  orgBilling: OrganizationBillingSummary | null;
}

export default function OrganizationBillingPanel({
  tenant,
  isAdmin,
  orgBilling,
}: OrganizationBillingPanelProps) {
  const currentPlanId: OrgPlanId = normalizeOrgPlanId(orgBilling?.plan);
  const [loadingPlan, setLoadingPlan] = useState<OrgPlanId | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (planId: OrgPlanId) => {
    setError(null);
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant,
          planId,
          returnPath: "/settings",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start Stripe checkout.");
      }
      window.location.assign(data.url);
    } catch (err: any) {
      setError(err?.message || "Checkout failed.");
      setLoadingPlan(null);
    }
  };

  const handleOpenPortal = async () => {
    setError(null);
    setOpeningPortal(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant,
          returnPath: "/settings",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not open Stripe billing portal.");
      }
      window.location.assign(data.url);
    } catch (err: any) {
      setError(err?.message || "Could not open billing portal.");
      setOpeningPortal(false);
    }
  };

  const plans = Object.values(ORG_BILLING_PLANS);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
            Billing &amp; Organization Plan
          </h2>
          <p className="text-zinc-500 text-sm">
            Workspace subscription, production fees, and Stripe invoices.
          </p>
        </div>

        {isAdmin && orgBilling?.stripeCustomerId && (
          <button
            type="button"
            disabled={openingPortal}
            onClick={handleOpenPortal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-widest transition-colors"
          >
            {openingPortal ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ExternalLink size={14} />
            )}
            Manage Cards &amp; Invoices
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-300">
          {error}
        </div>
      )}

      {/* Active Workspace Plan Banner */}
      <div className="p-5 rounded-2xl bg-black/30 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
                {orgBilling?.name || tenant}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {ORG_BILLING_PLANS[currentPlanId].name}
              </span>
              {orgBilling?.subscriptionStatus && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300">
                  {orgBilling.subscriptionStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {ORG_BILLING_PLANS[currentPlanId].tagline}
            </p>
          </div>
        </div>
      </div>

      {/* SaaS Tier Cards */}
      {isAdmin ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 border flex flex-col justify-between gap-5 ${
                  plan.highlighted
                    ? "bg-blue-950/20 border-blue-500/40 shadow-xl"
                    : "bg-black/25 border-white/10"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-white">{plan.name}</h3>
                    {plan.highlighted && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300">
                        Most Popular
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">
                      ${plan.monthlyPriceDollars}
                    </span>
                    <span className="text-xs text-zinc-500 font-bold uppercase">/ month</span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">{plan.tagline}</p>

                  <ul className="space-y-2.5 pt-2 border-t border-white/5">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-xs text-zinc-300">
                        <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center text-xs font-black uppercase tracking-widest text-emerald-300">
                    Current Plan
                  </div>
                ) : plan.monthlyPriceDollars === 0 ? (
                  <div className="w-full py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-center text-xs font-bold text-zinc-500">
                    Included Free Tier
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={loadingPlan !== null}
                    onClick={() => handleUpgrade(plan.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      plan.highlighted
                        ? "bg-blue-600 hover:bg-blue-500 text-white"
                        : "bg-zinc-800 hover:bg-zinc-700 text-white"
                    }`}
                  >
                    {loadingPlan === plan.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CreditCard size={14} />
                    )}
                    Upgrade to {plan.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 border border-dashed border-zinc-800 bg-black/20 rounded-2xl flex flex-col items-center justify-center text-center max-w-xl">
          <CreditCard size={36} className="text-zinc-600 mb-3" />
          <h3 className="text-zinc-200 font-bold mb-1.5">Payments Handled via Stripe Checkout</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Production fees and donations are processed securely through Stripe during registration
            and role acceptance. Contact your organization administrator for workspace subscription
            changes.
          </p>
        </div>
      )}
    </div>
  );
}
