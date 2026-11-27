"use client";

import React, { useEffect, useState } from "react";
import { Ticket, Tag, Plus, Loader2, CheckCircle2, DollarSign } from "lucide-react";
import { toast } from "@/app/components/ToastProvider";
import {
  createPromoCodeAction,
  listPromoCodesAction,
  sellDoorTicketsAction,
  togglePromoCodeAction,
} from "@/app/actions/phase2-ops";
import type { PromoDiscountType } from "@/app/lib/phase2-helpers";

interface SimplePerformance {
  id: number;
  label: string;
  date: string;
  price: number;
  remaining: number;
}

interface PromoItem {
  id: number;
  code: string;
  discountType: PromoDiscountType;
  discountValue: number;
  maxUses: number | null;
  currentUses: number;
  active: boolean;
}

export default function BoxOfficeOpsPanel({
  tenant,
  productionId,
  performances,
  onOrderCreated,
}: {
  tenant: string;
  productionId?: number;
  performances: SimplePerformance[];
  onOrderCreated?: () => void;
}) {
  // Walk-up sale state
  const [perfId, setPerfId] = useState<number>(performances[0]?.id || 0);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<"cash" | "card_terminal" | "comp">("cash");
  const [selling, setSelling] = useState(false);
  const [lastIssuedCodes, setLastIssuedCodes] = useState<string[]>([]);

  // Promo code state
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState<PromoDiscountType>("percent");
  const [newVal, setNewVal] = useState(20);
  const [newMaxUses, setNewMaxUses] = useState("");
  const [creatingPromo, setCreatingPromo] = useState(false);

  useEffect(() => {
    listPromoCodesAction(tenant, productionId).then((res) => {
      if (res.success) setPromos(res.promos);
    });
  }, [tenant, productionId]);

  const handleDoorSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfId) {
      toast.error("Select a performance first.");
      return;
    }
    setSelling(true);
    const res = await sellDoorTicketsAction(tenant, perfId, {
      buyerName: buyerName.trim() || "Walk-Up Guest",
      buyerEmail: buyerEmail.trim() || undefined,
      quantity: qty,
      paymentMethod: method,
    });
    setSelling(false);
    if (!res.success) {
      toast.error(res.error || "Door sale failed.");
      return;
    }
    setLastIssuedCodes(res.tickets.map((t) => t.code));
    setBuyerName("");
    setBuyerEmail("");
    setQty(1);
    toast.success(`Issued ${res.tickets.length} door ticket(s)!`);
    onOrderCreated?.();
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPromo(true);
    const res = await createPromoCodeAction(tenant, {
      productionId: productionId || null,
      code: newCode,
      discountType: newType,
      discountValue: newVal,
      maxUses: newMaxUses ? Number(newMaxUses) : null,
    });
    setCreatingPromo(false);
    if (!res.success) {
      toast.error(res.error || "Could not create promo code.");
      return;
    }
    setPromos((prev) => [res.promo, ...prev]);
    setNewCode("");
    setNewMaxUses("");
    toast.success(`Promo code ${res.promo.code} created!`);
  };

  const handleTogglePromo = async (p: PromoItem) => {
    const next = !p.active;
    setPromos((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: next } : x)));
    const res = await togglePromoCodeAction(tenant, p.id, next);
    if (!res.success) {
      toast.error(res.error || "Could not update promo code.");
      setPromos((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: p.active } : x)));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* WALK-UP DOOR SALES */}
      <form
        onSubmit={handleDoorSale}
        className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-4"
      >
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Walk-Up Door Sale / Comp Issue
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Performance</span>
            <select
              value={perfId}
              onChange={(e) => setPerfId(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-white"
            >
              {performances.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.date}) — ${p.price} · {p.remaining} left
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Buyer Name</span>
            <input
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Walk-Up Guest"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-white"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">
              Email (Optional Receipt)
            </span>
            <input
              type="email"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              placeholder="guest@example.com"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-white"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Quantity</span>
            <input
              type="number"
              min={1}
              max={25}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-white"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Payment</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-white"
            >
              <option value="cash">Cash at Door</option>
              <option value="card_terminal">Card Reader / Terminal</option>
              <option value="comp">Complimentary ($0)</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={selling || !perfId}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
        >
          {selling ? <Loader2 size={14} className="animate-spin" /> : <Ticket size={14} />}
          Issue {qty} Door Ticket{qty > 1 ? "s" : ""}
        </button>

        {lastIssuedCodes.length > 0 && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
            <p className="font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Issued Codes:
            </p>
            <div className="flex flex-wrap gap-1.5 font-mono text-white">
              {lastIssuedCodes.map((c) => (
                <span key={c} className="px-2 py-0.5 rounded bg-black/40 border border-white/10">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* PROMO & COMP CODES */}
      <div className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-purple-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Promo &amp; Comp Codes ({promos.length})
          </h3>
        </div>

        <form onSubmit={handleCreatePromo} className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <input
            required
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            placeholder="CAST20"
            className="bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono uppercase"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as PromoDiscountType)}
            className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-2 text-white"
          >
            <option value="percent">% Off</option>
            <option value="fixed">$ Off</option>
            <option value="comp">100% Comp</option>
          </select>
          <input
            type="number"
            min={0}
            max={newType === "percent" ? 100 : 500}
            disabled={newType === "comp"}
            value={newType === "comp" ? 100 : newVal}
            onChange={(e) => setNewVal(Number(e.target.value))}
            placeholder="Value"
            className="bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={creatingPromo || newCode.trim().length < 3}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl px-3 py-2 uppercase tracking-wider flex items-center justify-center gap-1"
          >
            {creatingPromo ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Add
          </button>
        </form>

        <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
          {promos.length === 0 ? (
            <p className="text-xs text-zinc-500 italic py-4 text-center">
              No promo codes yet. Create codes like CASTFAM or VIPCOMP above.
            </p>
          ) : (
            promos.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-950 border border-white/5 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-white">{p.code}</span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 text-[10px] font-bold">
                    {p.discountType === "comp"
                      ? "COMP"
                      : p.discountType === "percent"
                      ? `${p.discountValue}% OFF`
                      : `$${p.discountValue} OFF`}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {p.currentUses}
                    {p.maxUses ? `/${p.maxUses}` : ""} used
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePromo(p)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                    p.active
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                      : "bg-zinc-800 border-white/10 text-zinc-400"
                  }`}
                >
                  {p.active ? "Active" : "Paused"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
