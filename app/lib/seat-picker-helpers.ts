// Pure helpers for public reserved seat selection, grouping, and conflict validation.

export type PublicSeatAvailability = "available" | "ada" | "taken" | "held";

export interface PublicSeatItem {
  id: number;
  section: string;
  rowLabel: string;
  seatNumber: number;
  availability: PublicSeatAvailability;
  gridX: number | null;
  gridY: number | null;
}

export function formatSeatLabel(seat: {
  section?: string | null;
  rowLabel?: string | null;
  seatNumber?: number | null;
}): string {
  const sec = (seat.section || "").trim();
  const row = (seat.rowLabel || "").trim();
  const num = seat.seatNumber != null ? String(seat.seatNumber) : "";
  const rowSeat = row && num ? `Row ${row}, Seat ${num}` : row || (num ? `Seat ${num}` : "Seat");
  return sec ? `${sec} • ${rowSeat}` : rowSeat;
}

export function formatShortSeatTag(seat: {
  rowLabel?: string | null;
  seatNumber?: number | null;
}): string {
  const row = (seat.rowLabel || "").trim();
  const num = seat.seatNumber != null ? String(seat.seatNumber) : "";
  return row && num ? `${row}-${num}` : row || num || "Seat";
}

export interface SeatRowGroup {
  rowLabel: string;
  seats: PublicSeatItem[];
}

export interface SeatSectionGroup {
  section: string;
  rows: SeatRowGroup[];
}

/**
 * Groups flat venue seats into Sections -> Rows -> Seat Numbers in natural display order.
 */
export function groupSeatsForDisplay(seats: PublicSeatItem[]): SeatSectionGroup[] {
  const sectionMap = new Map<string, Map<string, PublicSeatItem[]>>();

  for (const seat of seats) {
    const sec = seat.section || "Main";
    const row = seat.rowLabel || "A";
    if (!sectionMap.has(sec)) sectionMap.set(sec, new Map());
    const rowMap = sectionMap.get(sec)!;
    if (!rowMap.has(row)) rowMap.set(row, []);
    rowMap.get(row)!.push(seat);
  }

  const sections = Array.from(sectionMap.entries()).map(([section, rowMap]) => {
    const rows: SeatRowGroup[] = Array.from(rowMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([rowLabel, rowSeats]) => ({
        rowLabel,
        seats: [...rowSeats].sort((a, b) => a.seatNumber - b.seatNumber),
      }));
    return { section, rows };
  });

  // Sort sections nicely: Left -> Center -> Right -> Balcony -> alphabetical
  const sectionRank = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("left")) return 0;
    if (n.includes("center") || n.includes("main") || n.includes("orchestra")) return 1;
    if (n.includes("right")) return 2;
    if (n.includes("balcony") || n.includes("mezzanine")) return 3;
    return 4;
  };

  return sections.sort(
    (a, b) => sectionRank(a.section) - sectionRank(b.section) || a.section.localeCompare(b.section)
  );
}

/**
 * Validates requested seat IDs against available seats and already taken/held seat IDs.
 */
export function validateRequestedSeats(params: {
  requestedSeatIds: number[];
  venueSeatIds: Set<number>;
  unavailableSeatIds: Set<number>;
  maxPerOrder: number;
}): { ok: true; seatIds: number[] } | { ok: false; error: string; conflictSeatIds?: number[] } {
  const unique = Array.from(
    new Set(params.requestedSeatIds.filter((id) => Number.isInteger(id) && id > 0))
  );

  if (unique.length === 0) {
    return { ok: false, error: "Please select at least one seat." };
  }
  if (unique.length > params.maxPerOrder) {
    return { ok: false, error: `Maximum ${params.maxPerOrder} seats per order.` };
  }

  const invalid = unique.filter((id) => !params.venueSeatIds.has(id));
  if (invalid.length > 0) {
    return { ok: false, error: "One or more selected seats do not belong to this venue." };
  }

  const conflicts = unique.filter((id) => params.unavailableSeatIds.has(id));
  if (conflicts.length > 0) {
    return {
      ok: false,
      error: "One or more selected seats were just reserved by another buyer. Please pick different seats.",
      conflictSeatIds: conflicts,
    };
  }

  return { ok: true, seatIds: unique };
}
