// app/lib/committee-matcher.ts
// Global Optimal Committee Matcher (Min-Cost Max-Flow / Successive Shortest Augmenting Path),
// Swap Suggestion Engine, and Household Fulfillment Tracker.

export type CommitteePhase = "Pre-Show" | "Show Week";

export interface CommitteeVolunteer {
  id: number;
  name: string;
  email: string;
  phone: string;
  studentName: string;
  preShow1: string | null;
  preShow2: string | null;
  preShow3: string | null;
  showWeek1: string | null;
  showWeek2: string | null;
  showWeek3: string | null;
  chairInterest?: string[];
  notes?: string;
  familyKey?: string;
  assignedPreShow: string | null;
  assignedShowWeek: string | null;
  isChair: boolean;
}

export interface MatcherOptions {
  /** Only assign currently unassigned volunteers (true) vs re-optimize all non-chair volunteers (false). */
  unassignedOnly?: boolean;
  /** Award bonus points when volunteer expressed chair interest in the committee. */
  prioritizeChairInterest?: boolean;
  /** Award bonus points for carrying over from the other phase's same committee. */
  continuityBonus?: boolean;
  /** Allow assigning unrequested committees as a fallback to fill remaining open slots. */
  allowFallback?: boolean;
}

export interface MatchReport {
  assignments: Record<number, string>;
  suggestedChairs: Record<number, boolean>;
  first: number;
  second: number;
  third: number;
  flexible: number;
  other: number;
  unassigned: number;
  continuityMatches: number;
  chairMatches: number;
  satisfactionScore: number;
  maxPossibleScore: number;
}

export interface SwapCandidate {
  volunteer: CommitteeVolunteer;
  currentCommittee: string;
  choiceRank: 1 | 2 | 3 | "flexible";
  chairInterestMatch: boolean;
  continuityMatch: boolean;
  fromOverstaffed: boolean;
  score: number;
}

export interface HouseholdFulfillmentRow {
  familyKey: string;
  familyLabel: string;
  students: string[];
  volunteers: {
    id: number;
    name: string;
    email: string;
    preShow: string | null;
    showWeek: string | null;
    isChair: boolean;
  }[];
  preShowCovered: boolean;
  showWeekCovered: boolean;
  isSplitAcrossParents: boolean;
  status: "fulfilled" | "partial" | "missing";
}

const FLEXIBLE_PATTERNS = ["anywhere", "flexible", "no preference", "wherever", "floater"];

export function isFlexibleChoice(val: string | null | undefined): boolean {
  if (!val) return false;
  const lower = val.trim().toLowerCase();
  return FLEXIBLE_PATTERNS.some((p) => lower.includes(p));
}

export function getVolunteerPrefs(v: CommitteeVolunteer, phase: CommitteePhase) {
  return phase === "Pre-Show"
    ? { first: v.preShow1, second: v.preShow2, third: v.preShow3 }
    : { first: v.showWeek1, second: v.showWeek2, third: v.showWeek3 };
}

export function getOtherPhaseAssignment(v: CommitteeVolunteer, phase: CommitteePhase): string | null {
  return phase === "Pre-Show" ? v.assignedShowWeek : v.assignedPreShow;
}

export function hasChairInterestIn(v: CommitteeVolunteer, committee: string): boolean {
  if (!v.chairInterest || v.chairInterest.length === 0) return false;
  const target = committee.trim().toLowerCase();
  return v.chairInterest.some((c) => c.trim().toLowerCase() === target);
}

/**
 * Score assigning volunteer `v` to `committee` for `phase`.
 * Higher is better. Returns null if not eligible (when allowFallback is false).
 */
export function scoreAssignment(
  v: CommitteeVolunteer,
  committee: string,
  phase: CommitteePhase,
  options: {
    prioritizeChairInterest?: boolean;
    continuityBonus?: boolean;
    allowFallback?: boolean;
    committeeNeedsChair?: boolean;
  } = {}
): { score: number; rank: 1 | 2 | 3 | "flexible" | "other"; chairMatch: boolean; continuity: boolean } | null {
  const prefs = getVolunteerPrefs(v, phase);
  const {
    prioritizeChairInterest = true,
    continuityBonus = true,
    allowFallback = false,
    committeeNeedsChair = false,
  } = options;

  let base = 0;
  let rank: 1 | 2 | 3 | "flexible" | "other" = "other";

  if (prefs.first === committee) {
    base = 100;
    rank = 1;
  } else if (prefs.second === committee) {
    base = 68;
    rank = 2;
  } else if (prefs.third === committee) {
    base = 38;
    rank = 3;
  } else if (
    isFlexibleChoice(prefs.first) ||
    isFlexibleChoice(prefs.second) ||
    isFlexibleChoice(prefs.third)
  ) {
    base = 52;
    rank = "flexible";
  } else if (allowFallback) {
    base = 6;
    rank = "other";
  } else {
    return null;
  }

  const chairMatch = prioritizeChairInterest && hasChairInterestIn(v, committee);
  const otherPhase = getOtherPhaseAssignment(v, phase);
  const continuity = Boolean(continuityBonus && otherPhase && otherPhase === committee);

  const bonus =
    (chairMatch ? (committeeNeedsChair ? 38 : 18) : 0) +
    (continuity ? 24 : 0);

  return {
    score: base + bonus,
    rank,
    chairMatch,
    continuity,
  };
}

// --- Min-Cost Max-Flow (SPFA) for Global Optimal Weighted Bipartite Matching ---

interface Edge {
  to: number;
  rev: number;
  cap: number;
  cost: number; // negative score (we minimize cost = maximize score)
}

function addEdge(graph: Edge[][], from: number, to: number, cap: number, cost: number) {
  graph[from].push({ to, rev: graph[to].length, cap, cost });
  graph[to].push({ to: from, rev: graph[from].length - 1, cap: 0, cost: -cost });
}

/**
 * Globally optimal committee assignment using Min-Cost Max-Flow.
 * Maximizes total preference satisfaction, chair interest fit, and Pre-Show -> Show Week continuity
 * while strictly respecting committee target capacities and locked/chair assignments.
 */
export function solveOptimalCommitteeAssignments(
  volunteers: CommitteeVolunteer[],
  phase: CommitteePhase,
  committees: string[],
  targets: Record<string, number>,
  currentAssignments: Record<number, string>,
  currentChairs: Record<number, boolean>,
  options: MatcherOptions = {}
): MatchReport {
  const {
    unassignedOnly = true,
    prioritizeChairInterest = true,
    continuityBonus = true,
    allowFallback = false,
  } = options;

  const validCommitteeSet = new Set(committees);
  const nextAssignments: Record<number, string> = {};
  const nextChairs: Record<number, boolean> = { ...currentChairs };

  // Track locked volunteers & remaining capacity per committee
  const lockedIds = new Set<number>();
  const usedPerCommittee: Record<string, number> = {};
  const committeeHasChair: Record<string, boolean> = {};
  for (const c of committees) {
    usedPerCommittee[c] = 0;
    committeeHasChair[c] = false;
  }

  for (const v of volunteers) {
    const existing = currentAssignments[v.id];
    const isAssigned = Boolean(existing && existing !== "Unassigned" && validCommitteeSet.has(existing));
    const shouldLock = isAssigned && (unassignedOnly || Boolean(currentChairs[v.id]));

    if (shouldLock && existing) {
      lockedIds.add(v.id);
      nextAssignments[v.id] = existing;
      usedPerCommittee[existing] = (usedPerCommittee[existing] || 0) + 1;
      if (currentChairs[v.id]) committeeHasChair[existing] = true;
    }
  }

  const freeVolunteers = volunteers.filter((v) => !lockedIds.has(v.id));
  const V = freeVolunteers.length;
  const C = committees.length;

  // Build flow network:
  // 0 = SOURCE
  // 1..V = freeVolunteers
  // V+1..V+C = committees
  // V+C+1 = SINK
  const SOURCE = 0;
  const SINK = V + C + 1;
  const N = SINK + 1;
  const graph: Edge[][] = Array.from({ length: N }, () => []);

  for (let i = 0; i < V; i++) {
    addEdge(graph, SOURCE, 1 + i, 1, 0);
  }

  for (let j = 0; j < C; j++) {
    const comm = committees[j];
    const target = Math.max(0, targets[comm] ?? 0);
    const remaining = Math.max(0, target - (usedPerCommittee[comm] || 0));
    if (remaining > 0) {
      addEdge(graph, 1 + V + j, SINK, remaining, 0);
    }
  }

  // Add scored volunteer -> committee edges (cost = -score so min-cost maximizes score)
  for (let i = 0; i < V; i++) {
    const vol = freeVolunteers[i];
    for (let j = 0; j < C; j++) {
      const comm = committees[j];
      const scored = scoreAssignment(vol, comm, phase, {
        prioritizeChairInterest,
        continuityBonus,
        allowFallback,
        committeeNeedsChair: !committeeHasChair[comm],
      });
      if (scored) {
        // Subtract a large constant (1000) so maximizing flow is always preferred over leaving someone unassigned
        // when they have a valid edge, while still strictly preferring higher scores!
        const cost = -(1000 + scored.score);
        addEdge(graph, 1 + i, 1 + V + j, 1, cost);
      }
    }
  }

  // SPFA Min-Cost Max-Flow
  const INF = 1e15;
  while (true) {
    const dist = new Array<number>(N).fill(INF);
    const inQueue = new Array<boolean>(N).fill(false);
    const prevNode = new Array<number>(N).fill(-1);
    const prevEdge = new Array<number>(N).fill(-1);

    dist[SOURCE] = 0;
    const queue: number[] = [SOURCE];
    inQueue[SOURCE] = true;

    for (let head = 0; head < queue.length; head++) {
      const u = queue[head];
      inQueue[u] = false;
      for (let ei = 0; ei < graph[u].length; ei++) {
        const e = graph[u][ei];
        if (e.cap > 0 && dist[u] + e.cost < dist[e.to]) {
          dist[e.to] = dist[u] + e.cost;
          prevNode[e.to] = u;
          prevEdge[e.to] = ei;
          if (!inQueue[e.to]) {
            queue.push(e.to);
            inQueue[e.to] = true;
          }
        }
      }
    }

    if (dist[SINK] >= 0) break; // No augmenting path improves total score

    // Augment 1 unit along shortest path
    let cur = SINK;
    while (cur !== SOURCE) {
      const p = prevNode[cur];
      const ei = prevEdge[cur];
      const e = graph[p][ei];
      e.cap -= 1;
      graph[cur][e.rev].cap += 1;
      cur = p;
    }
  }

  // Extract assignments from saturated volunteer -> committee edges
  for (let i = 0; i < V; i++) {
    const vol = freeVolunteers[i];
    const u = 1 + i;
    let assigned: string | null = null;
    for (const e of graph[u]) {
      if (e.to >= 1 + V && e.to < SINK && e.cap === 0) {
        assigned = committees[e.to - (1 + V)];
        break;
      }
    }
    if (assigned) {
      nextAssignments[vol.id] = assigned;
    }
  }

  // Auto-suggest a chair for any committee without one if a member has chairInterest in it
  for (const comm of committees) {
    if (comm === "Show Chair" || committeeHasChair[comm]) continue;
    const candidate = volunteers.find(
      (v) => nextAssignments[v.id] === comm && hasChairInterestIn(v, comm)
    );
    if (candidate) {
      nextChairs[candidate.id] = true;
      committeeHasChair[comm] = true;
    }
  }

  // Compute summary metrics
  let first = 0;
  let second = 0;
  let third = 0;
  let flexible = 0;
  let other = 0;
  let unassigned = 0;
  let continuityMatches = 0;
  let chairMatches = 0;
  let satisfactionScore = 0;

  for (const v of volunteers) {
    const assigned = nextAssignments[v.id];
    if (!assigned || assigned === "Unassigned") {
      unassigned++;
      continue;
    }
    const prefs = getVolunteerPrefs(v, phase);
    if (assigned === prefs.first) {
      first++;
      satisfactionScore += 100;
    } else if (assigned === prefs.second) {
      second++;
      satisfactionScore += 68;
    } else if (assigned === prefs.third) {
      third++;
      satisfactionScore += 38;
    } else if (
      isFlexibleChoice(prefs.first) ||
      isFlexibleChoice(prefs.second) ||
      isFlexibleChoice(prefs.third)
    ) {
      flexible++;
      satisfactionScore += 80;
    } else {
      other++;
      satisfactionScore += 15;
    }

    if (getOtherPhaseAssignment(v, phase) === assigned) continuityMatches++;
    if (hasChairInterestIn(v, assigned)) chairMatches++;
  }

  return {
    assignments: nextAssignments,
    suggestedChairs: nextChairs,
    first,
    second,
    third,
    flexible,
    other,
    unassigned,
    continuityMatches,
    chairMatches,
    satisfactionScore,
    maxPossibleScore: volunteers.length * 100,
  };
}

/**
 * Find the best volunteers to pull into an understaffed committee (from Unassigned or overstaffed committees).
 */
export function findSwapSuggestions(
  targetCommittee: string,
  volunteers: CommitteeVolunteer[],
  phase: CommitteePhase,
  assignments: Record<number, string>,
  chairs: Record<number, boolean>,
  targets: Record<string, number>,
  limit = 6
): SwapCandidate[] {
  const counts: Record<string, number> = {};
  for (const v of volunteers) {
    const c = assignments[v.id] || "Unassigned";
    counts[c] = (counts[c] || 0) + 1;
  }

  const candidates: SwapCandidate[] = [];

  for (const v of volunteers) {
    const current = assignments[v.id] || "Unassigned";
    if (current === targetCommittee || chairs[v.id]) continue;

    const scored = scoreAssignment(v, targetCommittee, phase, {
      prioritizeChairInterest: true,
      continuityBonus: true,
      allowFallback: false,
    });
    if (!scored || scored.rank === "other") continue;

    const currentTarget = targets[current] ?? 0;
    const fromOverstaffed = current === "Unassigned" || (counts[current] || 0) > currentTarget;
    const priorityBoost = current === "Unassigned" ? 40 : fromOverstaffed ? 25 : 0;

    candidates.push({
      volunteer: v,
      currentCommittee: current,
      choiceRank: scored.rank,
      chairInterestMatch: scored.chairMatch,
      continuityMatch: scored.continuity,
      fromOverstaffed,
      score: scored.score + priorityBoost,
    });
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Group cast students and parent volunteers into Household Fulfillment rows,
 * handling multi-kid families and split-parent households cleanly.
 */
export function computeHouseholdFulfillment(
  volunteers: CommitteeVolunteer[],
  students: { id?: number; name?: string; lastName?: string; email?: string; familyKey?: string }[],
  preShowAssignments: Record<number, string>,
  showWeekAssignments: Record<number, string>,
  chairs: Record<number, boolean>
): HouseholdFulfillmentRow[] {
  const map = new Map<string, HouseholdFulfillmentRow>();

  const deriveKeyFromName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    const last = parts.length > 1 ? parts[parts.length - 1] : parts[0] || "unknown";
    return `last:${last.toLowerCase()}`;
  };

  const getOrCreate = (key: string, fallbackLabel: string) => {
    let row = map.get(key);
    if (!row) {
      row = {
        familyKey: key,
        familyLabel: fallbackLabel,
        students: [],
        volunteers: [],
        preShowCovered: false,
        showWeekCovered: false,
        isSplitAcrossParents: false,
        status: "missing",
      };
      map.set(key, row);
    }
    return row;
  };

  // 1. Seed households from volunteers
  for (const v of volunteers) {
    const key =
      v.familyKey ||
      (v.email ? `email:${v.email.trim().toLowerCase()}` : deriveKeyFromName(v.studentName || v.name));
    const labelSource = v.studentName && v.studentName !== "Unknown" ? v.studentName : v.name;
    const lastWord = labelSource.trim().split(/\s+/).slice(-1)[0] || "Family";
    const row = getOrCreate(key, `${lastWord} Family`);

    if (v.studentName && v.studentName !== "Unknown" && !row.students.includes(v.studentName)) {
      row.students.push(v.studentName);
    }

    const pre = preShowAssignments[v.id] && preShowAssignments[v.id] !== "Unassigned"
      ? preShowAssignments[v.id]
      : null;
    const show = showWeekAssignments[v.id] && showWeekAssignments[v.id] !== "Unassigned"
      ? showWeekAssignments[v.id]
      : null;

    row.volunteers.push({
      id: v.id,
      name: v.name,
      email: v.email,
      preShow: pre,
      showWeek: show,
      isChair: Boolean(chairs[v.id]),
    });
  }

  // 2. Attach cast students who might not have a volunteer row yet
  for (const s of students) {
    const rawName = (s.name || "").trim();
    if (!rawName) continue;
    const byNameMatch = Array.from(map.values()).find((r) =>
      r.students.some((st) => st.toLowerCase() === rawName.toLowerCase())
    );
    if (byNameMatch) continue;

    const key = s.familyKey || (s.email ? `email:${s.email.trim().toLowerCase()}` : deriveKeyFromName(rawName));
    const lastWord = (s.lastName || rawName.split(/\s+/).slice(-1)[0] || "Family").trim();
    const row = getOrCreate(key, `${lastWord} Family`);
    if (!row.students.includes(rawName)) {
      row.students.push(rawName);
    }
  }

  // 3. Evaluate fulfillment status per household
  const results: HouseholdFulfillmentRow[] = [];
  for (const row of map.values()) {
    const preParents = new Set(row.volunteers.filter((v) => v.preShow).map((v) => v.name.toLowerCase()));
    const showParents = new Set(row.volunteers.filter((v) => v.showWeek).map((v) => v.name.toLowerCase()));

    row.preShowCovered = preParents.size > 0;
    row.showWeekCovered = showParents.size > 0;
    row.isSplitAcrossParents =
      row.preShowCovered &&
      row.showWeekCovered &&
      row.volunteers.length > 1 &&
      !row.volunteers.some((v) => v.preShow && v.showWeek);

    if (row.preShowCovered && row.showWeekCovered) {
      row.status = "fulfilled";
    } else if (row.preShowCovered || row.showWeekCovered) {
      row.status = "partial";
    } else {
      row.status = "missing";
    }

    results.push(row);
  }

  const order = { missing: 0, partial: 1, fulfilled: 2 };
  return results.sort((a, b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return a.familyLabel.localeCompare(b.familyLabel);
  });
}
