// app/lib/audition-slot-planner.ts
// Browser-safe pure helper for generating standardized audition slots.

export interface GeneratedAuditionSlot {
  timeLabel: string;
  dateTime: string;
  capacity: number;
}

function parseHHMM(hhmm: string): number | null {
  const match = (hhmm || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number.parseInt(match[1], 10);
  const m = Number.parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function format12Hour(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

export function generateAuditionSlotsPlan(input: {
  date: string;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  capacity: number;
  dayLabelOverride?: string;
}): { ok: true; slots: GeneratedAuditionSlot[] } | { ok: false; error: string } {
  const dateStr = (input.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { ok: false, error: "Please provide a valid date (YYYY-MM-DD)." };
  }

  const startMin = parseHHMM(input.startTime);
  const endMin = parseHHMM(input.endTime);
  if (startMin === null || endMin === null || endMin <= startMin) {
    return { ok: false, error: "End time must be after start time." };
  }

  const step = Math.floor(Number(input.slotMinutes));
  if (!Number.isFinite(step) || step < 5 || step > 240) {
    return { ok: false, error: "Slot duration must be between 5 and 240 minutes." };
  }

  const capacity = Math.floor(Number(input.capacity));
  if (!Number.isFinite(capacity) || capacity < 1 || capacity > 200) {
    return { ok: false, error: "Slot capacity must be between 1 and 200." };
  }

  const [y, mo, d] = dateStr.split("-").map((n) => Number.parseInt(n, 10));
  const utcDate = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  const weekday =
    input.dayLabelOverride?.trim() ||
    utcDate.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

  const slots: GeneratedAuditionSlot[] = [];
  for (let cur = startMin; cur + step <= endMin; cur += step) {
    const h24 = String(Math.floor(cur / 60)).padStart(2, "0");
    const mins = String(cur % 60).padStart(2, "0");
    slots.push({
      timeLabel: `${weekday} ${format12Hour(cur)}`,
      dateTime: `${dateStr}T${h24}:${mins}:00`,
      capacity,
    });
    if (slots.length >= 60) break;
  }

  if (slots.length === 0) {
    return { ok: false, error: "Time window is shorter than a single slot duration." };
  }

  return { ok: true, slots };
}
