// Pure helpers for Admin Self-Service CRUD (Node ESM unit-test friendly: no @/ aliases)

export const VALID_AUDITION_STATUSES = [
  "Pending",
  "Called Back",
  "Cast",
  "Not Cast",
  "Dropped",
] as const;

export type AuditionStatus = (typeof VALID_AUDITION_STATUSES)[number];

export const VALID_FEE_STATUSES = [
  "Unpaid",
  "Paid (Stripe)",
  "Paid (Cash)",
  "Paid (Check)",
  "Scholarship / Waived",
] as const;

export type FeeStatus = (typeof VALID_FEE_STATUSES)[number];

export const VALID_EVENT_TYPES = [
  "Rehearsal",
  "Tech",
  "Dress Rehearsal",
  "Performance",
  "Audition",
  "Callback",
  "Parent Meeting",
  "Strike",
] as const;

export const VALID_CONFLICT_TYPES = [
  "Absent",
  "Late",
  "Leave Early",
] as const;

export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  const cleaned = (fullName || "").trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return { firstName: "", lastName: "", fullName: "" };
  }
  const parts = cleaned.split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "", fullName: parts[0] };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
    fullName: cleaned,
  };
}

export function normalizeAuditionStatus(raw: string | null | undefined): AuditionStatus {
  const val = (raw || "").trim().toLowerCase();
  if (val === "cast") return "Cast";
  if (val === "called back" || val === "callback") return "Called Back";
  if (val === "not cast") return "Not Cast";
  if (val === "dropped" || val === "withdrawn") return "Dropped";
  return "Pending";
}

export function derivePaidBoolean(
  feeStatus: string | null | undefined,
  explicitPaid?: boolean
): boolean {
  if (typeof explicitPaid === "boolean") return explicitPaid;
  const val = (feeStatus || "").trim().toLowerCase();
  return val.startsWith("paid") || val.includes("waived") || val.includes("scholarship");
}

export function normalizeFeeStatus(
  paidFees: boolean,
  productionFeeStatus?: string | null
): string {
  const cleaned = (productionFeeStatus || "").trim();
  if (cleaned) return cleaned;
  return paidFees ? "Paid (Manual Override)" : "Unpaid";
}

export function validateEmailOptional(email: string | null | undefined): string | null {
  const trimmed = (email || "").trim().toLowerCase();
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error(`Invalid email address: "${email}"`);
  }
  return trimmed;
}

export function computeNextAuditionNumber(existingNumbers: (string | null | undefined)[]): string {
  let maxNum = 0;
  for (const raw of existingNumbers) {
    const parsed = parseInt(String(raw || "").replace(/[^0-9]/g, ""), 10);
    if (Number.isFinite(parsed) && parsed > maxNum) {
      maxNum = parsed;
    }
  }
  return String(maxNum + 1);
}

export function sanitizeRolesList(roles: string[], allowedSet: Set<string>): string[] {
  const deduped = new Set<string>();
  for (const r of roles || []) {
    const trimmed = String(r || "").trim();
    if (trimmed && allowedSet.has(trimmed)) {
      deduped.add(trimmed);
    }
  }
  return Array.from(deduped);
}
