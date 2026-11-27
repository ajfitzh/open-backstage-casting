"use client";

import React, { useState } from "react";
import {
  Users,
  GitMerge,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  autoMergeSafeDuplicatesAction,
  getDuplicatePeopleClustersAction,
  mergePeopleAction,
  searchPeopleForMergeAction,
} from "@/app/actions/people-merge";
import type { DuplicateCluster, PersonMergeCandidate } from "@/app/lib/db/people-merge-repo";

export default function DuplicatePeoplePanel({ tenant }: { tenant: string }) {
  const [clusters, setClusters] = useState<DuplicateCluster[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [winnerOverrides, setWinnerOverrides] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Manual merge search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PersonMergeCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualWinner, setManualWinner] = useState<PersonMergeCandidate | null>(null);
  const [manualLoser, setManualLoser] = useState<PersonMergeCandidate | null>(null);

  async function scanDuplicates() {
    setLoading(true);
    setNotice(null);
    const res = await getDuplicatePeopleClustersAction(tenant);
    if (res.success && res.clusters) {
      setClusters(res.clusters);
    } else {
      setNotice({ type: "error", text: res.error || "Failed to scan duplicates." });
    }
    setLoading(false);
  }

  async function handleMergePair(winnerId: number, loserId: number, key: string) {
    setBusyKey(key);
    setNotice(null);
    const res = await mergePeopleAction(tenant, winnerId, loserId);
    if (res.success) {
      const moved = res.movedCounts || {};
      const movedSummary = [
        moved.assignments ? `${moved.assignments} cast` : null,
        moved.showTeam ? `${moved.showTeam} team` : null,
        moved.auditions ? `${moved.auditions} auditions` : null,
        moved.classesTaught ? `${moved.classesTaught} classes` : null,
      ]
        .filter(Boolean)
        .join(", ");
      setNotice({
        type: "success",
        text: `Merged profile #${loserId} into #${winnerId}${movedSummary ? ` (moved ${movedSummary})` : ""}.`,
      });
      await scanDuplicates();
      if (manualLoser?.id === loserId) setManualLoser(null);
    } else {
      setNotice({ type: "error", text: res.error || "Merge failed." });
    }
    setBusyKey(null);
  }

  async function handleAutoMergeSafe() {
    setBusyKey("auto-all");
    setNotice(null);
    const res = await autoMergeSafeDuplicatesAction(tenant);
    if (res.success) {
      setNotice({
        type: "success",
        text: `Auto-merged ${res.mergedCount ?? 0} safe exact-name duplicate profile(s).`,
      });
      await scanDuplicates();
    } else {
      setNotice({ type: "error", text: res.error || "Auto-merge failed." });
    }
    setBusyKey(null);
  }

  async function handleManualSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    const res = await searchPeopleForMergeAction(tenant, searchQuery);
    if (res.success && res.people) {
      setSearchResults(res.people);
    }
    setSearching(false);
  }

  const safeExactCount = (clusters || []).filter(
    (c) => c.matchType === "exact" && c.safeAutoMerge
  ).length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest mb-1">
            <GitMerge className="w-4 h-4" />
            Directory Hygiene
          </div>
          <h2 className="text-xl font-black text-white">Duplicate People & Profile Merger</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Safely unify duplicate students, parents, or staff (including nicknames like Pam / Pamela).
            All cast credits, creative team credits, auditions, classes, and family links are preserved.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {clusters && safeExactCount > 0 && (
            <button
              type="button"
              onClick={handleAutoMergeSafe}
              disabled={busyKey !== null}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Merge {safeExactCount} Safe
            </button>
          )}
          <button
            type="button"
            onClick={scanDuplicates}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {clusters ? "Rescan Directory" : "Scan for Duplicates"}
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-center gap-2 ${
            notice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Manual Merge Search */}
      <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Manual Merge (Any Two Profiles — Nicknames, Maiden Names, Typos)
        </div>
        <form onSubmit={handleManualSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email (e.g. Pam King, Smith)..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={searching || searchQuery.trim().length < 2}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-xs font-bold text-white"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </form>

        {(manualWinner || manualLoser) && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold uppercase">Keep (Primary):</span>
              <span className="text-white font-semibold">
                {manualWinner ? `${manualWinner.fullName} (#${manualWinner.id})` : "Select below"}
              </span>
            </div>
            <span className="text-zinc-600">←</span>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 font-bold uppercase">Merge & Remove:</span>
              <span className="text-white font-semibold">
                {manualLoser ? `${manualLoser.fullName} (#${manualLoser.id})` : "Select below"}
              </span>
            </div>
            {manualWinner && manualLoser && manualWinner.id !== manualLoser.id && (
              <button
                type="button"
                disabled={busyKey !== null}
                onClick={() => handleMergePair(manualWinner.id, manualLoser.id, "manual")}
                className="ml-auto px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black"
              >
                Confirm Merge
              </button>
            )}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="divide-y divide-zinc-800/80 max-h-64 overflow-y-auto rounded-lg border border-zinc-800">
            {searchResults.map((p) => (
              <div key={p.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">
                    {p.fullName}{" "}
                    <span className="text-zinc-500 font-normal">#{p.id}</span>
                    {p.hasPassword && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">
                        Login
                      </span>
                    )}
                  </div>
                  <div className="text-zinc-400 truncate">
                    {p.email || "No email"} · DOB: {p.dateOfBirth || "—"} · Cast: {p.assignmentsCount} · Team: {p.showTeamCount} · Classes: {p.classesCount}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setManualWinner(p)}
                    className={`px-2.5 py-1 rounded font-bold ${
                      manualWinner?.id === p.id
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualLoser(p)}
                    className={`px-2.5 py-1 rounded font-bold ${
                      manualLoser?.id === p.id
                        ? "bg-amber-500 text-black"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    Merge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-detected clusters */}
      {clusters !== null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Detected Clusters ({clusters.length})
            </span>
            <span>Rows with different DOBs are flagged for manual review</span>
          </div>

          {clusters.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 text-sm">
              No duplicate clusters detected! Your people directory is squeaky clean.
            </div>
          ) : (
            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {clusters.map((cluster) => {
                const selectedWinnerId =
                  winnerOverrides[cluster.key] ?? cluster.recommendedWinnerId;
                return (
                  <div
                    key={`${cluster.matchType}-${cluster.key}`}
                    className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white capitalize">{cluster.key}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            cluster.matchType === "exact"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-purple-500/20 text-purple-300"
                          }`}
                        >
                          {cluster.matchType === "exact" ? "Exact Name" : "Nickname Variant"}
                        </span>
                        {cluster.safeAutoMerge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Safe Match
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500">
                        {cluster.people.length} profiles
                      </span>
                    </div>

                    <div className="space-y-2">
                      {cluster.people.map((person) => {
                        const isWinner = person.id === selectedWinnerId;
                        const rowKey = `${selectedWinnerId}-${person.id}`;
                        return (
                          <div
                            key={person.id}
                            className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                              isWinner
                                ? "bg-emerald-500/5 border-emerald-500/30"
                                : "bg-zinc-900/80 border-zinc-800"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white">
                                  {person.fullName}
                                </span>
                                <span className="text-zinc-500">#{person.id}</span>
                                {isWinner && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">
                                    Primary
                                  </span>
                                )}
                                {person.hasPassword && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                                    Active Login
                                  </span>
                                )}
                                {person.roles.slice(0, 3).map((r) => (
                                  <span
                                    key={r}
                                    className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                              <div className="text-zinc-400 mt-0.5">
                                {person.email || "No email"} · DOB: {person.dateOfBirth || "—"} · Cast:{" "}
                                <strong className="text-zinc-200">{person.assignmentsCount}</strong> · Team:{" "}
                                <strong className="text-zinc-200">{person.showTeamCount}</strong> · Auditions:{" "}
                                <strong className="text-zinc-200">{person.auditionsCount}</strong> · Classes:{" "}
                                <strong className="text-zinc-200">{person.classesCount}</strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {!isWinner && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setWinnerOverrides((prev) => ({
                                        ...prev,
                                        [cluster.key]: person.id,
                                      }))
                                    }
                                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
                                  >
                                    Make Primary
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busyKey !== null}
                                    onClick={() =>
                                      handleMergePair(selectedWinnerId, person.id, rowKey)
                                    }
                                    className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold flex items-center gap-1"
                                  >
                                    <GitMerge className="w-3 h-3" />
                                    {busyKey === rowKey ? "Merging..." : "Merge into Primary"}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
