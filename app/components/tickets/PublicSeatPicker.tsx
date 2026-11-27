"use client";

import React, { useMemo } from "react";
import { Accessibility, Check, Loader2, Sparkles, X } from "lucide-react";
import {
  formatSeatLabel,
  formatShortSeatTag,
  groupSeatsForDisplay,
  type PublicSeatItem,
} from "@/app/lib/seat-picker-helpers";
import { triggerHaptic } from "@/app/lib/capacitor-native";

interface PublicSeatPickerProps {
  venueName: string;
  seats: PublicSeatItem[];
  selectedSeatIds: number[];
  maxSelectable: number;
  loading?: boolean;
  onToggleSeat: (seatId: number) => void;
  onClearSelection: () => void;
}

export default function PublicSeatPicker({
  venueName,
  seats,
  selectedSeatIds,
  maxSelectable,
  loading = false,
  onToggleSeat,
  onClearSelection,
}: PublicSeatPickerProps) {
  const sections = useMemo(() => groupSeatsForDisplay(seats), [seats]);
  const selectedSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);
  const seatById = useMemo(() => new Map(seats.map((s) => [s.id, s])), [seats]);

  const availableCount = useMemo(
    () => seats.filter((s) => s.availability === "available" || s.availability === "ada").length,
    [seats]
  );

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 flex items-center justify-center gap-3 text-xs font-bold text-zinc-400">
        <Loader2 size={16} className="animate-spin text-blue-400" />
        Loading interactive seating map...
      </div>
    );
  }

  return (
    <section className="bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
            <Sparkles size={11} /> Reserved Seating • {venueName}
          </p>
          <h3 className="text-lg font-black text-white mt-0.5">
            Choose Your Seats ({selectedSeatIds.length}/{maxSelectable})
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold text-zinc-400">
          <span className="text-emerald-400">{availableCount} available</span>
          {selectedSeatIds.length > 0 && (
            <button
              type="button"
              onClick={onClearSelection}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* STAGE BANNER */}
      <div className="relative py-2.5 px-6 rounded-2xl bg-gradient-to-b from-blue-500/20 to-zinc-950 border border-blue-500/30 text-center">
        <span className="text-[11px] font-black uppercase tracking-[0.35em] text-blue-300">
          STAGE
        </span>
      </div>

      {/* LEGEND */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-semibold text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-zinc-800 border border-emerald-500/50" />
          Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-sky-500/20 border border-sky-400/60 flex items-center justify-center">
            <Accessibility size={9} className="text-sky-300" />
          </span>
          Accessible (ADA)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-400" />
          Selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-zinc-900 border border-zinc-800 opacity-40" />
          Taken / Held
        </span>
      </div>

      {/* SECTIONS & ROWS */}
      <div className="space-y-6 overflow-x-auto pb-2 custom-scrollbar">
        {sections.map((sec) => (
          <div
            key={sec.section}
            className="bg-zinc-950/70 border border-white/5 rounded-2xl p-4 space-y-2.5 min-w-fit"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">
              {sec.section}
            </p>
            <div className="space-y-1.5">
              {sec.rows.map((row) => (
                <div key={`${sec.section}-${row.rowLabel}`} className="flex items-center gap-2 justify-center">
                  <span className="w-6 text-[10px] font-black text-zinc-500 text-right shrink-0">
                    {row.rowLabel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {row.seats.map((seat) => {
                      const isSelected = selectedSet.has(seat.id);
                      const isDisabled = seat.availability === "taken" || seat.availability === "held";
                      const isAda = seat.availability === "ada";
                      const atLimit = !isSelected && selectedSeatIds.length >= maxSelectable;

                      return (
                        <button
                          key={seat.id}
                          type="button"
                          disabled={isDisabled || atLimit}
                          title={
                            isDisabled
                              ? `${formatSeatLabel(seat)} — Unavailable`
                              : formatSeatLabel(seat)
                          }
                          onClick={() => {
                            void triggerHaptic("light");
                            onToggleSeat(seat.id);
                          }}
                          className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all flex items-center justify-center shrink-0 ${
                            isDisabled
                              ? "bg-zinc-900 border border-zinc-800/80 text-zinc-700 cursor-not-allowed opacity-40"
                              : isSelected
                              ? "bg-blue-600 border border-blue-400 text-white shadow-md shadow-blue-600/30 scale-105"
                              : isAda
                              ? "bg-sky-500/15 border border-sky-400/50 text-sky-300 hover:bg-sky-500/30 disabled:opacity-40"
                              : "bg-zinc-800/90 border border-emerald-500/40 text-zinc-200 hover:bg-emerald-500/20 hover:border-emerald-400 disabled:opacity-40"
                          }`}
                        >
                          {isSelected ? (
                            <Check size={13} />
                          ) : isAda ? (
                            <Accessibility size={13} />
                          ) : (
                            seat.seatNumber
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <span className="w-6 text-[10px] font-black text-zinc-500 text-left shrink-0">
                    {row.rowLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* SELECTED SEAT PILLS */}
      {selectedSeatIds.length > 0 && (
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mr-1">
            Your Seats:
          </span>
          {selectedSeatIds.map((sid) => {
            const seat = seatById.get(sid);
            if (!seat) return null;
            return (
              <button
                key={sid}
                type="button"
                onClick={() => onToggleSeat(sid)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-200 text-[11px] font-bold hover:bg-blue-600/30 transition-colors"
              >
                <span>
                  {seat.section ? `${seat.section} ` : ""}
                  {formatShortSeatTag(seat)}
                </span>
                <X size={11} />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
