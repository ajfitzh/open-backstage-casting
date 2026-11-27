// app/lib/phase2-helpers.ts
// Pure browser-safe, Node-ESM-compatible helpers for Phase 2:
// - Promo / comp code normalization & discount calculation
// - Double-cast track normalization ("All" | "Cast A" | "Cast B" | "Understudy")
// - Nightly Stage Manager Rehearsal Report email HTML builder

export type PromoDiscountType = "percent" | "fixed" | "comp";
export type CastTrack = "All" | "Cast A" | "Cast B" | "Understudy";

export const CAST_TRACK_OPTIONS: CastTrack[] = ["All", "Cast A", "Cast B", "Understudy"];

export function normalizeCastTrack(value: unknown): CastTrack {
  const clean = String(value || "").trim().toLowerCase();
  if (clean === "cast a" || clean === "a") return "Cast A";
  if (clean === "cast b" || clean === "b") return "Cast B";
  if (clean === "understudy" || clean === "u/s") return "Understudy";
  return "All";
}

export function normalizePromoCode(raw: string): string {
  return (raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 32);
}

export interface PromoCodeRule {
  code: string;
  discountType: PromoDiscountType;
  discountValue: number; // percent (1-100) or dollars (fixed) or ignored for comp
  active: boolean;
  maxUses: number | null;
  currentUses: number;
  expiresAt?: Date | string | null;
}

export function applyPromoCodeDiscount(input: {
  unitPriceCents: number;
  quantity: number;
  promo: PromoCodeRule;
  now?: Date;
}):
  | {
      ok: true;
      subtotalCents: number;
      discountCents: number;
      totalCents: number;
      effectiveUnitCents: number;
    }
  | { ok: false; error: string } {
  const { promo } = input;
  const now = input.now ?? new Date();

  if (!promo.active) {
    return { ok: false, error: "This promo code is no longer active." };
  }
  if (promo.expiresAt) {
    const exp = promo.expiresAt instanceof Date ? promo.expiresAt : new Date(promo.expiresAt);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < now.getTime()) {
      return { ok: false, error: "This promo code has expired." };
    }
  }
  if (promo.maxUses !== null && promo.maxUses > 0 && promo.currentUses >= promo.maxUses) {
    return { ok: false, error: "This promo code has reached its usage limit." };
  }

  const qty = Math.max(1, Math.floor(input.quantity));
  const unitCents = Math.max(0, Math.round(input.unitPriceCents));
  const subtotalCents = unitCents * qty;

  let discountCents = 0;
  if (promo.discountType === "comp") {
    discountCents = subtotalCents;
  } else if (promo.discountType === "percent") {
    const pct = Math.min(100, Math.max(0, Number(promo.discountValue || 0)));
    discountCents = Math.round((subtotalCents * pct) / 100);
  } else if (promo.discountType === "fixed") {
    const fixedCents = Math.max(0, Math.round(Number(promo.discountValue || 0) * 100));
    discountCents = Math.min(subtotalCents, fixedCents);
  }

  const totalCents = Math.max(0, subtotalCents - discountCents);
  const effectiveUnitCents = Math.round(totalCents / qty);

  return {
    ok: true,
    subtotalCents,
    discountCents,
    totalCents,
    effectiveUnitCents,
  };
}

function escapeHtml(value: string): string {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildRehearsalReportEmailHtml(input: {
  orgName: string;
  productionTitle: string;
  reportDate: string;
  stageManagerName: string;
  presentCount: number;
  lateNames: string[];
  absentNames: string[];
  highlights: string;
  techCostumeNotes: string;
}): string {
  const lateList =
    input.lateNames.length > 0
      ? input.lateNames.map(escapeHtml).join(", ")
      : "None";
  const absentList =
    input.absentNames.length > 0
      ? input.absentNames.map(escapeHtml).join(", ")
      : "None";

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e4e4e7;border-radius:14px;color:#18181b;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#2563eb;">
      ${escapeHtml(input.orgName)} — Stage Management Report
    </p>
    <h2 style="margin:0 0 16px;font-size:22px;">${escapeHtml(input.productionTitle)} · ${escapeHtml(input.reportDate)}</h2>
    <div style="background:#f4f4f5;border-radius:10px;padding:14px 16px;margin-bottom:16px;font-size:14px;line-height:1.6;">
      <div><strong>Present:</strong> ${input.presentCount}</div>
      <div><strong>Late:</strong> ${lateList}</div>
      <div><strong>Absent:</strong> ${absentList}</div>
    </div>
    ${
      input.highlights.trim()
        ? `<h3 style="margin:16px 0 6px;font-size:13px;text-transform:uppercase;color:#52525b;">Rehearsal Highlights &amp; Run Notes</h3>
           <p style="margin:0 0 14px;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(input.highlights.trim())}</p>`
        : ""
    }
    ${
      input.techCostumeNotes.trim()
        ? `<h3 style="margin:16px 0 6px;font-size:13px;text-transform:uppercase;color:#52525b;">Costumes, Props &amp; Tech Follow-Ups</h3>
           <p style="margin:0 0 14px;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(input.techCostumeNotes.trim())}</p>`
        : ""
    }
    <p style="margin-top:20px;font-size:12px;color:#71717a;">Submitted by ${escapeHtml(input.stageManagerName)} via Open Backstage.</p>
  </div>`;
}
