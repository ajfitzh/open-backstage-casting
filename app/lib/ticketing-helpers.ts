// app/lib/ticketing-helpers.ts
// Pure helpers for online general-admission ticketing, QR parsing, Stripe metadata,
// and half-letter booklet imposition. Zero path aliases for direct Node ESM unit tests.

import crypto from "node:crypto";

export const MAX_TICKETS_PER_ORDER = 12;

export function generateTicketCode(): string {
  const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `OBT-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export function buildTicketQrPayload(tenantSlug: string, code: string): string {
  const cleanTenant = (tenantSlug || "org").trim().toLowerCase();
  const cleanCode = (code || "").trim().toUpperCase();
  return `openbackstage://${cleanTenant}/ticket/${encodeURIComponent(cleanCode)}`;
}

export function parseTicketQrPayload(
  raw: string
): { tenant: string | null; code: string } | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;

  const uriMatch = trimmed.match(/^openbackstage:\/\/([^/]+)\/ticket\/([A-Z0-9-]+)$/i);
  if (uriMatch) {
    return {
      tenant: uriMatch[1].toLowerCase(),
      code: decodeURIComponent(uriMatch[2]).toUpperCase(),
    };
  }

  // Raw code e.g. OBT-A1B2-C3D4
  if (/^OBT-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(trimmed)) {
    return { tenant: null, code: trimmed.toUpperCase() };
  }

  return null;
}

export function computeRemainingSeats(
  totalInventory: number | null | undefined,
  ticketsSold: number | null | undefined
): number {
  const cap = Math.max(0, Math.floor(Number(totalInventory || 0)));
  const sold = Math.max(0, Math.floor(Number(ticketsSold || 0)));
  return Math.max(0, cap - sold);
}

export function validateTicketOrderRequest(input: {
  quantity: unknown;
  remainingSeats: number;
  salesOpen: boolean;
  unitPriceDollars: number;
  buyerName: unknown;
  buyerEmail: unknown;
}):
  | {
      valid: true;
      quantity: number;
      unitPriceCents: number;
      totalCents: number;
      buyerName: string;
      buyerEmail: string;
    }
  | { valid: false; error: string } {
  if (!input.salesOpen) {
    return { valid: false, error: "Online ticket sales are currently closed for this performance." };
  }

  const quantity = Math.floor(Number(input.quantity));
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { valid: false, error: "Please select at least 1 ticket." };
  }
  if (quantity > MAX_TICKETS_PER_ORDER) {
    return {
      valid: false,
      error: `Maximum ${MAX_TICKETS_PER_ORDER} tickets per online order.`,
    };
  }
  if (input.remainingSeats <= 0) {
    return { valid: false, error: "This performance is sold out." };
  }
  if (quantity > input.remainingSeats) {
    return {
      valid: false,
      error: `Only ${input.remainingSeats} seat${input.remainingSeats === 1 ? "" : "s"} remaining for this performance.`,
    };
  }

  const buyerName = typeof input.buyerName === "string" ? input.buyerName.trim() : "";
  if (buyerName.length < 2) {
    return { valid: false, error: "Please enter the ticket holder's full name." };
  }

  const buyerEmail =
    typeof input.buyerEmail === "string" ? input.buyerEmail.trim().toLowerCase() : "";
  if (!buyerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    return { valid: false, error: "Please enter a valid email address for QR ticket delivery." };
  }

  if (!Number.isFinite(input.unitPriceDollars) || input.unitPriceDollars <= 0) {
    return {
      valid: false,
      error: "Ticket price is not configured for this performance. Please contact the box office.",
    };
  }

  const unitPriceCents = Math.round(input.unitPriceDollars * 100);
  return {
    valid: true,
    quantity,
    unitPriceCents,
    totalCents: unitPriceCents * quantity,
    buyerName,
    buyerEmail,
  };
}

export interface ParsedTicketOrderMetadata {
  type: "ticket_order";
  tenant: string;
  orderId: number;
  productionId: number;
  performanceId: number;
}

export function parseTicketOrderMetadata(
  metadata: Record<string, string | null | undefined> | null | undefined
): ParsedTicketOrderMetadata | null {
  if (!metadata || metadata.type !== "ticket_order") return null;

  const tenant = (metadata.tenant || "").trim().toLowerCase();
  const orderId = Number(metadata.orderId);
  const productionId = Number(metadata.productionId);
  const performanceId = Number(metadata.performanceId);

  if (
    !tenant ||
    !Number.isInteger(orderId) ||
    orderId <= 0 ||
    !Number.isInteger(productionId) ||
    productionId <= 0 ||
    !Number.isInteger(performanceId) ||
    performanceId <= 0
  ) {
    return null;
  }

  return {
    type: "ticket_order",
    tenant,
    orderId,
    productionId,
    performanceId,
  };
}

// ============================================================================
// HALF-LETTER SADDLE-STITCH BOOKLET IMPOSITION (5.5 x 8.5 on 11 x 8.5 Letter)
// ============================================================================

export interface BookletSheet {
  /** 1-based page indices [left, right] for the front of the landscape Letter sheet */
  front: [number | null, number | null];
  /** 1-based page indices [left, right] for the back of the landscape Letter sheet (flip on short edge) */
  back: [number | null, number | null];
}

export function buildBookletImpositionSheets(contentPageCount: number): {
  paddedPageCount: number;
  sheets: BookletSheet[];
} {
  const safeCount = Math.max(1, Math.floor(contentPageCount));
  const paddedPageCount = Math.ceil(safeCount / 4) * 4;
  const sheetCount = paddedPageCount / 4;

  const pageOrNull = (p: number) => (p >= 1 && p <= safeCount ? p : null);

  const sheets: BookletSheet[] = [];
  for (let i = 0; i < sheetCount; i++) {
    const frontLeft = paddedPageCount - 2 * i;
    const frontRight = 1 + 2 * i;
    const backLeft = 2 + 2 * i;
    const backRight = paddedPageCount - 1 - 2 * i;
    sheets.push({
      front: [pageOrNull(frontLeft), pageOrNull(frontRight)],
      back: [pageOrNull(backLeft), pageOrNull(backRight)],
    });
  }

  return { paddedPageCount, sheets };
}
