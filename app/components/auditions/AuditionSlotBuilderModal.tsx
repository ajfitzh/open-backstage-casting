"use client";

import React, { useMemo, useState } from "react";
import { X, CalendarClock, Loader2, Plus } from "lucide-react";
import { toast } from "@/app/components/ToastProvider";
import { generateAuditionSlotsPlan } from "@/app/lib/audition-slot-planner";
import { bulkCreateAuditionSlotsAction } from "@/app/actions/audition-panel";

export default function AuditionSlotBuilderModal({
  tenant,
  productionId,
  onCreated,
  onClose,
}: {
  tenant: string;
  productionId: number;
  onCreated: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("20:00");
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [capacity, setCapacity] = useState(12);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(
    () =>
      generateAuditionSlotsPlan({
        date,
        startTime,
        endTime,
        slotMinutes,
        capacity,
      }),
    [date, startTime, endTime, slotMinutes, capacity]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview.ok) {
      toast.error(preview.error);
      return;
    }
    setSaving(true);
    const res = await bulkCreateAuditionSlotsAction(tenant, productionId, preview.slots);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Could not create audition slots.");
      return;
    }
    toast.success(`Created ${res.createdCount} audition slot(s)!`);
    await onCreated();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[260] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !saving && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <CalendarClock size={16} className="text-blue-400" /> Generate Standardized Audition Slots
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
            aria-label="Close Slot Generator"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="space-y-1">
            <span className="text-zinc-400 font-semibold uppercase text-[10px]">Audition Date</span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-zinc-400 font-semibold uppercase text-[10px]">
              Actors per Slot
            </span>
            <input
              type="number"
              min={1}
              max={200}
              required
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-zinc-400 font-semibold uppercase text-[10px]">Start Time</span>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-zinc-400 font-semibold uppercase text-[10px]">End Time</span>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
            />
          </label>
        </div>

        <label className="block space-y-1 text-xs">
          <span className="text-zinc-400 font-semibold uppercase text-[10px]">Slot Length</span>
          <select
            value={slotMinutes}
            onChange={(e) => setSlotMinutes(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
          >
            <option value={10}>10 minutes (Individual)</option>
            <option value={15}>15 minutes (Individual / Pair)</option>
            <option value={30}>30 minutes (Small Group)</option>
            <option value={60}>60 minutes (Standard Group Block)</option>
            <option value={90}>90 minutes (Extended Block)</option>
          </select>
        </label>

        {/* Live Preview */}
        <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/10 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Preview ({preview.ok ? `${preview.slots.length} slots` : "Invalid range"})
          </p>
          {preview.ok ? (
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
              {preview.slots.map((s) => (
                <span
                  key={s.timeLabel}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 text-[11px] font-semibold"
                >
                  {s.timeLabel} (cap {s.capacity})
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-red-400">{preview.error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 text-xs font-semibold text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !preview.ok}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create Slots
          </button>
        </div>
      </form>
    </div>
  );
}
