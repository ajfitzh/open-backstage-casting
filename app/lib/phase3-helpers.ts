// app/lib/phase3-helpers.ts
// Pure, browser-safe & Node-ESM-compatible helpers for Phase 3:
// - Academy class availability & waitlist calculation
// - Stripe class enrollment metadata parsing
// - Venue reserved seating grid generator
// - Per-Actor Costume Plot grouping
// - Avery 5163 QR label sheet geometry

export type SeatStatus = "available" | "accessible" | "vip" | "blocked";

export interface SeatDraft {
  id?: number;
  section: string;
  rowLabel: string;
  seatNumber: number;
  status: SeatStatus;
  gridX: number;
  gridY: number;
}

export function computeClassAvailability(input: {
  capacity: number | null | undefined;
  enrolledCount: number;
  waitlistEnabled?: boolean;
}) {
  const cap = Math.max(1, Math.floor(Number(input.capacity || 20)));
  const enrolled = Math.max(0, Math.floor(Number(input.enrolledCount || 0)));
  const remaining = Math.max(0, cap - enrolled);
  const isFull = remaining === 0;
  return {
    capacity: cap,
    enrolledCount: enrolled,
    remaining,
    isFull,
    canEnroll: !isFull,
    canWaitlist: isFull && input.waitlistEnabled !== false,
  };
}

export function parseClassEnrollmentMetadata(
  metadata: Record<string, string | undefined> | null | undefined
): {
  tenant: string;
  classId: number;
  studentId: number;
  paidCents: number;
} | null {
  if (!metadata || metadata.type !== "class_enrollment") return null;
  const tenant = (metadata.tenant || "").trim().toLowerCase();
  const classId = Number(metadata.classId);
  const studentId = Number(metadata.studentId);
  const paidCents = Math.max(0, Math.floor(Number(metadata.paidCents || 0)));
  if (!tenant || !Number.isInteger(classId) || classId <= 0 || !Number.isInteger(studentId) || studentId <= 0) {
    return null;
  }
  return { tenant, classId, studentId, paidCents };
}

export function generateVenueSeatGrid(input: {
  section?: string;
  rowCount: number;
  seatsPerRow: number;
  startRowOffset?: number;
}): SeatDraft[] {
  const section = (input.section || "Orchestra").trim() || "Orchestra";
  const rows = Math.min(26, Math.max(1, Math.floor(input.rowCount || 6)));
  const cols = Math.min(30, Math.max(1, Math.floor(input.seatsPerRow || 10)));
  const offset = Math.max(0, Math.floor(input.startRowOffset || 0));

  const seats: SeatDraft[] = [];
  for (let r = 0; r < rows; r++) {
    const rowLabel = String.fromCharCode(65 + ((r + offset) % 26));
    for (let c = 0; c < cols; c++) {
      seats.push({
        section,
        rowLabel,
        seatNumber: c + 1,
        status: "available",
        gridX: c,
        gridY: r + offset,
      });
    }
  }
  return seats;
}

export function nextSeatStatus(current: string | null | undefined): SeatStatus {
  if (current === "available") return "vip";
  if (current === "vip") return "accessible";
  if (current === "accessible") return "blocked";
  return "available";
}

export interface CostumePlotActor {
  personId: number;
  name: string;
  role: string;
  garments: {
    id: number;
    sku: string;
    category: string;
    binLocation: string;
    notes: string;
    status: string;
  }[];
}

export function groupActorCostumePlot(
  cast: { personId: number; name: string; role: string }[],
  garments: {
    id: number;
    sku: string;
    category: string;
    binLocation: string;
    notes: string;
    status?: string;
    assignedPersonId?: number | null;
    assignedProductionId?: number | null;
  }[],
  productionId?: number
): CostumePlotActor[] {
  const byPerson = new Map<number, CostumePlotActor["garments"]>();
  for (const g of garments) {
    if (!g.assignedPersonId) continue;
    if (productionId && g.assignedProductionId && g.assignedProductionId !== productionId) {
      continue;
    }
    const list = byPerson.get(g.assignedPersonId) || [];
    list.push({
      id: g.id,
      sku: g.sku,
      category: g.category || "Garment",
      binLocation: g.binLocation || "",
      notes: g.notes || "",
      status: g.status || "Checked Out",
    });
    byPerson.set(g.assignedPersonId, list);
  }

  return cast
    .map((actor) => ({
      personId: actor.personId,
      name: actor.name,
      role: actor.role || "Cast",
      garments: byPerson.get(actor.personId) || [],
    }))
    .sort((a, b) => b.garments.length - a.garments.length || a.name.localeCompare(b.name));
}

// Avery 5163 US Letter (8.5 x 11 in = 612 x 792 pt): 2 cols x 5 rows, 4" x 2" (288 x 144 pt)
export const AVERY_5163 = {
  pageWidth: 612,
  pageHeight: 792,
  cols: 2,
  rows: 5,
  perPage: 10,
  labelWidth: 288,
  labelHeight: 144,
  marginLeft: 12,
  marginTop: 36,
  gutterX: 12,
  gutterY: 0,
} as const;

export function computeAvery5163LabelRects(count: number) {
  const rects: { pageIndex: number; x: number; y: number; width: number; height: number }[] = [];
  for (let i = 0; i < count; i++) {
    const pageIndex = Math.floor(i / AVERY_5163.perPage);
    const slot = i % AVERY_5163.perPage;
    const col = slot % AVERY_5163.cols;
    const row = Math.floor(slot / AVERY_5163.cols);
    const x = AVERY_5163.marginLeft + col * (AVERY_5163.labelWidth + AVERY_5163.gutterX);
    // PDF origin is bottom-left
    const topY = AVERY_5163.pageHeight - AVERY_5163.marginTop - row * (AVERY_5163.labelHeight + AVERY_5163.gutterY);
    const y = topY - AVERY_5163.labelHeight;
    rects.push({
      pageIndex,
      x,
      y,
      width: AVERY_5163.labelWidth,
      height: AVERY_5163.labelHeight,
    });
  }
  return rects;
}
