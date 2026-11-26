// app/lib/db/role-helpers.ts
// Pure role derivation helpers shared by Postgres repositories and unit tests.

export function derivePrimaryAppRole(tags: string[]): string {
  if (
    tags.includes("Admin") ||
    tags.includes("Executive Director") ||
    tags.includes("Business Manager")
  ) {
    return "Admin";
  }
  if (
    tags.includes("Director") ||
    tags.includes("Staff") ||
    tags.includes("Production Coordinator") ||
    tags.includes("Education Coordinator")
  ) {
    return "Staff";
  }
  if (tags.includes("Check In Team") || tags.includes("Committee Team")) {
    return "Volunteer";
  }
  if (tags.includes("Parent/Guardian")) {
    return "Parent/Guardian";
  }
  return tags[0] || "Student";
}

export function deriveWorkspaceDisplayRole(tags: string[]): string {
  if (tags.includes("Admin")) return "Admin";
  if (tags.includes("Executive Director")) return "Executive Director";
  return tags[0] || "Member";
}

const RESERVED_ORG_SLUGS = new Set([
  "www",
  "home",
  "login",
  "signup",
  "api",
  "admin",
  "app",
  "auth",
  "db",
  "mail",
  "sandbox",
  "e2e",
  "test",
  "marketing",
  "privacy",
  "terms",
  "workspaces",
  "billing",
  "support",
]);

export function normalizeAndValidateOrgSlug(
  desiredSlug: string | undefined,
  organizationName: string
): { valid: true; slug: string } | { valid: false; error: string } {
  const raw = (desiredSlug?.trim() || organizationName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  if (raw.length < 3) {
    return {
      valid: false,
      error: "Subdomain must be at least 3 letters or numbers (e.g., riverside-drama).",
    };
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(raw)) {
    return {
      valid: false,
      error: "Subdomain may only contain lowercase letters, numbers, and hyphens.",
    };
  }
  if (RESERVED_ORG_SLUGS.has(raw)) {
    return {
      valid: false,
      error: `"${raw}" is a reserved subdomain. Please pick another slug.`,
    };
  }
  return { valid: true, slug: raw };
}

export function pickUniqueAuditionNumber(existingNumbers: Set<number>): number {
  const primaryAvailable: number[] = [];
  for (let i = 1; i <= 50; i++) {
    if (!existingNumbers.has(i)) primaryAvailable.push(i);
  }
  if (primaryAvailable.length > 0) {
    return primaryAvailable[Math.floor(Math.random() * primaryAvailable.length)];
  }
  for (let i = 51; i <= 500; i++) {
    if (!existingNumbers.has(i)) return i;
  }
  return existingNumbers.size + 1;
}

export function formatHeightFromInches(totalInches: number | null): string {
  if (!totalInches || totalInches <= 0) return "";
  const ft = Math.floor(totalInches / 12);
  const inch = totalInches % 12;
  return `${ft}'${inch}"`;
}

export function computeAgeFromDob(dob: string | null): number {
  if (!dob) return 0;
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return 0;
  const diffMs = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
}

export function formatAgeRangeHelper(
  minAge: number | null | undefined,
  maxAge: number | null | undefined
): string {
  const min = Number(minAge || 0);
  const max = Number(maxAge || 0);
  if (!min && (!max || max >= 99)) return "All Ages";
  if (min && (!max || max >= 99)) return `${min}+`;
  if (!min && max) return `Up to ${max}`;
  return `${min} - ${max}`;
}

export function formatDecimalHoursToHHMM(decimal: number): string {
  const h = Math.floor(decimal);
  const m = Math.round((decimal % 1) * 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function generateGarmentSku(
  category: string | null | undefined,
  existingSkus: Iterable<string> = []
): string {
  const cleanCat = (category || "COS")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 4) || "COS";
  const prefix = `OB-${cleanCat}-`;
  const existing = new Set(Array.from(existingSkus, (s) => s.trim().toUpperCase()));
  for (let i = 1; i <= 9999; i++) {
    const candidate = `${prefix}${String(i).padStart(3, "0")}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${prefix}${Date.now().toString().slice(-4)}`;
}

export function buildGarmentQrPayload(tenantSlug: string, sku: string): string {
  const cleanTenant = (tenantSlug || "org").trim().toLowerCase();
  const cleanSku = (sku || "").trim().toUpperCase();
  return `openbackstage://${cleanTenant}/garment/${encodeURIComponent(cleanSku)}`;
}

export interface GarmentFitMeasurements {
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  inseam?: number | null;
}

export function evaluateGarmentFit(
  garment: GarmentFitMeasurements,
  actor: GarmentFitMeasurements
): {
  status: "Great Fit" | "Alterable" | "Too Small" | "Unmeasured";
  deltaSummary: string;
} {
  const checks: { label: string; diff: number }[] = [];
  if (garment.chest && actor.chest) checks.push({ label: "Chest", diff: garment.chest - actor.chest });
  if (garment.waist && actor.waist) checks.push({ label: "Waist", diff: garment.waist - actor.waist });
  if (garment.hips && actor.hips) checks.push({ label: "Hips", diff: garment.hips - actor.hips });
  if (garment.inseam && actor.inseam) checks.push({ label: "Inseam", diff: garment.inseam - actor.inseam });

  if (checks.length === 0) {
    return { status: "Unmeasured", deltaSummary: "Add measurements to check fit" };
  }

  const tooSmall = checks.some((c) => c.diff < -1);
  if (tooSmall) {
    const tight = checks.filter((c) => c.diff < -1).map((c) => `${c.label} ${c.diff > 0 ? "+" : ""}${c.diff.toFixed(1)}"`);
    return { status: "Too Small", deltaSummary: tight.join(", ") };
  }

  const needsAlteration = checks.some((c) => c.diff > 3 || c.diff < 0);
  if (needsAlteration) {
    const notes = checks.map((c) => `${c.label} ${c.diff >= 0 ? "+" : ""}${c.diff.toFixed(1)}"`);
    return { status: "Alterable", deltaSummary: notes.join(", ") };
  }

  return {
    status: "Great Fit",
    deltaSummary: checks.map((c) => `${c.label} ${c.diff >= 0 ? "+" : ""}${c.diff.toFixed(1)}"`).join(", "),
  };
}

function normalizeTitleTokens(raw: string): string[] {
  const stopWords = new Set(["the", "a", "an", "and", "of", "in", "on", "to", "jr", "kids", "cyt", "show", "poster", "logo", "art"]);
  return raw
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((tok) => tok.length > 0 && !stopWords.has(tok));
}

export function matchShowImageKeyToProduction<T extends { id: number; title: string }>(
  objectKey: string,
  productions: T[]
): T | null {
  const filename = (objectKey.split("/").pop() || objectKey).trim();
  const fileTokens = normalizeTitleTokens(filename);
  if (fileTokens.length === 0) return null;

  const fileYear = filename.match(/\b(19|20)\d{2}\b/)?.[0] || null;
  const fileTokenSet = new Set(fileTokens);

  let best: { prod: T; score: number } | null = null;

  for (const prod of productions) {
    const titleTokens = normalizeTitleTokens(prod.title);
    if (titleTokens.length === 0) continue;

    const prodYear = prod.title.match(/\b(19|20)\d{2}\b/)?.[0] || null;
    if (fileYear && prodYear && fileYear !== prodYear) continue;

    const nonYearTitleTokens = titleTokens.filter((t) => !/^(19|20)\d{2}$/.test(t));
    if (nonYearTitleTokens.length === 0) continue;

    const matchedCount = nonYearTitleTokens.filter((t) => fileTokenSet.has(t)).length;
    const coverage = matchedCount / nonYearTitleTokens.length;
    if (coverage < 0.75) continue;

    let score = coverage * 100 + matchedCount * 10;
    if (fileYear && prodYear && fileYear === prodYear) score += 40;
    if (matchedCount === nonYearTitleTokens.length) score += 20;

    if (!best || score > best.score) {
      best = { prod, score };
    }
  }

  return best?.prod ?? null;
}
