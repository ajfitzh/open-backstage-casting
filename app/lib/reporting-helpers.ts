// app/lib/reporting-helpers.ts
// Pure helpers for classroom time-range parsing, room capacity/conflict checks,
// and accurate ticket/financial aggregation. Zero path aliases for Node ESM unit tests.

export interface ParsedTimeRange {
  startMinutes: number; // minutes since midnight (0..1439)
  endMinutes: number;
  startLabel: string; // e.g. "6:00 PM"
}

function parseSingleClockTime(raw: string): number | null {
  const clean = raw.trim().toUpperCase();
  const m = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!m) return null;

  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3];

  if (Number.isNaN(hour) || Number.isNaN(minute) || minute < 0 || minute > 59) return null;
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;

  return hour * 60 + minute;
}

export function formatMinutesTo12Hour(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.floor(totalMinutes)));
  const h24 = Math.floor(clamped / 60);
  const min = clamped % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(min).padStart(2, "0")} ${suffix}`;
}

/**
 * Parses class time strings like "06:00 PM-08:00 PM", "09:00AM-03:00PM", "6:30 PM"
 * into normalized start/end minutes and a consistent 12-hour start bucket label.
 */
export function parseClassTimeRange(raw: string | null | undefined): ParsedTimeRange | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toUpperCase() === "TBD") return null;

  const parts = trimmed.split(/\s*[-–]\s*/);
  const start = parseSingleClockTime(parts[0]);
  if (start === null) return null;

  let end = parts.length > 1 ? parseSingleClockTime(parts[1]) : null;
  if (end === null || end <= start) {
    end = Math.min(1439, start + 60);
  }

  return {
    startMinutes: start,
    endMinutes: end,
    startLabel: formatMinutesTo12Hour(start),
  };
}

export function doTimeRangesOverlap(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const parsedA = parseClassTimeRange(a);
  const parsedB = parseClassTimeRange(b);
  if (!parsedA || !parsedB) return false;
  return parsedA.startMinutes < parsedB.endMinutes && parsedB.startMinutes < parsedA.endMinutes;
}

export function evaluateRoomCapacity(
  enrolled: number,
  capacity: number | null | undefined
): {
  status: "ok" | "near_full" | "over_capacity" | "unknown";
  utilizationPct: number | null;
} {
  if (!capacity || capacity <= 0) {
    return { status: "unknown", utilizationPct: null };
  }
  const safeEnrolled = Math.max(0, Math.floor(enrolled || 0));
  const utilizationPct = Math.round((safeEnrolled / capacity) * 100);
  if (safeEnrolled > capacity) return { status: "over_capacity", utilizationPct };
  if (utilizationPct >= 85) return { status: "near_full", utilizationPct };
  return { status: "ok", utilizationPct };
}

export interface RoomConflict {
  spaceId: number;
  day: string;
  classIds: [number, number];
  classNames: [string, string];
}

export function detectRoomConflicts(
  classes: { id: number; name: string; spaceId: number | null; day: string; time: string }[]
): RoomConflict[] {
  const conflicts: RoomConflict[] = [];
  const byRoomDay = new Map<string, typeof classes>();

  for (const cls of classes) {
    if (!cls.spaceId || !cls.day || cls.day === "TBD") continue;
    const key = `${cls.spaceId}::${cls.day.toLowerCase()}`;
    const list = byRoomDay.get(key) || [];
    list.push(cls);
    byRoomDay.set(key, list);
  }

  for (const list of byRoomDay.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (doTimeRangesOverlap(list[i].time, list[j].time)) {
          conflicts.push({
            spaceId: list[i].spaceId!,
            day: list[i].day,
            classIds: [list[i].id, list[j].id],
            classNames: [list[i].name, list[j].name],
          });
        }
      }
    }
  }

  return conflicts;
}

// ============================================================================
// SHOW ANALYTICS & TICKET REVENUE AGGREGATION (NO HYBRID DOUBLE-COUNTING)
// ============================================================================

export interface ShowTicketAggregationInput {
  legacySold: number;
  legacyCapacity: number;
  legacyCount: number;
  relationalPerformances: {
    ticketsSold: number;
    capacity: number;
    ticketPrice?: number | null;
  }[];
  productionTicketPrice?: number | null;
  fallbackTicketPrice?: number;
  actualStripeRevenueCents?: number;
}

export function computeShowTicketStats(input: ShowTicketAggregationInput) {
  const fallbackPrice = input.fallbackTicketPrice ?? 15;
  const prodPrice =
    input.productionTicketPrice && input.productionTicketPrice > 0
      ? input.productionTicketPrice
      : fallbackPrice;

  const hasRelational = input.relationalPerformances.length > 0;

  let totalSold = 0;
  let totalCapacity = 0;
  let performanceCount = 0;
  let estimatedRevenue = 0;
  let source: "Modern Linked" | "Legacy JSON" | "None" = "None";

  // Prefer relational performances when present so shows with both legacy JSON and
  // relational rows are NEVER double-counted.
  if (hasRelational) {
    source = "Modern Linked";
    performanceCount = input.relationalPerformances.length;
    for (const perf of input.relationalPerformances) {
      const sold = Math.max(0, Number(perf.ticketsSold) || 0);
      const cap = Math.max(0, Number(perf.capacity) || 0);
      const unitPrice = perf.ticketPrice && perf.ticketPrice > 0 ? perf.ticketPrice : prodPrice;
      totalSold += sold;
      totalCapacity += cap;
      estimatedRevenue += sold * unitPrice;
    }
  } else if (input.legacyCount > 0 || input.legacySold > 0) {
    source = "Legacy JSON";
    totalSold = Math.max(0, Number(input.legacySold) || 0);
    totalCapacity = Math.max(0, Number(input.legacyCapacity) || 0);
    performanceCount = Math.max(0, Number(input.legacyCount) || 0);
    estimatedRevenue = totalSold * prodPrice;
  }

  const actualStripeRevenue =
    input.actualStripeRevenueCents && input.actualStripeRevenueCents > 0
      ? Math.round(input.actualStripeRevenueCents) / 100
      : 0;

  // Use actual Stripe revenue when it's recorded (or exceeds estimate if online box office is active)
  const revenue =
    actualStripeRevenue > 0 ? Math.max(actualStripeRevenue, Math.round(estimatedRevenue)) : Math.round(estimatedRevenue);

  const avgFill = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;

  return {
    totalSold,
    totalCapacity,
    performances: performanceCount,
    avgFill,
    revenue,
    actualStripeRevenue,
    unitPriceUsed: prodPrice,
    source,
  };
}
