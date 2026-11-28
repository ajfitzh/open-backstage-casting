// app/components/tickets/PublicBoxOfficeClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CreditCard,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Ticket,
  Users,
} from "lucide-react";
import { MAX_TICKETS_PER_ORDER } from "@/app/lib/ticketing-helpers";
import {
  formatShortSeatTag,
  type PublicSeatItem,
} from "@/app/lib/seat-picker-helpers";
import PublicSeatPicker from "@/app/components/tickets/PublicSeatPicker";

interface PerformanceOption {
  id: number;
  label: string;
  performanceDate: string;
  doorsOpenAt: string;
  ticketPrice: number;
  totalInventory: number;
  ticketsSold: number;
  remainingSeats: number;
}

interface PublicShow {
  productionId: number;
  title: string;
  location: string;
  image: string | null;
  defaultPrice: number;
  performances: PerformanceOption[];
  castMembers: { id: number; name: string }[];
}

interface SeatMapState {
  hasSeatingMap: boolean;
  venueName: string;
  seats: PublicSeatItem[];
}

function formatStorefrontDate(raw: string): string {
  if (!raw) return "Date TBA";
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  return raw;
}

function cleanPerfLabel(label: string): string {
  if (!label) return "General Admission";
  return label
    .replace(/^\[\s*\{\s*"id"\s*:\s*\d+\s*,\s*"value"\s*:\s*"[^"]+"\s*\}\s*\]\s*-\s*/, "")
    .trim();
}

export default function PublicBoxOfficeClient({
  tenant,
  orgName,
  shows,
  wasCanceled,
}: {
  tenant: string;
  orgName: string;
  shows: PublicShow[];
  wasCanceled?: boolean;
}) {
  const [selectedPerf, setSelectedPerf] = useState<{
    show: PublicShow;
    perf: PerformanceOption;
  } | null>(() => {
    for (const s of shows) {
      const open = s.performances.find((p) => p.remainingSeats > 0);
      if (open) return { show: s, perf: open };
    }
    return null;
  });

  const [quantity, setQuantity] = useState(2);
  const [seatMap, setSeatMap] = useState<SeatMapState>({
    hasSeatingMap: false,
    venueName: "",
    seats: [],
  });
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [seatRefreshNonce, setSeatRefreshNonce] = useState(0);

  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [referredByPersonId, setReferredByPersonId] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [compSuccess, setCompSuccess] = useState<{ orderId: number; codes: string[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPerfId = selectedPerf?.perf.id ?? null;

  // Load live seat availability whenever the selected performance changes
  useEffect(() => {
    if (!selectedPerfId) return;
    let active = true;
    (async () => {
      setLoadingSeats(true);
      try {
        const res = await fetch(
          `/api/tickets/seats?tenant=${encodeURIComponent(tenant)}&performanceId=${selectedPerfId}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (active) {
          setSeatMap({
            hasSeatingMap: Boolean(data.hasSeatingMap),
            venueName: data.venueName || "",
            seats: Array.isArray(data.seats) ? data.seats : [],
          });
          setSelectedSeatIds([]);
        }
      } catch {
        if (active) {
          setSeatMap({ hasSeatingMap: false, venueName: "", seats: [] });
        }
      } finally {
        if (active) setLoadingSeats(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tenant, selectedPerfId, seatRefreshNonce]);

  const maxAllowed = selectedPerf
    ? Math.min(MAX_TICKETS_PER_ORDER, Math.max(1, selectedPerf.perf.remainingSeats))
    : 1;

  const effectiveQuantity = seatMap.hasSeatingMap ? selectedSeatIds.length : quantity;
  const totalPrice = selectedPerf ? selectedPerf.perf.ticketPrice * effectiveQuantity : 0;

  const seatById = useMemo(
    () => new Map(seatMap.seats.map((s) => [s.id, s])),
    [seatMap.seats]
  );

  const handleToggleSeat = (seatId: number) => {
    setError(null);
    setSelectedSeatIds((prev) => {
      if (prev.includes(seatId)) return prev.filter((id) => id !== seatId);
      if (prev.length >= maxAllowed) return prev;
      return [...prev, seatId];
    });
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerf) return;
    if (seatMap.hasSeatingMap && selectedSeatIds.length === 0) {
      setError("Please choose at least one seat on the seating map before checking out.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setCompSuccess(null);

    try {
      const res = await fetch("/api/tickets/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant,
          performanceId: selectedPerf.perf.id,
          quantity: effectiveQuantity,
          seatIds: seatMap.hasSeatingMap ? selectedSeatIds : undefined,
          buyerName,
          buyerEmail,
          referredByPersonId: referredByPersonId ? Number(referredByPersonId) : null,
          promoCode: promoCode.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          // Refresh live seat map so conflicting seats show as taken
          setSeatRefreshNonce((n) => n + 1);
        }
        throw new Error(data.error || "Unable to start checkout.");
      }
      if (data.compOrder) {
        setCompSuccess({
          orderId: data.orderId,
          codes: (data.tickets || []).map((t: { code: string }) => t.code),
        });
        setSeatRefreshNonce((n) => n + 1);
        setSubmitting(false);
        return;
      }
      if (!data.url) {
        throw new Error(data.error || "Unable to start Stripe Checkout.");
      }
      window.location.assign(data.url);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        {/* Header */}
        <header className="space-y-2 border-b border-white/10 pb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400">
            {orgName} • Online Box Office
          </p>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight flex items-center gap-3">
            <Ticket className="text-blue-500 shrink-0" size={36} />
            {seatMap.hasSeatingMap ? "Reserved & Admission Tickets" : "Show Tickets"}
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Choose a performance below to reserve your seats. Your scannable QR tickets are emailed
            immediately after checkout.
          </p>
        </header>

        {wasCanceled && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-medium flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0" />
            Checkout was canceled — no charge was made. You can select seats below anytime.
          </div>
        )}

        {shows.length === 0 ? (
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-12 text-center space-y-3">
            <Ticket size={44} className="mx-auto text-zinc-600" />
            <h2 className="text-xl font-black text-white">No Performances On Sale Yet</h2>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Check back soon for upcoming showtimes from {orgName}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Show, Performance & Interactive Seat Picker */}
            <div className="lg:col-span-7 space-y-6">
              {shows.map((show) => (
                <section
                  key={show.productionId}
                  className="bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4"
                >
                  <div className="flex items-center gap-4">
                    {show.image && (
                      <div className="w-24 h-16 rounded-2xl bg-black/50 border border-white/10 p-1.5 shrink-0 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={show.image}
                          alt={show.title}
                          className="w-full h-full object-contain rounded-xl"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="text-xl sm:text-2xl font-black text-white truncate">
                        {show.title}
                      </h2>
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <MapPin size={13} className="text-zinc-500 shrink-0" />
                        {show.location}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {show.performances.map((perf) => {
                      const soldOut = perf.remainingSeats <= 0;
                      const isSelected = selectedPerf?.perf.id === perf.id;
                      return (
                        <button
                          key={perf.id}
                          type="button"
                          disabled={soldOut}
                          onClick={() => {
                            setSelectedPerf({ show, perf });
                            setQuantity((q) => Math.min(q, Math.max(1, perf.remainingSeats)));
                            setSelectedSeatIds([]);
                            setReferredByPersonId("");
                            setError(null);
                          }}
                          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                            soldOut
                              ? "bg-zinc-950/60 border-white/5 opacity-50 cursor-not-allowed"
                              : isSelected
                                ? "bg-blue-600/15 border-blue-500 ring-1 ring-blue-500/40"
                                : "bg-zinc-950 border-white/10 hover:border-white/25"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-black text-white text-sm sm:text-base truncate">
                              {cleanPerfLabel(perf.label)}
                            </p>
                            <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                              <Calendar size={12} className="text-blue-400 shrink-0" />
                              {formatStorefrontDate(perf.performanceDate)}
                              {perf.doorsOpenAt ? ` • Doors ${perf.doorsOpenAt}` : ""}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-base font-black text-white">
                              ${perf.ticketPrice.toFixed(2)}
                            </p>
                            {soldOut ? (
                              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-black uppercase">
                                Sold Out
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-400">
                                {perf.remainingSeats} left
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}

              {/* INTERACTIVE RESERVED SEAT MAP (shown automatically when venue has seats configured) */}
              {selectedPerf && (loadingSeats || seatMap.hasSeatingMap) && (
                <PublicSeatPicker
                  venueName={seatMap.venueName || selectedPerf.show.location}
                  seats={seatMap.seats}
                  selectedSeatIds={selectedSeatIds}
                  maxSelectable={maxAllowed}
                  loading={loadingSeats}
                  onToggleSeat={handleToggleSeat}
                  onClearSelection={() => setSelectedSeatIds([])}
                />
              )}
            </div>

            {/* Right: Checkout Summary Card */}
            <form
              onSubmit={handleCheckout}
              className="lg:col-span-5 bg-zinc-900 border border-white/10 rounded-3xl p-6 space-y-5 lg:sticky lg:top-6"
            >
              <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">
                Order Summary
              </h3>

              {!selectedPerf ? (
                <p className="text-sm text-zinc-400">
                  Select an available performance on the left to continue.
                </p>
              ) : (
                <>
                  <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 space-y-1">
                    <p className="text-base font-black text-white">{selectedPerf.show.title}</p>
                    <p className="text-xs text-zinc-400">
                      {cleanPerfLabel(selectedPerf.perf.label)}
                      {selectedPerf.perf.performanceDate
                        ? ` • ${formatStorefrontDate(selectedPerf.perf.performanceDate)}`
                        : ""}
                    </p>
                    <p className="text-xs font-bold text-emerald-400 pt-1">
                      ${selectedPerf.perf.ticketPrice.toFixed(2)} each •{" "}
                      {selectedPerf.perf.remainingSeats} seats available
                    </p>
                  </div>

                  {/* Quantity Picker (GA) or Selected Seats Summary (Reserved) */}
                  {seatMap.hasSeatingMap ? (
                    <div className="bg-zinc-950 border border-white/10 rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                          Selected Seats
                        </span>
                        <span className="text-sm font-black font-mono text-blue-400">
                          {selectedSeatIds.length} {selectedSeatIds.length === 1 ? "seat" : "seats"}
                        </span>
                      </div>
                      {selectedSeatIds.length === 0 ? (
                        <p className="text-[11px] text-zinc-500">
                          Tap available seats on the seating map to add them to your order.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedSeatIds.map((sid) => {
                            const s = seatById.get(sid);
                            if (!s) return null;
                            return (
                              <span
                                key={sid}
                                className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-[10px] font-bold text-blue-200"
                              >
                                {s.section} {formatShortSeatTag(s)}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-zinc-950 border border-white/10 rounded-2xl p-3.5">
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                        Tickets
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex items-center justify-center text-white"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={15} />
                        </button>
                        <span className="w-8 text-center text-lg font-black font-mono">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.min(maxAllowed, q + 1))}
                          className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex items-center justify-center text-white"
                          aria-label="Increase quantity"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Buyer Info */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                        Full Name *
                      </label>
                      <input
                        required
                        type="text"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                        Email for QR Tickets *
                      </label>
                      <input
                        required
                        type="email"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        placeholder="family@example.com"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                      />
                    </div>

                    {selectedPerf.show.castMembers.length > 0 && (
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 flex items-center gap-1">
                          <Users size={11} /> Credit a Cast Member (Optional)
                        </label>
                        <select
                          value={referredByPersonId}
                          onChange={(e) => setReferredByPersonId(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                        >
                          <option value="">General Box Office</option>
                          {selectedPerf.show.castMembers.map((actor) => (
                            <option key={actor.id} value={String(actor.id)}>
                              {actor.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                        Promo / Comp Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="CASTFAMILY or COMP"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-mono uppercase text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {compSuccess && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 space-y-1.5">
                      <p className="font-black uppercase tracking-wider text-emerald-300">
                        Comp Tickets Confirmed (Order #{compSuccess.orderId})
                      </p>
                      <p className="text-zinc-300">
                        Present these ticket code(s) at the door:
                      </p>
                      <p className="font-mono font-bold text-white break-all">
                        {compSuccess.codes.join(" • ")}
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-300">
                      {error}
                    </div>
                  )}

                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-400">Total</span>
                      <span className="text-2xl font-black text-white">
                        ${totalPrice.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || (seatMap.hasSeatingMap && selectedSeatIds.length === 0)}
                      className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                      {submitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CreditCard size={16} />
                      )}
                      {submitting ? "Processing..." : "Checkout"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
