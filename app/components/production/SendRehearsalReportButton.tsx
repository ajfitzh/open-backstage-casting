"use client";

import React, { useState } from "react";
import { Mail, Loader2, Send, X } from "lucide-react";
import { toast } from "@/app/components/ToastProvider";
import { sendRehearsalReportEmailAction } from "@/app/actions/phase2-ops";

export default function SendRehearsalReportButton({
  tenant,
  productionId,
  reportDate,
  presentCount,
  lateNames,
  absentNames,
}: {
  tenant: string;
  productionId: number;
  reportDate: string;
  presentCount: number;
  lateNames: string[];
  absentNames: string[];
}) {
  const [open, setOpen] = useState(false);
  const [highlights, setHighlights] = useState("");
  const [techCostumeNotes, setTechCostumeNotes] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const res = await sendRehearsalReportEmailAction(tenant, productionId, {
      reportDate,
      presentCount,
      lateNames,
      absentNames,
      highlights,
      techCostumeNotes,
    });
    setSending(false);
    if (!res.success) {
      toast.error(res.error || "Could not send rehearsal report.");
      return;
    }
    toast.success(`Nightly rehearsal report emailed to ${res.recipientCount} team member(s)!`);
    setOpen(false);
    setHighlights("");
    setTechCostumeNotes("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg transition-colors"
      >
        <Mail size={14} /> Email Nightly Report to Team
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[260] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !sending && setOpen(false)}
        >
          <form
            onSubmit={handleSend}
            className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Email Rehearsal Report ({reportDate})
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-300 space-y-1">
              <div>
                <strong className="text-white">Present:</strong> {presentCount}
              </div>
              <div>
                <strong className="text-amber-300">Late:</strong>{" "}
                {lateNames.length ? lateNames.join(", ") : "None"}
              </div>
              <div>
                <strong className="text-red-300">Absent:</strong>{" "}
                {absentNames.length ? absentNames.join(", ") : "None"}
              </div>
            </div>

            <label className="block space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase text-zinc-400">
                Rehearsal Highlights &amp; Run Notes
              </span>
              <textarea
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                placeholder="Blocked Act I Scenes 1-3, vocal run on opening number..."
                className="w-full min-h-[84px] bg-zinc-900 border border-white/10 rounded-xl p-3 text-white placeholder:text-zinc-500"
              />
            </label>

            <label className="block space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase text-zinc-400">
                Costumes, Props &amp; Tech Follow-Ups
              </span>
              <textarea
                value={techCostumeNotes}
                onChange={(e) => setTechCostumeNotes(e.target.value)}
                placeholder="Need rehearsal skirt for Belle, mic #4 battery clip cracked..."
                className="w-full min-h-[72px] bg-zinc-900 border border-white/10 rounded-xl p-3 text-white placeholder:text-zinc-500"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={sending}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                Send Report
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
