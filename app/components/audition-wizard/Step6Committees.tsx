// app/components/audition-wizard/Step6Committees.tsx
"use client";

import React from "react";
import { AlertCircle, BookOpen, Crown, Sparkles } from "lucide-react";
import { AuditionFormData, PRE_SHOW_COMMITTEES, SHOW_COMMITTEES } from "./types";

interface Props {
  formData: AuditionFormData;
  updateForm: (fields: Partial<AuditionFormData>) => void;
  errors: Record<string, string>;
  setShowCommitteeGuide: (show: boolean) => void;
  isLiteShow?: boolean;
}

const PRE_SHOW_OPTIONS = ["Anywhere Needed", ...PRE_SHOW_COMMITTEES];
const SHOW_WEEK_OPTIONS = ["Anywhere Needed", ...SHOW_COMMITTEES];
const ALL_CHAIR_OPTIONS = Array.from(new Set([...PRE_SHOW_COMMITTEES, ...SHOW_COMMITTEES]));

export function Step6Committees({
  formData,
  updateForm,
  errors,
  setShowCommitteeGuide,
  isLiteShow = false,
}: Props) {
  const handleQuickFill = () => {
    updateForm({
      preShow1: "Anywhere Needed",
      preShow2: "Anywhere Needed",
      preShow3: "Anywhere Needed",
      show1: "Anywhere Needed",
      show2: "Anywhere Needed",
      show3: "Anywhere Needed",
    });
  };

  if (isLiteShow) {
    return (
      <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-right-8 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">
              Parent Committees
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm sm:text-base font-medium leading-relaxed">
              As this is a CYT Lite / KIDS production, mainstage committee selections are not
              required. You will acknowledge your parent volunteer commitment on the next screen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10 animate-in slide-in-from-right-8 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">
            Parent Committees
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm sm:text-base font-medium leading-relaxed">
            Every mainstage family serves on a Pre-Show and a Show Week committee. Rank your top 3
            preferences below so we can match you with your favorite team!
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCommitteeGuide(true)}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-200 transition-colors"
        >
          <BookOpen size={15} /> Committee Guide
        </button>
      </div>

      {/* 1-Click Flexible Helper */}
      <button
        type="button"
        onClick={handleQuickFill}
        className="w-full p-4 sm:p-5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-300 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
      >
        <Sparkles size={18} /> I&apos;m flexible! Put me anywhere needed.
      </button>

      {/* Pre-Show & Show Week Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* PRE-SHOW */}
        <div
          id="field-preShow1"
          className="p-5 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-4"
        >
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Pre-Show Committee
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Prep &amp; build work during the rehearsal weeks leading up to Tech Week.
            </p>
          </div>

          {(
            [
              { key: "preShow1", label: "1st Choice *" },
              { key: "preShow2", label: "2nd Choice" },
              { key: "preShow3", label: "3rd Choice" },
            ] as const
          ).map(({ key, label }) => (
            <div key={key}>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                {label}
              </label>
              <select
                value={formData[key] || ""}
                onChange={(e) => updateForm({ [key]: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors[key]
                    ? "border-red-500"
                    : "border-zinc-200 dark:border-zinc-700"
                }`}
              >
                <option value="">-- Select Committee --</option>
                {PRE_SHOW_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {errors.preShow1 && (
            <p className="text-xs font-bold text-red-500 flex items-center gap-1.5">
              <AlertCircle size={14} /> {errors.preShow1}
            </p>
          )}
        </div>

        {/* SHOW WEEK */}
        <div
          id="field-show1"
          className="p-5 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-4"
        >
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Show Week Committee
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              On-site backstage, front-of-house, or crew support during performances.
            </p>
          </div>

          {(
            [
              { key: "show1", label: "1st Choice *" },
              { key: "show2", label: "2nd Choice" },
              { key: "show3", label: "3rd Choice" },
            ] as const
          ).map(({ key, label }) => (
            <div key={key}>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                {label}
              </label>
              <select
                value={formData[key] || ""}
                onChange={(e) => updateForm({ [key]: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 ${
                  errors[key]
                    ? "border-red-500"
                    : "border-zinc-200 dark:border-zinc-700"
                }`}
              >
                <option value="">-- Select Committee --</option>
                {SHOW_WEEK_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {errors.show1 && (
            <p className="text-xs font-bold text-red-500 flex items-center gap-1.5">
              <AlertCircle size={14} /> {errors.show1}
            </p>
          )}
        </div>
      </div>

      {/* CHAIR INTEREST */}
      <div
        id="field-chairInterest"
        className="p-5 sm:p-6 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-4"
      >
        <div className="flex items-start gap-3">
          <Crown size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
              Interested in Chairing a Committee?
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Committee Chairs coordinate their parent team and help keep the production running
              smoothly.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {(
            [
              { val: "yes", label: "Yes, I'd love to!" },
              { val: "maybe", label: "Maybe / Co-Chair" },
              { val: "no", label: "Not this show" },
            ] as const
          ).map(({ val, label }) => (
            <button
              key={val}
              type="button"
              onClick={() => updateForm({ chairInterest: val })}
              className={`py-2.5 px-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
                formData.chairInterest === val
                  ? "bg-amber-500 text-white border-amber-500 shadow-md"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {(formData.chairInterest === "yes" || formData.chairInterest === "maybe") && (
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
              Which committee would you like to Chair / Co-Chair?
            </label>
            <select
              value={formData.chairPreference || ""}
              onChange={(e) => updateForm({ chairPreference: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- Select Committee --</option>
              {ALL_CHAIR_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
