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
