// app/components/committees/CommitteeClient.tsx
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useMemo, useEffect, useTransition } from "react";
import {
  Crown,
  Wand2,
  RotateCcw,
  X,
  Save,
  Loader2,
  Settings2,
  Lightbulb,
  LayoutGrid,
  LayoutList,
  Plus,
  Trash2,
  Edit2,
  Users,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Star,
  Link2,
} from "lucide-react";
import {
  saveCommitteeAssignments,
  saveCommitteeTargetsAction,
  updateCommitteeVolunteer,
  deleteCommitteeVolunteer,
} from "@/app/actions/committees";
import { addCommitteeVolunteerLinked } from "@/app/actions/admin-crud";
import { useTenant } from "@/app/components/TenantProvider";
import {
  solveOptimalCommitteeAssignments,
  findSwapSuggestions,
  computeHouseholdFulfillment,
  hasChairInterestIn,
  isFlexibleChoice,
  type CommitteeVolunteer,
  type CommitteePhase,
  type MatchReport,
} from "@/app/lib/committee-matcher";

// --- CONFIG ---
const COMMITTEES: Record<CommitteePhase, string[]> = {
  "Pre-Show": [
    "Show Chair",
    "Publicity",
    "Sets",
    "Set Dressing",
    "Raffles",
    "Green Room",
    "Costumes",
    "Props",
    "Makeup",
    "Hair",
    "Tech",
    "Floater",
  ],
  "Show Week": [
    "Show Chair",
    "Raffles",
    "Green Room",
    "Costumes",
    "Props",
    "Makeup",
    "Hair",
    "Tech",
    "Ninjas/Set Movers",
    "Box Office",
    "Concessions",
    "Security",
    "Floater",
  ],
};

const DEFAULT_RULES: Record<
  string,
  { type: "fixed" | "ratio"; val: number; min?: number; reason: string }
> = {
  "Show Chair": { type: "fixed", val: 1, reason: "The Boss" },
  "Green Room": { type: "ratio", val: 13, min: 2, reason: "Jenny's Ratio: 1 per 13 Actors" },
  Costumes: { type: "ratio", val: 13, min: 3, reason: "Jenny's Ratio: 1 per 13 Actors" },
  Hair: { type: "ratio", val: 15, min: 2, reason: "Jenny's Ratio: 1 per 15 Actors" },
  Makeup: { type: "ratio", val: 25, min: 2, reason: "Jenny's Ratio: 1 per 25 Actors" },
  Publicity: { type: "fixed", val: 9, reason: "Jenny's Target" },
  Raffles: { type: "fixed", val: 7, reason: "Jenny's Target" },
  Sets: { type: "fixed", val: 6, reason: "Jenny's Target" },
  "Set Dressing": { type: "fixed", val: 6, reason: "Jenny's Target" },
  Props: { type: "fixed", val: 5, reason: "Jenny's Target" },
  Tech: { type: "fixed", val: 2, reason: "Jenny's Target" },
  Security: { type: "fixed", val: 3, reason: "Door & Perimeter" },
  "Box Office": { type: "fixed", val: 3, reason: "Ticket Window" },
  Concessions: { type: "fixed", val: 4, reason: "Prep & Sales" },
  "Ninjas/Set Movers": { type: "fixed", val: 4, reason: "Deck Crew" },
  Floater: { type: "fixed", val: 3, reason: "Flex Helpers" },
  default: { type: "fixed", val: 3, reason: "Standard Size" },
};

export default function CommitteeDashboard({
  volunteers = [],
  students = [],
  activeId,
  initialSavedTargets = null,
  directoryPeople = [],
}: {
  volunteers?: CommitteeVolunteer[];
  students?: any[];
  activeId: number;
  initialSavedTargets?: Record<string, number> | null;
  directoryPeople?: { id: number; name: string; email: string; phone: string }[];
}) {
  const tenant = useTenant();

  const [groupBy, setGroupBy] = useState<CommitteePhase>("Pre-Show");
  const [viewMode, setViewMode] = useState<"board" | "list" | "families">("board");
  const [familyFilter, setFamilyFilter] = useState<"all" | "missing" | "partial" | "fulfilled">(
    "all"
  );

  // Local state for optimistic UI updates on add/edit/delete
  const [localVolunteers, setLocalVolunteers] = useState<CommitteeVolunteer[]>(volunteers);

  const initialPreShow = useMemo(() => {
    const acc: Record<number, string> = {};
    localVolunteers.forEach((v) => {
      if (v.assignedPreShow) acc[v.id] = v.assignedPreShow;
    });
    return acc;
  }, [localVolunteers]);

  const initialShowWeek = useMemo(() => {
    const acc: Record<number, string> = {};
    localVolunteers.forEach((v) => {
      if (v.assignedShowWeek) acc[v.id] = v.assignedShowWeek;
    });
    return acc;
  }, [localVolunteers]);

  const initialChairs = useMemo(() => {
    const acc: Record<number, boolean> = {};
    localVolunteers.forEach((v) => {
      if (v.isChair) acc[v.id] = true;
    });
    return acc;
  }, [localVolunteers]);

  const [preShowAssignments, setPreShowAssignments] =
    useState<Record<number, string>>(initialPreShow);
  const [showWeekAssignments, setShowWeekAssignments] =
    useState<Record<number, string>>(initialShowWeek);
  const [chairs, setChairs] = useState<Record<number, boolean>>(initialChairs);
  const [selectedCommittee, setSelectedCommittee] = useState<string | null>(null);

  // Edit & Add Modal State
  const [selectedVolunteer, setSelectedVolunteer] = useState<CommitteeVolunteer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    existingPersonId: "",
  });

  const targetStorageKey = `ob_committee_targets:${tenant}:${activeId}`;
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [balanceReport, setBalanceReport] = useState<MatchReport | null>(null);

  const [isPending, startTransition] = useTransition();

  // Sync props if external DB changes
  useEffect(() => {
    setLocalVolunteers(volunteers);
  }, [volunteers]);

  // Initialize targets (restoring saved targets from localStorage if present)
  useEffect(() => {
    const defaults: Record<string, number> = {};
    const castSize = students.length || 40;

    (Object.entries(COMMITTEES) as [CommitteePhase, string[]][]).forEach(([phase, comms]) => {
      comms.forEach((c) => {
        const rule = DEFAULT_RULES[c] || DEFAULT_RULES.default;
        let val = rule.type === "fixed" ? rule.val : Math.ceil(castSize / rule.val);
        if (rule.min && val < rule.min) val = rule.min;
        defaults[`${phase}-${c}`] = val;
      });
    });

    if (initialSavedTargets && Object.keys(initialSavedTargets).length > 0) {
      setTargets({ ...defaults, ...initialSavedTargets });
      return;
    }

    try {
      const savedRaw = localStorage.getItem(targetStorageKey);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw) as Record<string, number>;
        setTargets({ ...defaults, ...parsed });
        return;
      }
    } catch {
      // ignore localStorage read errors
    }
    setTargets(defaults);
  }, [students.length, targetStorageKey, initialSavedTargets]);

  const targetSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistTargetsToServer = (next: Record<string, number>) => {
    try {
      localStorage.setItem(targetStorageKey, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    if (targetSaveTimerRef.current) clearTimeout(targetSaveTimerRef.current);
    targetSaveTimerRef.current = setTimeout(() => {
      void saveCommitteeTargetsAction(tenant, activeId, next);
    }, 500);
  };

  // Persist target adjustments to Neon + localStorage
  const updateTarget = (key: string, value: number) => {
    setTargets((prev) => {
      const next = { ...prev, [key]: Math.max(0, value) };
      persistTargetsToServer(next);
      return next;
    });
  };

  useEffect(() => {
    setPreShowAssignments(initialPreShow);
    setShowWeekAssignments(initialShowWeek);
    setChairs(initialChairs);
  }, [initialPreShow, initialShowWeek, initialChairs]);

  const assignments = groupBy === "Pre-Show" ? preShowAssignments : showWeekAssignments;
  const setAssignments = groupBy === "Pre-Show" ? setPreShowAssignments : setShowWeekAssignments;
  const otherPhaseAssignments = groupBy === "Pre-Show" ? showWeekAssignments : preShowAssignments;

  const hasChanges =
    JSON.stringify(preShowAssignments) !== JSON.stringify(initialPreShow) ||
    JSON.stringify(showWeekAssignments) !== JSON.stringify(initialShowWeek) ||
    JSON.stringify(chairs) !== JSON.stringify(initialChairs);

  const getPrefs = (p: CommitteeVolunteer) =>
    groupBy === "Pre-Show"
      ? { first: p.preShow1, second: p.preShow2, third: p.preShow3 }
      : { first: p.showWeek1, second: p.showWeek2, third: p.showWeek3 };

  const getCommitteeTarget = (committeeName: string) => targets[`${groupBy}-${committeeName}`] || 0;

  const currentPhaseTargets = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of COMMITTEES[groupBy]) {
      map[c] = targets[`${groupBy}-${c}`] || 0;
    }
    return map;
  }, [groupBy, targets]);

  // Volunteers enriched with current unsaved other-phase assignments for continuity scoring
  const volunteersWithLivePhases = useMemo(
    () =>
      localVolunteers.map((v) => ({
        ...v,
        assignedPreShow: preShowAssignments[v.id] || null,
        assignedShowWeek: showWeekAssignments[v.id] || null,
      })),
    [localVolunteers, preShowAssignments, showWeekAssignments]
  );

  // --- CRUD HANDLERS ---
  const handleSave = () => {
    startTransition(async () => {
      await saveCommitteeAssignments(tenant, groupBy, assignments, chairs);
      // If the other phase also has unsaved changes, persist it too
      const otherPhase: CommitteePhase = groupBy === "Pre-Show" ? "Show Week" : "Pre-Show";
      const otherChanged =
        otherPhase === "Pre-Show"
          ? JSON.stringify(preShowAssignments) !== JSON.stringify(initialPreShow)
          : JSON.stringify(showWeekAssignments) !== JSON.stringify(initialShowWeek);
      if (otherChanged) {
        await saveCommitteeAssignments(tenant, otherPhase, otherPhaseAssignments, chairs);
      }
    });
  };

  const handleOpenEdit = (p: CommitteeVolunteer | null) => {
    if (p) {
      setSelectedVolunteer(p);
      setEditForm({
        name: p.name || "",
        email: p.email || "",
        phone: p.phone || "",
        existingPersonId: "",
      });
      setIsEditing(false);
    } else {
      setSelectedVolunteer({ id: -1 } as CommitteeVolunteer);
      setEditForm({ name: "", email: "", phone: "", existingPersonId: "" });
      setIsEditing(true);
    }
  };

  const handleSaveVolunteer = async () => {
    if (!selectedVolunteer) return;
    const isNew = selectedVolunteer.id === -1;

    startTransition(async () => {
      if (isNew) {
        const res = await addCommitteeVolunteerLinked(tenant, activeId, {
          existingPersonId: editForm.existingPersonId
            ? Number(editForm.existingPersonId)
            : undefined,
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
        });
        if (res.success && "volunteer" in res && res.volunteer) {
          setLocalVolunteers([...localVolunteers, res.volunteer as CommitteeVolunteer]);
        }
      } else {
        await updateCommitteeVolunteer(tenant, selectedVolunteer.id, {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
        });
        setLocalVolunteers(
          localVolunteers.map((v) =>
            v.id === selectedVolunteer.id
              ? { ...v, name: editForm.name, email: editForm.email, phone: editForm.phone }
              : v
          )
        );
      }
      setSelectedVolunteer(null);
      setIsEditing(false);
    });
  };

  const handleDeleteVolunteer = async () => {
    if (!selectedVolunteer || selectedVolunteer.id === -1) return;
    if (!confirm(`Are you sure you want to permanently delete ${selectedVolunteer.name}?`)) return;

    startTransition(async () => {
      await deleteCommitteeVolunteer(tenant, selectedVolunteer.id);
      setLocalVolunteers(localVolunteers.filter((v) => v.id !== selectedVolunteer.id));
      setSelectedVolunteer(null);
      setIsEditing(false);
    });
  };

  const handleClearBoard = () => {
    if (!confirm(`Revert all unsaved changes for ${groupBy}?`)) return;
    setPreShowAssignments(initialPreShow);
    setShowWeekAssignments(initialShowWeek);
    setChairs(initialChairs);
  };

  const runOptimalMatcher = (unassignedOnly: boolean, allowFallback = false) => {
    const report = solveOptimalCommitteeAssignments(
      volunteersWithLivePhases,
      groupBy,
      COMMITTEES[groupBy],
      currentPhaseTargets,
      assignments,
      chairs,
      {
        unassignedOnly,
        prioritizeChairInterest: true,
        continuityBonus: true,
        allowFallback,
      }
    );

    setAssignments(report.assignments);
    setChairs(report.suggestedChairs);
    setBalanceReport(report);
  };

  const handleAutoBalance = () => {
    runOptimalMatcher(true, false);
  };

  const handleReoptimizeWholeBoard = () => {
    if (
      !confirm(
        `Globally re-optimize all non-chair volunteers for ${groupBy}? Chairs stay locked; everyone else will be optimally matched to maximize 1st/2nd choices & continuity.`
      )
    ) {
      return;
    }
    runOptimalMatcher(false, false);
  };

  const handleForceFill = () => {
    runOptimalMatcher(true, true);
  };

  const handleSuggestLimits = () => {
    const currentComms = COMMITTEES[groupBy];
    const totalVolunteers = localVolunteers.length;
    const currentTotalTargets = currentComms.reduce(
      (sum, c) => sum + (targets[`${groupBy}-${c}`] || 0),
      0
    );
    if (currentTotalTargets === 0) return;
    const scale = totalVolunteers / currentTotalTargets;
    const newTargets = { ...targets };
    currentComms.forEach((c) => {
      const key = `${groupBy}-${c}`;
      newTargets[key] = Math.max(1, Math.round((targets[key] || 0) * scale));
    });
    setTargets(newTargets);
    persistTargetsToServer(newTargets);
  };

  const groupedData = useMemo(() => {
    const groups: Record<string, CommitteeVolunteer[]> = {};
    COMMITTEES[groupBy].forEach((c) => (groups[c] = []));
    groups["Unassigned"] = [];

    localVolunteers.forEach((p) => {
      const assignedVal = assignments[p.id];
      if (assignedVal && groups[assignedVal]) {
        groups[assignedVal].push(p);
      } else {
        groups["Unassigned"].push(p);
      }
    });
    return groups;
  }, [groupBy, localVolunteers, assignments]);

  const sortedListData = useMemo(() => {
    return [...localVolunteers].sort((a, b) => {
      const aAssigned = assignments[a.id] || "Unassigned";
      const bAssigned = assignments[b.id] || "Unassigned";
      if (aAssigned === "Unassigned" && bAssigned !== "Unassigned") return -1;
      if (aAssigned !== "Unassigned" && bAssigned === "Unassigned") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [localVolunteers, assignments]);

  const householdRows = useMemo(() => {
    const normalizedStudents = (students || []).map((s: any) => ({
      id: s.id,
      name: s.Name || s.name || s.fullName || "",
      email: s.Email || s.email || "",
    }));
    return computeHouseholdFulfillment(
      localVolunteers,
      normalizedStudents,
      preShowAssignments,
      showWeekAssignments,
      chairs
    );
  }, [localVolunteers, students, preShowAssignments, showWeekAssignments, chairs]);

  const householdStats = useMemo(() => {
    let fulfilled = 0;
    let partial = 0;
    let missing = 0;
    let split = 0;
    for (const r of householdRows) {
      if (r.status === "fulfilled") fulfilled++;
      else if (r.status === "partial") partial++;
      else missing++;
      if (r.isSplitAcrossParents) split++;
    }
    return { fulfilled, partial, missing, split, total: householdRows.length };
  }, [householdRows]);

  const filteredHouseholds = useMemo(() => {
    if (familyFilter === "all") return householdRows;
    return householdRows.filter((r) => r.status === familyFilter);
  }, [householdRows, familyFilter]);

  const currentTeam = selectedCommittee ? groupedData[selectedCommittee] : [];

  const swapSuggestions = useMemo(() => {
    if (!selectedCommittee || selectedCommittee === "Unassigned") return [];
    return findSwapSuggestions(
      selectedCommittee,
      volunteersWithLivePhases,
      groupBy,
      assignments,
      chairs,
      currentPhaseTargets,
      6
    );
  }, [selectedCommittee, volunteersWithLivePhases, groupBy, assignments, chairs, currentPhaseTargets]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-4 md:p-6 flex flex-col overflow-y-auto custom-scrollbar">
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">
            Committee Manager
          </h1>
          <p className="text-zinc-500 text-xs font-medium">
            {localVolunteers.length} Volunteers • Cast Size:{" "}
            <span className="text-blue-400 font-bold">{students.length}</span> • Households:{" "}
            <span className="text-emerald-400 font-bold">
              {householdStats.fulfilled}/{householdStats.total} Fulfilled
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
          <div className="bg-zinc-900 border border-white/10 rounded-lg p-1 flex shadow-inner mr-1">
            <button
              onClick={() => setViewMode("board")}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                viewMode === "board"
                  ? "bg-zinc-700 text-white shadow-lg"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              <LayoutGrid size={14} /> Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                viewMode === "list"
                  ? "bg-zinc-700 text-white shadow-lg"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              <LayoutList size={14} /> List
            </button>
            <button
              onClick={() => setViewMode("families")}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                viewMode === "families"
                  ? "bg-zinc-700 text-white shadow-lg"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              <Users size={14} /> Families
              {householdStats.missing > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
                  {householdStats.missing}
                </span>
              )}
            </button>
          </div>

          {viewMode !== "families" && (
            <div className="bg-zinc-900 border border-white/10 rounded-lg p-1 flex shadow-inner mr-1">
              <button
                onClick={() => setGroupBy("Pre-Show")}
                className={`px-3.5 py-1.5 rounded text-xs font-bold uppercase transition-all ${
                  groupBy === "Pre-Show"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                Pre-Show
              </button>
              <button
                onClick={() => setGroupBy("Show Week")}
                className={`px-3.5 py-1.5 rounded text-xs font-bold uppercase transition-all ${
                  groupBy === "Show Week"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                Show Week
              </button>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!hasChanges || isPending}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all border ${
              hasChanges
                ? "bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                : "bg-zinc-900 text-zinc-500 border-white/10 cursor-not-allowed"
            }`}
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {hasChanges ? "Save Changes" : "Saved"}
          </button>

          <button
            onClick={() => handleOpenEdit(null)}
            className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-600/50 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition-all"
          >
            <Plus size={14} /> Add Person
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-600/50 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition-all"
          >
            <Settings2 size={14} /> Limits
          </button>
          <button
            onClick={handleAutoBalance}
            title="Globally optimal assignment for unassigned volunteers using preferences, chair interest & phase continuity"
            className="bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/50 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition-all"
          >
            <Wand2 size={14} /> Smart Match
          </button>
          <button
            onClick={handleClearBoard}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition-all"
          >
            <RotateCcw size={14} /> Revert
          </button>
        </div>
      </div>

      {/* --- CONDITIONAL RENDER: BOARD, LIST, OR FAMILIES --- */}
      {viewMode === "families" ? (
        <div className="space-y-4 pb-24 animate-in fade-in duration-300">
          {/* Household Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => setFamilyFilter("all")}
              className={`p-4 rounded-2xl border text-left transition-all ${
                familyFilter === "all"
                  ? "bg-zinc-900 border-blue-500/50"
                  : "bg-zinc-900/40 border-white/10 hover:border-white/20"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Total Cast Families
              </p>
              <p className="text-2xl font-black text-white mt-0.5">{householdStats.total}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {householdStats.split} split across 2 parents
              </p>
            </button>

            <button
              onClick={() => setFamilyFilter("fulfilled")}
              className={`p-4 rounded-2xl border text-left transition-all ${
                familyFilter === "fulfilled"
                  ? "bg-emerald-500/10 border-emerald-500/50"
                  : "bg-zinc-900/40 border-white/10 hover:border-white/20"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Fulfilled (Both Phases)
              </p>
              <p className="text-2xl font-black text-emerald-400 mt-0.5">
                {householdStats.fulfilled}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Pre-Show + Show Week covered</p>
            </button>

            <button
              onClick={() => setFamilyFilter("partial")}
              className={`p-4 rounded-2xl border text-left transition-all ${
                familyFilter === "partial"
                  ? "bg-blue-500/10 border-blue-500/50"
                  : "bg-zinc-900/40 border-white/10 hover:border-white/20"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                Partial (1 of 2 Phases)
              </p>
              <p className="text-2xl font-black text-blue-400 mt-0.5">{householdStats.partial}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Needs 1 more committee slot</p>
            </button>

            <button
              onClick={() => setFamilyFilter("missing")}
              className={`p-4 rounded-2xl border text-left transition-all ${
                familyFilter === "missing"
                  ? "bg-amber-500/10 border-amber-500/50"
                  : "bg-zinc-900/40 border-white/10 hover:border-white/20"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                Missing Commitment
              </p>
              <p className="text-2xl font-black text-amber-400 mt-0.5">{householdStats.missing}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">No assigned parent yet</p>
            </button>
          </div>

          <div className="bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-950 border-b border-white/10 text-zinc-500 text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3 font-black">Household</th>
                    <th className="px-4 py-3 font-black">Cast Student(s)</th>
                    <th className="px-4 py-3 font-black">Household Parents &amp; Assignments</th>
                    <th className="px-4 py-3 font-black text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredHouseholds.map((fam) => (
                    <tr key={fam.familyKey} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 align-top">
                        <p className="font-bold text-white text-xs">{fam.familyLabel}</p>
                        {fam.isSplitAcrossParents && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[10px] font-bold text-purple-300">
                            <Users size={10} /> Split Across Parents
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap gap-1">
                          {fam.students.length > 0 ? (
                            fam.students.map((st) => (
                              <span
                                key={st}
                                className="px-2 py-0.5 rounded bg-zinc-900 border border-white/10 text-[11px] text-zinc-300"
                              >
                                {st}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-zinc-500 italic">Unlinked</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {fam.volunteers.length === 0 ? (
                          <span className="text-xs text-amber-400/80 italic">
                            No parent volunteer registered yet
                          </span>
                        ) : (
                          <div className="space-y-1.5">
                            {fam.volunteers.map((v) => (
                              <div
                                key={v.id}
                                className="flex flex-wrap items-center gap-2 text-xs"
                              >
                                <span className="font-bold text-zinc-200 flex items-center gap-1">
                                  {v.name}
                                  {v.isChair && <Crown size={12} className="text-amber-400" />}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    v.preShow
                                      ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                                      : "bg-zinc-900 text-zinc-500 border border-white/5"
                                  }`}
                                >
                                  Pre: {v.preShow || "Unassigned"}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    v.showWeek
                                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                      : "bg-zinc-900 text-zinc-500 border border-white/5"
                                  }`}
                                >
                                  Show: {v.showWeek || "Unassigned"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        {fam.status === "fulfilled" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase">
                            <CheckCircle2 size={12} /> Fulfilled
                          </span>
                        ) : fam.status === "partial" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase">
                            <Clock size={12} /> Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase">
                            <AlertCircle size={12} /> Missing
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredHouseholds.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-500 text-xs italic">
                        No households match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : viewMode === "board" ? (
        <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6 print:block print:columns-2 pb-24">
          {Object.keys(groupedData).map((committee) => {
            const team = groupedData[committee];
            const target = getCommitteeTarget(committee);
            const isUnderstaffed = committee !== "Unassigned" && team.length < target;
            const isOverstaffed = committee !== "Unassigned" && team.length > target;

            let statusColor = "text-emerald-500";
            if (isUnderstaffed) statusColor = "text-amber-500";
            if (isOverstaffed) statusColor = "text-blue-400";
            if (committee === "Unassigned") statusColor = "text-emerald-500";

            const chairName = team.find((p) => chairs[p.id])?.name;

            return (
              <div
                key={committee}
                className="break-inside-avoid mb-6 rounded-2xl overflow-hidden border shadow-2xl border-white/10 bg-zinc-900/40 print:border-black print:bg-white print:mb-8"
              >
                <div
                  onClick={() => setSelectedCommittee(committee)}
                  className="p-4 border-b border-white/5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div>
                    <h3
                      className={`font-black uppercase text-sm tracking-widest ${statusColor} print:text-black`}
                    >
                      {committee}
                    </h3>
                    {chairName && (
                      <p className="text-[9px] text-amber-400 font-bold mt-0.5 flex items-center gap-1 drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]">
                        <Crown size={10} /> {chairName}
                      </p>
                    )}
                  </div>
                  {committee !== "Unassigned" ? (
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 bg-zinc-950 ${
                        isUnderstaffed
                          ? "text-amber-500"
                          : isOverstaffed
                            ? "text-blue-400"
                            : "text-zinc-400"
                      }`}
                    >
                      {team.length} / {target}
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 bg-zinc-950 ${
                        team.length > 0 ? "text-amber-500 border-amber-500/30" : "text-zinc-500"
                      }`}
                    >
                      {team.length} Remaining
                    </span>
                  )}
                </div>

                <div className="p-3 space-y-1">
                  {team.length === 0 && (
                    <div className="text-xs text-zinc-600 italic py-2 text-center">Empty</div>
                  )}
                  {team.slice(0, 7).map((p) => {
                    const otherAssigned = otherPhaseAssignments[p.id];
                    const hasContinuity = Boolean(
                      committee !== "Unassigned" && otherAssigned && otherAssigned === committee
                    );
                    const wantsChair =
                      committee !== "Unassigned" && hasChairInterestIn(p, committee);
                    return (
                      <div
                        key={p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(p);
                        }}
                        className="text-xs flex justify-between items-center py-0.5 cursor-pointer transition-colors text-zinc-300 hover:text-white gap-2"
                      >
                        <span className="truncate flex items-center gap-1.5">
                          {p.name}
                          {wantsChair && (
                            <span title="Expressed Chair Interest">
                              <Star size={10} className="text-amber-400 fill-amber-400 shrink-0" />
                            </span>
                          )}
                          {hasContinuity && (
                            <span title="Same committee in both phases">
                              <Link2 size={10} className="text-cyan-400 shrink-0" />
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <ChoiceBadge assigned={committee} prefs={getPrefs(p)} />
                        </div>
                      </div>
                    );
                  })}
                  {team.length > 7 && (
                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest pt-2 border-t border-white/5 mt-2">
                      +{team.length - 7} more...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="pb-24 animate-in fade-in duration-300">
          <div className="bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="bg-zinc-950 border-b border-white/10 text-zinc-500 text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="px-3 py-2 font-black w-1/5">Volunteer</th>
                    <th className="px-3 py-2 font-black w-1/6">Student</th>
                    <th className="px-3 py-2 font-black w-28">1st Choice</th>
                    <th className="px-3 py-2 font-black w-28">2nd Choice</th>
                    <th className="px-3 py-2 font-black w-28">3rd Choice</th>
                    <th className="px-3 py-2 font-black w-28">
                      {groupBy === "Pre-Show" ? "Show Week" : "Pre-Show"}
                    </th>
                    <th className="px-3 py-2 font-black w-48">Assignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {sortedListData.map((p) => {
                    const prefs = getPrefs(p);
                    const currentAssigned = assignments[p.id] || "Unassigned";
                    const otherAssigned = otherPhaseAssignments[p.id] || null;
                    const isUnassigned = currentAssigned === "Unassigned";
                    const isChair = chairs[p.id];

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-white/5 transition-colors ${
                          isUnassigned ? "bg-amber-900/5" : isChair ? "bg-amber-500/10" : ""
                        }`}
                      >
                        <td
                          className="px-3 py-2 font-bold text-xs leading-tight cursor-pointer hover:underline"
                          onClick={() => handleOpenEdit(p)}
                        >
                          <div className="flex items-center gap-2 text-zinc-200">
                            <ChoiceBadge assigned={currentAssigned} prefs={prefs} />
                            <span className="truncate">{p.name}</span>
                            {isChair && (
                              <Crown
                                size={14}
                                className="text-amber-400 shrink-0 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]"
                              />
                            )}
                            {p.chairInterest && p.chairInterest.length > 0 && !isChair && (
                              <span title={`Chair interest: ${p.chairInterest.join(", ")}`}>
                                <Star size={11} className="text-amber-400 shrink-0" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-zinc-400 text-[10px] leading-tight pr-4 truncate">
                          {p.studentName || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-zinc-500 truncate">
                          {prefs.first || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-zinc-500 truncate">
                          {prefs.second || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-zinc-500 truncate">
                          {prefs.third || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[11px]">
                          {otherAssigned ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                otherAssigned === currentAssigned
                                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                                  : "bg-zinc-900 text-zinc-400 border border-white/5"
                              }`}
                            >
                              {otherAssigned}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <select
                              className={`w-full bg-zinc-950 border rounded px-2 py-1.5 text-xs font-bold outline-none transition-colors shadow-sm cursor-pointer ${
                                isUnassigned
                                  ? "border-amber-500/50 text-amber-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                  : isChair
                                    ? "border-amber-500 text-amber-400"
                                    : "border-zinc-700 text-zinc-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              }`}
                              value={currentAssigned}
                              onChange={(e) => {
                                setAssignments((prev) => ({ ...prev, [p.id]: e.target.value }));
                                if (isChair) {
                                  setChairs((prev) => ({ ...prev, [p.id]: false }));
                                }
                              }}
                            >
                              {COMMITTEES[groupBy].map((c: string) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                              <option value="Unassigned">Unassigned</option>
                            </select>

                            {!isUnassigned && currentAssigned !== "Show Chair" && (
                              <button
                                onClick={() =>
                                  setChairs((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                                }
                                className={`p-1.5 rounded transition-all flex-shrink-0 ${
                                  isChair
                                    ? "bg-amber-500 text-white shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                                    : "bg-zinc-800 text-zinc-500 hover:text-amber-400 hover:bg-zinc-700"
                                }`}
                                title={isChair ? "Remove as Chair" : "Make Chair"}
                              >
                                <Crown size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- LIMITS SETTINGS MODAL --- */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/10 flex justify-between items-start bg-zinc-950">
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
                  Adjust Targets
                </h2>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
                  {groupBy} Phase • Auto-Saved
                </p>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar bg-zinc-950/50 space-y-4">
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold text-blue-400">Smart Distribution</h4>
                    <p className="text-xs text-blue-300/70 mt-1 pr-4">
                      Automatically scales targets to match your {localVolunteers.length}{" "}
                      volunteers.
                    </p>
                  </div>
                  <button
                    onClick={handleSuggestLimits}
                    className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded shadow-lg text-xs font-black uppercase flex items-center gap-2 transition-colors"
                  >
                    <Lightbulb size={14} /> Suggest
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {COMMITTEES[groupBy].map((c) => {
                  const key = `${groupBy}-${c}`;
                  return (
                    <div
                      key={c}
                      className="flex justify-between items-center p-3 bg-zinc-900 border border-white/5 rounded-lg hover:border-white/10 transition-colors"
                    >
                      <span className="text-sm font-bold text-zinc-300">{c}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-600 font-medium">Target:</span>
                        <input
                          type="number"
                          min="0"
                          value={targets[key] || 0}
                          onChange={(e) => updateTarget(key, parseInt(e.target.value) || 0)}
                          className="w-16 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-center text-sm font-bold text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-white/10 bg-zinc-950 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="bg-white text-black px-6 py-2 rounded-lg text-sm font-black uppercase hover:bg-zinc-200 transition-colors shadow-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- GLOBAL OPTIMAL MATCHER REPORT MODAL --- */}
      {balanceReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setBalanceReport(null)}
          />
          <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/10 bg-zinc-950 text-center">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                <Sparkles size={24} />
              </div>
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
                Global Match Complete
              </h2>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">
                Satisfaction Score:{" "}
                <span className="text-emerald-400">
                  {balanceReport.maxPossibleScore > 0
                    ? Math.round(
                        (balanceReport.satisfactionScore / balanceReport.maxPossibleScore) * 100
                      )
                    : 100}
                  %
                </span>
              </p>
            </div>

            <div className="p-6 space-y-2.5 bg-zinc-950/50">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex justify-between items-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <span className="text-xs font-bold text-emerald-400">1st Choice</span>
                  <span className="text-lg font-black text-emerald-400">{balanceReport.first}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <span className="text-xs font-bold text-blue-400">2nd Choice</span>
                  <span className="text-lg font-black text-blue-400">{balanceReport.second}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <span className="text-xs font-bold text-purple-400">3rd Choice</span>
                  <span className="text-lg font-black text-purple-400">{balanceReport.third}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <span className="text-xs font-bold text-cyan-300">Flexible</span>
                  <span className="text-lg font-black text-cyan-300">{balanceReport.flexible}</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-zinc-900 border border-white/5 rounded-lg text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Link2 size={13} className="text-cyan-400" /> Phase Continuity Matches
                </span>
                <span className="font-black text-white">{balanceReport.continuityMatches}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-zinc-900 border border-white/5 rounded-lg text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Star size={13} className="text-amber-400" /> Chair Interest Matches
                </span>
                <span className="font-black text-white">{balanceReport.chairMatches}</span>
              </div>

              {balanceReport.other > 0 && (
                <div className="flex justify-between items-center p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs">
                  <span className="font-bold text-zinc-400">Assigned (Fallback)</span>
                  <span className="text-sm font-black text-zinc-200">{balanceReport.other}</span>
                </div>
              )}

              <div className="flex justify-between items-center p-3 bg-zinc-900 border border-white/5 rounded-lg text-xs">
                <span className="font-bold text-zinc-400">Still Unassigned</span>
                <span
                  className={`text-sm font-black ${
                    balanceReport.unassigned > 0 ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {balanceReport.unassigned}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-zinc-950 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={handleReoptimizeWholeBoard}
                  className="flex-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 px-3 py-2.5 rounded-lg text-xs font-black uppercase transition-colors"
                >
                  Re-Optimize All (Keep Chairs)
                </button>
                {balanceReport.unassigned > 0 && (
                  <button
                    onClick={handleForceFill}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2.5 rounded-lg text-xs font-black uppercase transition-colors"
                  >
                    Fill Remaining
                  </button>
                )}
              </div>
              <button
                onClick={() => setBalanceReport(null)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg text-xs font-black uppercase transition-colors shadow-lg"
              >
                Done (Remember to Save)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- VOLUNTEER EDIT/VIEW MODAL --- */}
      {selectedVolunteer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedVolunteer(null)}
          />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-white/10 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/10 bg-zinc-950 flex justify-between items-start">
              <div>
                {isEditing ? (
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
                    {selectedVolunteer.id === -1 ? "Add Volunteer" : "Edit Volunteer"}
                  </h2>
                ) : (
                  <>
                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
                      {selectedVolunteer.name}
                    </h2>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
                      Parent of {selectedVolunteer.studentName || "Unknown"}
                    </p>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => setSelectedVolunteer(null)}
                  className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 bg-zinc-950/50">
              {isEditing ? (
                <div className="space-y-4">
                  {selectedVolunteer.id === -1 && directoryPeople.length > 0 && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">
                        Pick Existing Person (Optional)
                      </label>
                      <select
                        value={editForm.existingPersonId}
                        onChange={(e) => {
                          const pid = e.target.value;
                          const match = directoryPeople.find((dp) => String(dp.id) === pid);
                          setEditForm({
                            existingPersonId: pid,
                            name: match ? match.name : editForm.name,
                            email: match ? match.email : editForm.email,
                            phone: match ? match.phone : editForm.phone,
                          });
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                      >
                        <option value="">-- Or type a new volunteer below --</option>
                        {directoryPeople.map((dp) => (
                          <option key={dp.id} value={dp.id}>
                            {dp.name} {dp.email ? `(${dp.email})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">
                      Parent Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-1"
                    />
                  </div>

                  <div className="pt-4 flex gap-2 justify-between items-center">
                    {selectedVolunteer.id !== -1 ? (
                      <button
                        onClick={handleDeleteVolunteer}
                        className="text-red-500 hover:bg-red-500/10 p-2 rounded transition-colors"
                        title="Delete"
                      >
                        {isPending ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    ) : (
                      <div />
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (selectedVolunteer.id === -1) setSelectedVolunteer(null);
                          else setIsEditing(false);
                        }}
                        className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveVolunteer}
                        disabled={isPending}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded shadow-lg text-xs font-black uppercase flex items-center gap-2"
                      >
                        {isPending ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                      Contact Info
                    </h4>
                    <div className="space-y-1">
                      <p className="text-sm text-zinc-300 font-medium">
                        Email:{" "}
                        <span className="text-zinc-400 font-normal">
                          {selectedVolunteer.email || "N/A"}
                        </span>
                      </p>
                      <p className="text-sm text-zinc-300 font-medium">
                        Phone:{" "}
                        <span className="text-zinc-400 font-normal">
                          {selectedVolunteer.phone || "N/A"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {selectedVolunteer.chairInterest && selectedVolunteer.chairInterest.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1.5 flex items-center gap-1">
                        <Star size={11} /> Chair Interest
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedVolunteer.chairInterest.map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                      {groupBy} Preferences
                    </h4>
                    <div className="space-y-2">
                      {(() => {
                        const prefs = getPrefs(selectedVolunteer);
                        return (
                          <>
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black">
                                1
                              </span>
                              <span className="text-sm font-bold text-zinc-200">
                                {prefs.first || "None"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-black">
                                2
                              </span>
                              <span className="text-sm font-bold text-zinc-200">
                                {prefs.second || "None"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-black">
                                3
                              </span>
                              <span className="text-sm font-bold text-zinc-200">
                                {prefs.third || "None"}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ASSIGNMENT DRAWER (BOARD VIEW ONLY) --- */}
      {selectedCommittee && viewMode === "board" && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedCommittee(null)}
          />
          <aside className="relative w-full max-w-3xl bg-zinc-900 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-white/10 flex justify-between items-start bg-zinc-950">
              <div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">
                  {selectedCommittee}
                </h2>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
                  {groupBy} • {currentTeam.length}
                  {selectedCommittee !== "Unassigned"
                    ? ` / ${getCommitteeTarget(selectedCommittee)} Target`
                    : " Unassigned"}
                </p>
              </div>
              <button
                onClick={() => setSelectedCommittee(null)}
                className="p-2 hover:bg-white/10 rounded-full"
              >
                <X />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {/* Current Team */}
              <div className="bg-zinc-950 border border-white/5 rounded-xl divide-y divide-white/5">
                {currentTeam.map((p) => {
                  const prefs = getPrefs(p);
                  const isChair = chairs[p.id];
                  const otherAssigned = otherPhaseAssignments[p.id];

                  return (
                    <div
                      key={p.id}
                      className={`p-3 hover:bg-white/5 transition-colors group flex justify-between items-center gap-3 ${
                        isChair ? "bg-amber-500/10" : ""
                      }`}
                    >
                      <div
                        className="cursor-pointer hover:underline min-w-0"
                        onClick={() => handleOpenEdit(p)}
                      >
                        <div className="text-sm font-bold flex items-center gap-2 text-zinc-200">
                          <ChoiceBadge assigned={selectedCommittee} prefs={prefs} />
                          <span className="truncate">{p.name}</span>
                          {isChair && (
                            <Crown
                              size={14}
                              className="text-amber-400 shrink-0 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]"
                            />
                          )}
                          {hasChairInterestIn(p, selectedCommittee) && !isChair && (
                            <span
                              title="Expressed Chair Interest"
                              className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[9px] font-black uppercase"
                            >
                              Chair Interest
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-2 mt-0.5">
                          {p.studentName && <span>Parent of {p.studentName}</span>}
                          {otherAssigned && (
                            <span className="text-cyan-400/80">
                              • {groupBy === "Pre-Show" ? "Show Week" : "Pre-Show"}: {otherAssigned}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:flex gap-1.5">
                          <PreferenceBadge rank="1" value={prefs.first} current={selectedCommittee} />
                          <PreferenceBadge
                            rank="2"
                            value={prefs.second}
                            current={selectedCommittee}
                          />
                        </div>
                        <select
                          className={`bg-zinc-900 border rounded px-2 py-1 text-[10px] outline-none cursor-pointer ${
                            isChair
                              ? "border-amber-500 text-amber-400"
                              : "border-zinc-800 text-zinc-400 focus:text-white"
                          }`}
                          value={assignments[p.id] || "Unassigned"}
                          onChange={(e) => {
                            setAssignments((prev) => ({ ...prev, [p.id]: e.target.value }));
                            if (isChair) {
                              setChairs((prev) => ({ ...prev, [p.id]: false }));
                            }
                          }}
                        >
                          {COMMITTEES[groupBy].map((c: string) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          <option value="Unassigned">Unassigned</option>
                        </select>

                        {selectedCommittee !== "Show Chair" &&
                          selectedCommittee !== "Unassigned" && (
                            <button
                              onClick={() =>
                                setChairs((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                              }
                              className={`p-1.5 rounded transition-all flex-shrink-0 ${
                                isChair
                                  ? "bg-amber-500 text-white shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                                  : "bg-zinc-800 text-zinc-500 hover:text-amber-400 hover:bg-zinc-700"
                              }`}
                              title={isChair ? "Remove as Chair" : "Make Chair"}
                            >
                              <Crown size={14} />
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
                {currentTeam.length === 0 && (
                  <div className="p-8 text-center text-zinc-600 text-sm italic">
                    No volunteers assigned to {selectedCommittee} yet.
                  </div>
                )}
              </div>

              {/* Smart Swap Candidates */}
              {selectedCommittee !== "Unassigned" && swapSuggestions.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                    <ArrowRightLeft size={13} /> Best-Fit Candidates to Pull In
                  </h3>
                  <div className="bg-zinc-950 border border-blue-500/20 rounded-xl divide-y divide-white/5">
                    {swapSuggestions.map((cand) => (
                      <div
                        key={cand.volunteer.id}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-white/5"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span className="truncate">{cand.volunteer.name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[9px] font-black uppercase">
                              {cand.choiceRank === "flexible"
                                ? "Flexible"
                                : `#${cand.choiceRank} Choice`}
                            </span>
                            {cand.chairInterestMatch && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[9px] font-black uppercase">
                                Chair Fit
                              </span>
                            )}
                            {cand.continuityMatch && (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[9px] font-black uppercase">
                                Continuity
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            Currently:{" "}
                            <span
                              className={
                                cand.fromOverstaffed ? "text-amber-400 font-bold" : "text-zinc-300"
                              }
                            >
                              {cand.currentCommittee}
                            </span>
                            {cand.fromOverstaffed && cand.currentCommittee !== "Unassigned"
                              ? " (over target)"
                              : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAssignments((prev) => ({
                              ...prev,
                              [cand.volunteer.id]: selectedCommittee,
                            }))
                          }
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase shrink-0"
                        >
                          Move Here
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// Clean Choice Badge generator
function ChoiceBadge({
  assigned,
  prefs,
}: {
  assigned: string | null;
  prefs: { first: string | null; second: string | null; third: string | null };
}) {
  if (!assigned || assigned === "Unassigned" || assigned === "Show Chair") return null;

  if (assigned === prefs.first)
    return (
      <span
        title="1st Choice"
        className="w-4 h-4 shrink-0 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-black"
      >
        1
      </span>
    );
  if (assigned === prefs.second)
    return (
      <span
        title="2nd Choice"
        className="w-4 h-4 shrink-0 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[9px] font-black"
      >
        2
      </span>
    );
  if (assigned === prefs.third)
    return (
      <span
        title="3rd Choice"
        className="w-4 h-4 shrink-0 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[9px] font-black"
      >
        3
      </span>
    );
  if (
    isFlexibleChoice(prefs.first) ||
    isFlexibleChoice(prefs.second) ||
    isFlexibleChoice(prefs.third)
  )
    return (
      <span
        title="Flexible / Anywhere Needed"
        className="w-4 h-4 shrink-0 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[9px] font-black"
      >
        ★
      </span>
    );

  return (
    <span
      title="Not Requested"
      className="w-4 h-4 shrink-0 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center text-[9px] font-black"
    >
      -
    </span>
  );
}

function PreferenceBadge({
  rank,
  value,
  current,
}: {
  rank: string;
  value: string | null;
  current: string;
}) {
  const isMatch = value === current;
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-bold uppercase ${
        isMatch
          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
          : "bg-zinc-900 border-zinc-800 text-zinc-600"
      }`}
    >
      <span className="opacity-50">{rank}:</span>
      <span>{value || "-"}</span>
    </div>
  );
}
