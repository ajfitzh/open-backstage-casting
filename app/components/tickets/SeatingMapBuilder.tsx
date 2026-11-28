// app/components/tickets/SeatingMapBuilder.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Accessibility, Armchair, Grid, Loader2, Save, Sparkles } from "lucide-react";
import { getVenueSeatsAction, saveVenueSeatsAction } from "@/app/actions/phase3-ops";
import VenueSeatingChart from "./VenueSeatingChart";
import {
  generateVenueSeatGrid,
  nextSeatStatus,
  type SeatDraft,
  type SeatStatus,
} from "@/app/lib/phase3-helpers";

interface VenueItem {
  id: number;
  name: string;
  seatingCapacity: number;
}

function seatStyles(status: SeatStatus) {
  if (status === "vip") return "bg-amber-500/25 border-amber-400 text-amber-200";
  if (status === "accessible") return "bg-blue-500/25 border-blue-400 text-blue-200";
  if (status === "blocked") return "bg-zinc-900 border-white/5 text-zinc-600 line-through opacity-40";
  return "bg-emerald-500/20 border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/30";
}

export default function SeatingMapBuilder({
  tenant,
  defaultVenueId,
  defaultVenueName,
}: {
  tenant: string;
  defaultVenueId?: number | null;
  defaultVenueName?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<number>(0);
  const [seatsByVenue, setSeatsByVenue] = useState<Record<number, SeatDraft[]>>({});

  const [sectionName, setSectionName] = useState("Orchestra");
  const [rowCount, setRowCount] = useState(6);
  const [seatsPerRow, setSeatsPerRow] = useState(12);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await getVenueSeatsAction(tenant);
      if (!active) return;
      if (res.success) {
        setVenues(res.venues);
        setSeatsByVenue(res.seatsByVenue);
        if (res.venues.length > 0) {
          const byId = defaultVenueId
            ? res.venues.find((v) => v.id === defaultVenueId)
            : undefined;
          const byName =
            !byId && defaultVenueName
              ? res.venues.find(
                  (v) => v.name.toLowerCase() === defaultVenueName.trim().toLowerCase()
                ) ||
                res.venues.find((v) =>
                  v.name.toLowerCase().includes(defaultVenueName.trim().toLowerCase())
                )
              : undefined;
          const firstWithSeats =
            !byId && !byName
              ? res.venues.find((v) => (res.seatsByVenue[v.id]?.length || 0) > 0)
              : undefined;
          setSelectedVenueId((byId || byName || firstWithSeats || res.venues[0]).id);
        }
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [tenant, defaultVenueId, defaultVenueName]);

  const currentSeats = useMemo(
    () => (selectedVenueId ? seatsByVenue[selectedVenueId] || [] : []),
    [seatsByVenue, selectedVenueId]
  );

  const rowsGrouped = useMemo(() => {
    const map = new Map<string, SeatDraft[]>();
    for (const s of currentSeats) {
      const key = `${s.section} • Row ${s.rowLabel}`;
      const list = map.get(key) || [];
      list.push(s);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [currentSeats]);

  const counts = useMemo(() => {
    let available = 0;
    let vip = 0;
    let accessible = 0;
    let blocked = 0;
    for (const s of currentSeats) {
      if (s.status === "vip") vip++;
      else if (s.status === "accessible") accessible++;
      else if (s.status === "blocked") blocked++;
      else available++;
    }
    return { available, vip, accessible, blocked, sellable: available + vip + accessible };
  }, [currentSeats]);

  const handleGenerate = () => {
    if (!selectedVenueId) return;
    const generated = generateVenueSeatGrid({
      section: sectionName,
      rowCount,
      seatsPerRow,
    });
    setSeatsByVenue((prev) => ({ ...prev, [selectedVenueId]: generated }));
    setFeedback({
      kind: "ok",
      text: `Generated ${generated.length} seats. Click any seat to cycle status, then Save Map.`,
    });
  };

  const handleToggleSeat = (index: number) => {
    if (!selectedVenueId) return;
    setSeatsByVenue((prev) => {
      const list = [...(prev[selectedVenueId] || [])];
      if (!list[index]) return prev;
      list[index] = { ...list[index], status: nextSeatStatus(list[index].status) };
      return { ...prev, [selectedVenueId]: list };
    });
  };

  const handleSave = async () => {
    if (!selectedVenueId) return;
    setSaving(true);
    setFeedback(null);
    const res = await saveVenueSeatsAction(tenant, selectedVenueId, currentSeats);
    setSaving(false);
    if (!res.success) {
      setFeedback({ kind: "err", text: res.error || "Failed to save seating map." });
    } else {
      setFeedback({
        kind: "ok",
        text: `Saved ${res.savedCount} seats (${res.activeCapacity} sellable capacity).`,
      });
    }
  };

  return (
    <section className="bg-zinc-900 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Armchair size={18} className="text-blue-400" />
            Reserved Seating Map Builder
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Design your venue layout and click any seat to toggle Standard, VIP, Accessible, or Blocked.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {venues.length > 0 && (
            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(Number(e.target.value))}
              className="bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.seatingCapacity} cap)
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            disabled={saving || !selectedVenueId}
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Map
          </button>
        </div>
      </div>

      {/* Quick Grid Generator */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950 border border-white/10 rounded-xl p-3.5 items-end">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
            Section
          </label>
          <input
            type="text"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
            Rows (1–26)
          </label>
          <input
            type="number"
            min={1}
            max={26}
            value={rowCount}
            onChange={(e) => setRowCount(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
            Seats / Row
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={seatsPerRow}
            onChange={(e) => setSeatsPerRow(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
          />
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          className="py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
        >
          <Grid size={13} /> Generate Grid
        </button>
      </div>

      {/* Legend & Counts */}
      {feedback && (
        <div
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border ${
            feedback.kind === "ok"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          {feedback.text}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          Standard: {counts.available}
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
          <Sparkles size={11} /> VIP: {counts.vip}
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
          <Accessibility size={11} /> Accessible: {counts.accessible}
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 border border-white/10">
          Blocked: {counts.blocked}
        </span>
        <span className="ml-auto text-zinc-300 font-mono">
          Total Sellable: {counts.sellable}
        </span>
      </div>

      {/* Interactive Stage + Seat Canvas */}
      {loading ? (
        <div className="py-10 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Loading venue seat map...
        </div>
      ) : currentSeats.length === 0 ? (
        <div className="py-10 text-center text-zinc-500 text-xs bg-zinc-950 rounded-xl border border-dashed border-white/10">
          No seats configured yet for this venue. Click <strong>Generate Grid</strong> above to start.
        </div>
      ) : (
        <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 space-y-5">
          {/* Interactive 2D SVG Auditorium Chart */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-3">
            <VenueSeatingChart
              venueName={venues.find((v) => v.id === selectedVenueId)?.name || "Venue"}
              seats={currentSeats.map((s, idx) => ({
                id: s.id ?? idx + 1,
                section: s.section,
                rowLabel: s.rowLabel,
                seatNumber: s.seatNumber,
                status: s.status,
                gridX: s.gridX,
                gridY: s.gridY,
              }))}
            />
          </div>

          <div className="overflow-x-auto space-y-3">
            <div className="max-w-md mx-auto py-1.5 rounded-b-3xl bg-gradient-to-b from-blue-600/20 to-transparent border-b-2 border-blue-500/50 text-center text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">
              Seat Status Editor (Click to Toggle)
            </div>
            <div className="space-y-2 min-w-max">
            {rowsGrouped.map(([rowKey, seats]) => (
              <div key={rowKey} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-[10px] font-black uppercase text-zinc-500 truncate">
                  {rowKey}
                </span>
                <div className="flex items-center gap-1.5">
                  {seats.map((seat) => {
                    const flatIdx = currentSeats.indexOf(seat);
                    return (
                      <button
                        key={`${seat.section}-${seat.rowLabel}-${seat.seatNumber}`}
                        type="button"
                        onClick={() => handleToggleSeat(flatIdx)}
                        title={`${seat.section} ${seat.rowLabel}${seat.seatNumber} (${seat.status}) — click to change`}
                        className={`w-7 h-7 rounded-lg border text-[10px] font-mono font-bold transition-all ${seatStyles(seat.status)}`}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
