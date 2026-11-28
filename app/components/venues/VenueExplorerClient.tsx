"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Armchair,
  Building2,
  DollarSign,
  ExternalLink,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Theater,
  Ticket,
  Users,
  X,
} from "lucide-react";
import type { VenueExplorerItem } from "@/app/lib/db/phase3-repo";
import { saveVenueCostEstimatesAction } from "@/app/actions/committees";
import VenueSeatingChart, { getSectionColor } from "@/app/components/tickets/VenueSeatingChart";

interface VenueExplorerClientProps {
  tenant: string;
  venues: VenueExplorerItem[];
  initialCostEstimates?: Record<number, number>;
}

type MarketKey =
  | "Fredericksburg"
  | "Spotsylvania"
  | "Stafford"
  | "King George"
  | "Other";

type SizeFilter = "all" | "with_chart" | "mainstage" | "midsize" | "intimate";
type SortMode = "charts" | "shows" | "cap_desc" | "cap_asc" | "cost_asc" | "name";

const MARKET_STYLES: Record<MarketKey, { badge: string; dot: string }> = {
  Fredericksburg: {
    badge: "bg-blue-500/15 border-blue-400/30 text-blue-300",
    dot: "bg-blue-400",
  },
  Spotsylvania: {
    badge: "bg-emerald-500/15 border-emerald-400/30 text-emerald-300",
    dot: "bg-emerald-400",
  },
  Stafford: {
    badge: "bg-purple-500/15 border-purple-400/30 text-purple-300",
    dot: "bg-purple-400",
  },
  "King George": {
    badge: "bg-amber-500/15 border-amber-400/30 text-amber-300",
    dot: "bg-amber-400",
  },
  Other: {
    badge: "bg-zinc-800 border-white/10 text-zinc-400",
    dot: "bg-zinc-500",
  },
};

function inferMarket(venue: VenueExplorerItem): MarketKey {
  const hay = `${venue.name} ${venue.address || ""}`.toLowerCase();
  if (hay.includes("king george") || hay.includes("22485")) return "King George";
  if (hay.includes("spotsylvania") || hay.includes("22551") || hay.includes("22553"))
    return "Spotsylvania";
  if (
    hay.includes("north stafford") ||
    hay.includes("stafford, va") ||
    hay.includes("22554") ||
    hay.includes("garrisonville") ||
    hay.includes("hartwood") ||
    hay.includes("rockhill") ||
    hay.includes("south stafford")
  )
    return "Stafford";
  if (
    hay.includes("fredericksburg") ||
    hay.includes("22401") ||
    hay.includes("22407") ||
    hay.includes("22408") ||
    hay.includes("chancellor") ||
    hay.includes("river club") ||
    hay.includes("kingdom baptist") ||
    hay.includes("hope presbyterian") ||
    hay.includes("cyt")
  )
    return "Fredericksburg";
  return "Other";
}

function defaultEstimatedCost(venue: VenueExplorerItem): number {
  const n = venue.name.toLowerCase();
  const cap = venue.seatCount || venue.seatingCapacity || 0;
  if (n.includes("online") || n.includes("tbd")) return 0;
  if (n.includes("cyt theater") || n.includes("cyt studio") || n.includes("cyt warehouse"))
    return 1200;
  if (n.includes("high school") || n.includes("middle school")) {
    return cap >= 800 ? 6000 : 4800;
  }
  if (n.includes("academy")) return 3800;
  if (n.includes("church") || n.includes("worship") || n.includes("fellowship")) {
    if (cap >= 600) return 3200;
    if (cap >= 300) return 2200;
    return 1200;
  }
  if (cap >= 600) return 5000;
  if (cap >= 250) return 2800;
  return 1500;
}

const COST_STORAGE_KEY = "ob_venue_cost_estimates_v1";

export default function VenueExplorerClient({
  tenant,
  venues,
  initialCostEstimates = {},
}: VenueExplorerClientProps) {
  const [search, setSearch] = useState("");
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>("all");
  const [marketFilter, setMarketFilter] = useState<MarketKey | "All">("All");
  const [sortMode, setSortMode] = useState<SortMode>("charts");

  // Season scheduling revenue simulator controls
  const [ticketPrice, setTicketPrice] = useState(15);
  const [performancesPerRun, setPerformancesPerRun] = useState(6);
  const [fillPercent, setFillPercent] = useState(75);

  // Per-venue customizable cost estimates persisted to Neon + localStorage cache
  const [customCosts, setCustomCosts] = useState<Record<number, number>>(() => {
    if (Object.keys(initialCostEstimates).length > 0) return initialCostEstimates;
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(`${COST_STORAGE_KEY}_${tenant}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const costSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<VenueExplorerItem | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const getVenueCost = (v: VenueExplorerItem) =>
    customCosts[v.id] !== undefined ? customCosts[v.id] : defaultEstimatedCost(v);

  const updateVenueCost = (venueId: number, value: number) => {
    const clean = Math.max(0, Math.round(value || 0));
    setCustomCosts((prev) => {
      const next = { ...prev, [venueId]: clean };
      try {
        localStorage.setItem(`${COST_STORAGE_KEY}_${tenant}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      if (costSaveTimerRef.current) clearTimeout(costSaveTimerRef.current);
      costSaveTimerRef.current = setTimeout(() => {
        void saveVenueCostEstimatesAction(tenant, next);
      }, 600);
      return next;
    });
  };

  // Hide obvious retired/junk entries unless searched explicitly
  const visibleVenues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return venues
      .filter((v) => {
        if (!q && /\(old--do not use\)|^location tbd$/i.test(v.name.trim())) {
          return false;
        }
        if (q) {
          const hay = `${v.name} ${v.address || ""} ${inferMarket(v)}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        const cap = v.seatCount || v.seatingCapacity || 0;
        if (sizeFilter === "with_chart" && v.seatCount === 0) return false;
        if (sizeFilter === "mainstage" && cap < 400) return false;
        if (sizeFilter === "midsize" && (cap < 150 || cap >= 400)) return false;
        if (sizeFilter === "intimate" && (cap === 0 || cap >= 150)) return false;
        if (marketFilter !== "All" && inferMarket(v) !== marketFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const capA = a.seatCount || a.seatingCapacity || 0;
        const capB = b.seatCount || b.seatingCapacity || 0;
        if (sortMode === "charts") {
          if ((b.seatCount > 0 ? 1 : 0) !== (a.seatCount > 0 ? 1 : 0)) {
            return b.seatCount > 0 ? 1 : -1;
          }
          if (b.showCount !== a.showCount) return b.showCount - a.showCount;
          return capB - capA;
        }
        if (sortMode === "shows") {
          if (b.showCount !== a.showCount) return b.showCount - a.showCount;
          return capB - capA;
        }
        if (sortMode === "cap_desc") return capB - capA;
        if (sortMode === "cap_asc") return capA - capB;
        if (sortMode === "cost_asc") return getVenueCost(a) - getVenueCost(b);
        return a.name.localeCompare(b.name);
      });
  }, [venues, search, sizeFilter, marketFilter, sortMode, customCosts]);

  const stats = useMemo(() => {
    const withCharts = venues.filter((v) => v.seatCount > 0);
    const totalMappedSeats = withCharts.reduce((acc, v) => acc + v.seatCount, 0);
    return {
      totalVenues: venues.length,
      withCharts: withCharts.length,
      totalMappedSeats,
    };
  }, [venues]);

  const marketCounts = useMemo(() => {
    const counts: Record<MarketKey, number> = {
      Fredericksburg: 0,
      Spotsylvania: 0,
      Stafford: 0,
      "King George": 0,
      Other: 0,
    };
    for (const v of venues) {
      if (/\(old--do not use\)|^location tbd$/i.test(v.name.trim())) continue;
      counts[inferMarket(v)]++;
    }
    return counts;
  }, [venues]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-300 mb-2">
            <Sparkles size={12} /> Season Venue &amp; Seating Planner
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-white">
            Venues &amp; Seating Charts
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            Compare auditorium seating charts, capacities, sub-market proximity, and estimated rental
            economics while scheduling next year&apos;s season.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-2 rounded-2xl bg-zinc-900 border border-white/10 text-xs">
            <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] block">
              Mapped Charts
            </span>
            <span className="text-white font-black text-base">
              {stats.withCharts}{" "}
              <span className="text-xs text-zinc-400 font-semibold">
                ({stats.totalMappedSeats.toLocaleString()} seats)
              </span>
            </span>
          </div>
          <Link
            href="/box-office"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-colors shadow-lg"
          >
            <Armchair size={15} /> Edit Seat Maps
          </Link>
        </div>
      </div>

      {/* SEASON REVENUE & COST SIMULATOR */}
      <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 shrink-0">
            <DollarSign size={16} />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              Run Economics Simulator
            </h2>
            <p className="text-[11px] text-zinc-400">
              Adjust ticket price, performances, and target fill to project gross &amp; net box office across every venue.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
          <label className="block">
            <span className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">
              Avg Ticket ($)
            </span>
            <input
              type="number"
              min={5}
              max={60}
              value={ticketPrice}
              onChange={(e) => setTicketPrice(Math.max(1, Number(e.target.value) || 10))}
              className="w-24 bg-zinc-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-black text-white outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">
              Shows / Run
            </span>
            <input
              type="number"
              min={1}
              max={20}
              value={performancesPerRun}
              onChange={(e) => setPerformancesPerRun(Math.max(1, Number(e.target.value) || 1))}
              className="w-24 bg-zinc-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-black text-white outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">
              Target Fill ({fillPercent}%)
            </span>
            <input
              type="range"
              min={30}
              max={100}
              step={5}
              value={fillPercent}
              onChange={(e) => setFillPercent(Number(e.target.value))}
              className="w-28 accent-emerald-400 mt-1.5"
            />
          </label>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Size / Chart Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "All Venues"],
                ["with_chart", `Seating Charts (${stats.withCharts})`],
                ["mainstage", "Mainstage (400+)"],
                ["midsize", "Mid-Size (150–399)"],
                ["intimate", "Intimate / Lite (<150)"],
              ] as [SizeFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSizeFilter(key)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                  sizeFilter === key
                    ? "bg-white text-zinc-950 border-white shadow"
                    : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search + Sort */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search venue or city..."
                className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5">
              <SlidersHorizontal size={12} className="text-zinc-500" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="bg-transparent text-xs font-bold text-zinc-200 outline-none"
              >
                <option value="charts">Seating Charts First</option>
                <option value="shows">Most Shows Hosted</option>
                <option value="cap_desc">Capacity: High → Low</option>
                <option value="cap_asc">Capacity: Low → High</option>
                <option value="cost_asc">Est. Cost: Low → High</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sub-Market Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mr-1 flex items-center gap-1">
            <MapPin size={11} /> Market:
          </span>
          {(["All", "Fredericksburg", "Spotsylvania", "Stafford", "King George", "Other"] as const).map(
            (mkt) => {
              const isSelected = marketFilter === mkt;
              const style = mkt === "All" ? null : MARKET_STYLES[mkt];
              return (
                <button
                  key={mkt}
                  type="button"
                  onClick={() => setMarketFilter(mkt)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                    isSelected
                      ? "bg-blue-500/20 border-blue-400/50 text-white"
                      : "bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/15"
                  }`}
                >
                  {style && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
                  <span>{mkt}</span>
                  {mkt !== "All" && (
                    <span className="text-[10px] text-zinc-500">{marketCounts[mkt]}</span>
                  )}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* VENUE CARDS GRID */}
      {visibleVenues.length === 0 ? (
        <div className="bg-zinc-900/50 border border-dashed border-white/10 rounded-3xl p-12 text-center text-sm text-zinc-500">
          No venues match those filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleVenues.map((venue) => {
            const market = inferMarket(venue);
            const mktStyle = MARKET_STYLES[market];
            const effectiveCap = venue.seatCount || venue.seatingCapacity || 0;
            const estCost = getVenueCost(venue);
            const projectedTickets = Math.round(
              effectiveCap * (fillPercent / 100) * performancesPerRun
            );
            const projectedGross = projectedTickets * ticketPrice;
            const projectedNet = projectedGross - estCost;

            return (
              <div
                key={venue.id}
                onClick={() => {
                  setSelectedVenue(venue);
                  setActiveSection(null);
                }}
                className="group bg-zinc-900/80 border border-white/10 hover:border-blue-500/40 rounded-3xl overflow-hidden flex flex-col transition-all duration-200 hover:shadow-2xl hover:shadow-blue-950/30 cursor-pointer"
              >
                {/* SEATING CHART PREVIEW */}
                <div className="relative bg-zinc-950 border-b border-white/5 px-3 pt-3 pb-2 min-h-[188px] flex items-center justify-center">
                  {venue.seatCount > 0 ? (
                    <VenueSeatingChart
                      venueName={venue.name}
                      seats={venue.seats}
                      compact
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-6 px-4 gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-600">
                        <Building2 size={22} />
                      </div>
                      <span className="text-xs font-bold text-zinc-500">
                        General Admission / No Seat Map Yet
                      </span>
                      {effectiveCap > 0 && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                          Est. {effectiveCap.toLocaleString()} capacity
                        </span>
                      )}
                    </div>
                  )}

                  {/* Top-left Market Badge */}
                  <span
                    className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${mktStyle.badge}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${mktStyle.dot}`} />
                    {market}
                  </span>

                  {/* Top-right Capacity Pill */}
                  <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-black/75 border border-white/15 text-[10px] font-black text-white backdrop-blur-sm">
                    {effectiveCap > 0 ? `${effectiveCap.toLocaleString()} seats` : "Capacity TBD"}
                  </span>
                </div>

                {/* VENUE INFO BODY */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-black text-white group-hover:text-blue-300 transition-colors leading-snug">
                        {venue.name}
                      </h3>
                      {venue.showCount > 0 && (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-400/25 text-[10px] font-black text-blue-300">
                          <Theater size={10} /> {venue.showCount}
                        </span>
                      )}
                    </div>

                    {venue.address && !/^tbd|verify/i.test(venue.address) ? (
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 truncate">
                        <MapPin size={11} className="text-zinc-500 shrink-0" />
                        <span className="truncate">{venue.address}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-zinc-600 italic">Address not recorded</p>
                    )}

                    {/* Section pills if mapped */}
                    {venue.sections.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {venue.sections.slice(0, 4).map((sec) => (
                          <span
                            key={sec.name}
                            className="px-2 py-0.5 rounded bg-zinc-950 border border-white/5 text-[10px] font-semibold text-zinc-400"
                          >
                            {sec.name} ({sec.count})
                          </span>
                        ))}
                        {venue.sections.length > 4 && (
                          <span className="px-2 py-0.5 rounded bg-zinc-950 text-[10px] font-semibold text-zinc-500">
                            +{venue.sections.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ECONOMICS STRIP */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                        Est. Rental
                      </div>
                      <div className="text-xs font-black text-amber-300 mt-0.5">
                        ${estCost.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                        Proj. Gross
                      </div>
                      <div className="text-xs font-black text-zinc-200 mt-0.5">
                        ${projectedGross.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                        Est. Net
                      </div>
                      <div
                        className={`text-xs font-black mt-0.5 ${
                          projectedNet >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {projectedNet >= 0 ? "+" : "-"}${Math.abs(projectedNet).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL AUDITORIUM INSPECTOR MODAL (Portaled to document.body) */}
      {selectedVenue &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[240] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
            onClick={() => setSelectedVenue(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedVenue.name} venue inspector`}
          >
            <div
              className="w-full max-w-5xl max-h-[92dvh] bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* MODAL HEADER */}
              <div className="px-6 py-4 bg-zinc-900/90 border-b border-white/10 flex items-start justify-between gap-4 shrink-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        MARKET_STYLES[inferMarket(selectedVenue)].badge
                      }`}
                    >
                      {inferMarket(selectedVenue)}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-400">
                      {(selectedVenue.seatCount || selectedVenue.seatingCapacity).toLocaleString()}{" "}
                      Seats
                    </span>
                    {selectedVenue.showCount > 0 && (
                      <span className="text-[11px] font-bold text-blue-300">
                        • {selectedVenue.showCount} CYT{" "}
                        {selectedVenue.showCount === 1 ? "show" : "shows"} hosted
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white truncate">
                    {selectedVenue.name}
                  </h2>
                  {selectedVenue.address && !/^tbd|verify/i.test(selectedVenue.address) && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        selectedVenue.address
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-blue-300 mt-0.5 transition-colors"
                    >
                      <MapPin size={12} />
                      <span>{selectedVenue.address}</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedVenue(null)}
                  className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors shrink-0"
                  aria-label="Close venue inspector"
                >
                  <X size={18} />
                </button>
              </div>

              {/* MODAL BODY */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
                {/* INTERACTIVE AUDITORIUM SEATING CHART */}
                <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                      <Armchair size={14} className="text-blue-400" />
                      Interactive Auditorium Chart
                    </h3>
                    {selectedVenue.sections.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveSection(null)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors ${
                            activeSection === null
                              ? "bg-white text-zinc-950 border-white"
                              : "bg-zinc-950 border-white/10 text-zinc-400 hover:text-white"
                          }`}
                        >
                          All Sections
                        </button>
                        {(() => {
                          const idxMap = new Map(
                            selectedVenue.sections.map((s, i) => [s.name, i])
                          );
                          return selectedVenue.sections.map((sec) => {
                            const col = getSectionColor(sec.name, idxMap);
                            const isSelected = activeSection === sec.name;
                            return (
                              <button
                                key={sec.name}
                                type="button"
                                onClick={() =>
                                  setActiveSection(isSelected ? null : sec.name)
                                }
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                  isSelected
                                    ? "bg-zinc-800 border-white/40 text-white"
                                    : "bg-zinc-950 border-white/10 text-zinc-400 hover:text-white"
                                }`}
                              >
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: col.fill }}
                                />
                                <span>{sec.name}</span>
                                <span className="text-zinc-500">({sec.count})</span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>

                  <VenueSeatingChart
                    venueName={selectedVenue.name}
                    seats={selectedVenue.seats}
                    highlightSection={activeSection}
                  />
                </div>

                {/* COST ESTIMATE & HISTORICAL PERFORMANCE GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Editable Rental Cost & Projection */}
                  <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                      <DollarSign size={13} /> Estimated Run Budget &amp; Revenue
                    </h3>

                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-semibold text-zinc-300">
                        Est. Venue Rental / Production Run ($)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={getVenueCost(selectedVenue)}
                        onChange={(e) =>
                          updateVenueCost(selectedVenue.id, Number(e.target.value))
                        }
                        className="w-32 bg-zinc-950 border border-white/15 rounded-xl px-3 py-1.5 text-sm font-black text-amber-300 text-right outline-none focus:border-blue-500"
                      />
                    </div>

                    {(() => {
                      const cap = selectedVenue.seatCount || selectedVenue.seatingCapacity || 0;
                      const estCost = getVenueCost(selectedVenue);
                      const projTickets = Math.round(
                        cap * (fillPercent / 100) * performancesPerRun
                      );
                      const projGross = projTickets * ticketPrice;
                      const projNet = projGross - estCost;
                      return (
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center">
                          <div className="bg-zinc-950 rounded-xl p-2.5 border border-white/5">
                            <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                              Tickets ({fillPercent}%)
                            </div>
                            <div className="text-sm font-black text-white mt-0.5">
                              {projTickets.toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-zinc-950 rounded-xl p-2.5 border border-white/5">
                            <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                              Gross (${ticketPrice})
                            </div>
                            <div className="text-sm font-black text-blue-300 mt-0.5">
                              ${projGross.toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-zinc-950 rounded-xl p-2.5 border border-white/5">
                            <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                              Net After Venue
                            </div>
                            <div
                              className={`text-sm font-black mt-0.5 ${
                                projNet >= 0 ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {projNet >= 0 ? "+" : "-"}${Math.abs(projNet).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Historical CYT Productions at this Venue */}
                  <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                        <Ticket size={13} /> CYT History Here ({selectedVenue.showCount})
                      </h3>
                      {selectedVenue.totalTicketsSold > 0 && (
                        <span className="text-[11px] font-bold text-zinc-400">
                          {selectedVenue.totalTicketsSold.toLocaleString()} tickets sold
                        </span>
                      )}
                    </div>

                    {selectedVenue.recentShows.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic py-4">
                        No past productions linked to this venue yet.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedVenue.recentShows.map((sh) => (
                          <Link
                            key={sh.id}
                            href={`/production/${sh.id}/cast`}
                            onClick={() => setSelectedVenue(null)}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-white/5 hover:border-blue-500/30 transition-colors"
                          >
                            <span className="text-xs font-bold text-white truncate">
                              {sh.title}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0">
                              {sh.sessionLabel || sh.status || "Archive"}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="px-6 py-3.5 bg-zinc-900/60 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                  <Users size={12} /> Rental estimates save automatically in your browser.
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href="/box-office"
                    onClick={() => setSelectedVenue(null)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-colors"
                  >
                    Open in Seat Map Builder
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedVenue(null)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-black uppercase tracking-wider text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
