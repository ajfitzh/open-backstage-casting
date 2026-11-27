"use client";

import { useOptimistic, useState, startTransition } from 'react';
import {
  Check,
  ClipboardList,
  CalendarClock,
  Truck,
  Hammer,
  Ticket,
  X,
} from 'lucide-react';
import { toggleWorkflowTag } from '@/app/lib/actions';

type PhaseId = 'prepro' | 'grind' | 'tech' | 'run';

const PHASES: { id: PhaseId; label: string; shortLabel: string }[] = [
  { id: 'prepro', label: 'Pre-Production', shortLabel: 'Pre-Pro' },
  { id: 'grind', label: '10-Week Rehearsals', shortLabel: 'Rehearsals' },
  { id: 'tech', label: 'Tech Week', shortLabel: 'Tech Week' },
  { id: 'run', label: 'Show Run', shortLabel: 'Show Run' },
];

const PRE_PRO_STEPS = [
  { key: 'auditions', label: 'Auditions Complete' },
  { key: 'callbacks', label: 'Callbacks Done' },
  { key: 'casting', label: 'Cast List Posted' },
  { key: 'first_reh', label: '1st Rehearsal Planned' },
];

const TECH_DAYS = [
  { key: 'superSat', label: 'Super Saturday', icon: <Truck size={13} /> },
  { key: 'tech_mon', label: 'Tech Mon', icon: <Hammer size={13} /> },
  { key: 'tech_tue', label: 'Tech Tue', icon: <Hammer size={13} /> },
  { key: 'tech_wed', label: 'Tech Wed', icon: <Hammer size={13} /> },
  { key: 'tech_thu', label: 'Final Dress', icon: <Ticket size={13} /> },
];

const RUN_STEPS = [
  { key: 'weekend1', label: 'Opening Weekend', sub: 'Shows 1–4' },
  { key: 'weekend2', label: 'Closing Weekend', sub: 'Shows 5–8 & Strike' },
];

export default function WorkflowProgress({
  status,
  productionId,
}: {
  status: { tags?: string[]; [key: string]: unknown };
  productionId: number;
}) {
  const [optimisticTags, toggleOptimistic] = useOptimistic(
    Array.isArray(status?.tags) ? status.tags : [],
    (currentTags: string[], tagToToggle: string) =>
      currentTags.includes(tagToToggle)
        ? currentTags.filter((t) => t !== tagToToggle)
        : [...currentTags, tagToToggle]
  );

  const [expandedPhase, setExpandedPhase] = useState<PhaseId | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);

  const handleToggle = (tag: string) => {
    startTransition(() => {
      toggleOptimistic(tag);
      toggleWorkflowTag(productionId, tag);
    });
  };

  const isDone = (tag: string) => optimisticTags.includes(tag);

  const getPhaseCounts = (phase: PhaseId): { done: number; total: number } => {
    if (phase === 'prepro') {
      return {
        done: PRE_PRO_STEPS.filter((s) => isDone(s.key)).length,
        total: PRE_PRO_STEPS.length,
      };
    }
    if (phase === 'grind') {
      let done = 0;
      for (let w = 1; w <= 10; w++) {
        if (isDone(`W${w}_Report`) && isDone(`W${w}_Sched`)) done++;
      }
      return { done, total: 10 };
    }
    if (phase === 'tech') {
      return {
        done: TECH_DAYS.filter((d) => isDone(d.key)).length,
        total: TECH_DAYS.length,
      };
    }
    return {
      done: RUN_STEPS.filter((r) => isDone(r.key)).length,
      total: RUN_STEPS.length,
    };
  };

  const phaseStats = PHASES.map((phase) => {
    const { done, total } = getPhaseCounts(phase.id);
    return { ...phase, done, total, ratio: total > 0 ? done / total : 0 };
  });

  const overallRatio =
    phaseStats.reduce((sum, p) => sum + p.ratio, 0) / phaseStats.length;
  const overallPercent = Math.round(overallRatio * 100);

  // First incomplete phase gets the "current" highlight
  const firstIncompleteIdx = phaseStats.findIndex((p) => p.done < p.total);

  // Line fill spans cleanly between the 4 milestone dots (0% to 100%)
  const completedSegments =
    phaseStats[0].ratio * (1 / 3) +
    phaseStats[1].ratio * (1 / 3) +
    ((phaseStats[2].ratio + phaseStats[3].ratio) / 2) * (1 / 3);
  const lineFillPercent = Math.min(100, Math.max(0, Math.round(completedSegments * 100)));

  const togglePhase = (id: PhaseId) => {
    setExpandedPhase((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4">
      {/* TOP MICRO HEADER */}
      <div className="flex items-center justify-between gap-4 mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Show Progress
          </span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {overallPercent}%
          </span>
        </div>

        {expandedPhase ? (
          <button
            type="button"
            onClick={() => setExpandedPhase(null)}
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
          >
            Close <X size={12} />
          </button>
        ) : (
          <span className="text-[10px] font-medium text-zinc-600 hidden sm:inline">
            Click a milestone to update
          </span>
        )}
      </div>

      {/* HORIZONTAL LINE & DOTS TIMELINE */}
      <div className="relative px-2 sm:px-6 pt-1 pb-0.5">
        {/* Background Rail */}
        <div className="absolute left-8 right-8 sm:left-12 sm:right-12 top-[15px] h-0.5 bg-zinc-800 rounded-full" />
        {/* Filled Progress Rail */}
        <div
          className="absolute left-8 sm:left-12 top-[15px] h-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-500"
          style={{ width: `calc((100% - 4rem) * ${lineFillPercent / 100})` }}
        />

        {/* 4 MILESTONE DOTS */}
        <div className="relative z-10 grid grid-cols-4 gap-2">
          {phaseStats.map((phase, idx) => {
            const isComplete = phase.done === phase.total;
            const isCurrent = idx === firstIncompleteIdx;
            const isSelected = expandedPhase === phase.id;

            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => togglePhase(phase.id)}
                className="group flex flex-col items-center text-center focus:outline-none"
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isComplete
                      ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : isCurrent || phase.done > 0
                        ? 'bg-zinc-950 border-2 border-blue-400 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                        : 'bg-zinc-950 border-2 border-zinc-700 text-zinc-600 group-hover:border-zinc-500'
                  } ${isSelected ? 'ring-4 ring-white/15 scale-110' : 'group-hover:scale-110'}`}
                >
                  {isComplete ? (
                    <Check size={12} strokeWidth={3.5} />
                  ) : isCurrent || phase.done > 0 ? (
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-zinc-500" />
                  )}
                </span>

                <span
                  className={`mt-2 text-[11px] font-bold tracking-tight transition-colors ${
                    isSelected
                      ? 'text-white'
                      : isComplete
                        ? 'text-emerald-400'
                        : isCurrent
                          ? 'text-zinc-200'
                          : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                >
                  <span className="hidden sm:inline">{phase.label}</span>
                  <span className="sm:hidden">{phase.shortLabel}</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {phase.done}/{phase.total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* COMPACT EXPANDABLE CHECKLIST DRAWER */}
      {expandedPhase && (
        <div className="mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
          {expandedPhase === 'prepro' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {PRE_PRO_STEPS.map((step) => (
                <CompactCheckPill
                  key={step.key}
                  label={step.label}
                  checked={isDone(step.key)}
                  onClick={() => handleToggle(step.key)}
                  accent="blue"
                />
              ))}
            </div>
          )}

          {expandedPhase === 'grind' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => {
                  const wDone = isDone(`W${w}_Report`) && isDone(`W${w}_Sched`);
                  const wPartial =
                    !wDone && (isDone(`W${w}_Report`) || isDone(`W${w}_Sched`));
                  const active = currentWeek === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setCurrentWeek(w)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                        active
                          ? 'bg-white text-zinc-950 border-white'
                          : wDone
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                            : wPartial
                              ? 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25'
                              : 'bg-zinc-950 text-zinc-500 border-white/5 hover:text-zinc-200'
                      }`}
                    >
                      W{w}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <CompactCheckPill
                  label={`Week ${currentWeek} Rehearsal Reports`}
                  icon={<ClipboardList size={14} />}
                  checked={isDone(`W${currentWeek}_Report`)}
                  onClick={() => handleToggle(`W${currentWeek}_Report`)}
                  accent="emerald"
                />
                <CompactCheckPill
                  label={`Week ${currentWeek + 1} Schedule Posted`}
                  icon={<CalendarClock size={14} />}
                  checked={isDone(`W${currentWeek}_Sched`)}
                  onClick={() => handleToggle(`W${currentWeek}_Sched`)}
                  accent="emerald"
                />
              </div>
            </div>
          )}

          {expandedPhase === 'tech' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {TECH_DAYS.map((day) => (
                <CompactCheckPill
                  key={day.key}
                  label={day.label}
                  icon={day.icon}
                  checked={isDone(day.key)}
                  onClick={() => handleToggle(day.key)}
                  accent="purple"
                />
              ))}
            </div>
          )}

          {expandedPhase === 'run' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RUN_STEPS.map((run) => (
                <CompactCheckPill
                  key={run.key}
                  label={`${run.label} (${run.sub})`}
                  icon={<Ticket size={14} />}
                  checked={isDone(run.key)}
                  onClick={() => handleToggle(run.key)}
                  accent="purple"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CompactCheckPill({
  label,
  icon,
  checked,
  onClick,
  accent,
}: {
  label: string;
  icon?: React.ReactNode;
  checked: boolean;
  onClick: () => void;
  accent: 'blue' | 'emerald' | 'purple';
}) {
  const checkedStyles =
    accent === 'emerald'
      ? 'bg-emerald-500/15 border-emerald-500/30 text-white'
      : accent === 'purple'
        ? 'bg-purple-500/15 border-purple-500/30 text-white'
        : 'bg-blue-500/15 border-blue-500/30 text-white';

  const checkDotStyles =
    accent === 'emerald'
      ? 'bg-emerald-500 border-emerald-400 text-zinc-950'
      : accent === 'purple'
        ? 'bg-purple-500 border-purple-400 text-white'
        : 'bg-blue-500 border-blue-400 text-white';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
        checked
          ? checkedStyles
          : 'bg-zinc-950/80 border-white/5 text-zinc-400 hover:border-white/15 hover:text-zinc-200'
      }`}
    >
      <span
        className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
          checked ? checkDotStyles : 'border-zinc-700 text-transparent'
        }`}
      >
        <Check size={10} strokeWidth={3.5} />
      </span>
      {icon && <span className="opacity-70 shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
    </button>
  );
}
