// app/lib/phase4-helpers.ts
// Pure, browser-safe & Node-ESM-compatible helpers for Phase 4:
// - Tenant slug sanitization for self-serve onboarding provisioning
// - Organization branding validation & defaults
// - Audit log action formatting

export const DEFAULT_STAFF_POSITIONS = [
  "Director",
  "Music Director",
  "Choreographer",
  "Stage Manager",
  "Producer",
  "Costumer",
] as const;

export const DEFAULT_COMMITTEE_TEMPLATES = [
  "Costumes",
  "Props & Set",
  "Backstage & Hospitality",
  "Tickets & Lobby",
  "Hair & Makeup",
  "Tech & Load-Out",
] as const;

export function sanitizeProvisionSlug(raw: string): string {
  return (raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function sanitizeHexColor(raw: string | null | undefined, fallback = "#2563eb"): string {
  const clean = (raw || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean.toLowerCase();
  return fallback;
}

export function parseCommitteeList(raw: string | string[] | null | undefined): string[] {
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean).slice(0, 20);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  return [...DEFAULT_COMMITTEE_TEMPLATES];
}

export function formatAuditActionLabel(action: string): string {
  return (action || "activity")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
