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
