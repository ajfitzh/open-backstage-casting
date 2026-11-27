// app/lib/phase1-helpers.ts
// Pure Node-ESM-compatible helpers for Phase 1 Launch Readiness:
// - Password reset / invite token generation & SHA-256 hashing
// - Standardized Audition Slot Generator
// - Signed HMAC tokens for /api/calendar feeds
// - Cast & Callback notification recipient grouping

import crypto from "node:crypto";
export {
  generateAuditionSlotsPlan,
  type GeneratedAuditionSlot,
} from "./audition-slot-planner.ts";

export function generateRawResetToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

export function validateNewPassword(password: string): { ok: true } | { ok: false; error: string } {
  const clean = (password || "").trim();
  if (clean.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters long." };
  }
  if (clean.length > 128) {
    return { ok: false, error: "Password is too long." };
  }
  return { ok: true };
}

function getCalendarSigningSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "open-backstage-dev-calendar-secret"
  );
}

export function signCalendarToken(params: {
  tenant: string;
  productionId: number;
  studentId?: number | null;
}): string {
  const payload = `${params.tenant.trim().toLowerCase()}:${params.productionId}:${params.studentId || 0}`;
  return crypto
    .createHmac("sha256", getCalendarSigningSecret())
    .update(payload)
    .digest("base64url")
    .slice(0, 24);
}

export function verifyCalendarToken(
  token: string | null | undefined,
  params: { tenant: string; productionId: number; studentId?: number | null }
): boolean {
  if (!token || typeof token !== "string") return false;
  const expected = signCalendarToken(params);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface CastNotificationCandidate {
  auditionId: number;
  personId: number;
  studentName: string;
  email: string;
  isCalledBack: boolean;
  callbackGroup: string;
  assignedRoles: string[];
}

export function buildCastNotificationPlan(candidates: CastNotificationCandidate[]) {
  const castOffers: CastNotificationCandidate[] = [];
  const notCast: CastNotificationCandidate[] = [];
  const callbacks: CastNotificationCandidate[] = [];

  for (const c of candidates) {
    const cleanEmail = (c.email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) continue;
    const normalized = { ...c, email: cleanEmail };

    if (normalized.isCalledBack) callbacks.push(normalized);
    if (normalized.assignedRoles.length > 0) castOffers.push(normalized);
    else notCast.push(normalized);
  }

  return { castOffers, notCast, callbacks };
}
