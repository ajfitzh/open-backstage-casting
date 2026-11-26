// app/lib/db/core-repo.ts
// Phase 1 PostgreSQL repository: Organizations, People, Auth, and Workspace Discovery.

import { and, asc, eq, ne, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatTenantDisplayName } from "@/app/lib/tenant-utils";
import {
  derivePrimaryAppRole,
  deriveWorkspaceDisplayRole,
} from "./role-helpers";

export { derivePrimaryAppRole, deriveWorkspaceDisplayRole };

export async function getOrganizationBySlugPg(slug: string) {
  const cleanSlug = (slug || "").trim().toLowerCase();
  if (!cleanSlug) return null;
  const db = getDb();
  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, cleanSlug))
    .limit(1);
  return org ?? null;
}

export async function listOrganizationsPg() {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.isHidden, false))
    .orderBy(asc(schema.organizations.name));

  return rows.map((org) => ({
    slug: org.slug,
    name: formatTenantDisplayName(org.slug, org.name),
    peopleTableId: null as string | number | null,
  }));
}

export async function findWorkspacesForEmailPg(email: string) {
  const cleanEmail = (email || "").trim().toLowerCase();
  const allOrgs = await listOrganizationsPg();

  if (!cleanEmail) {
    return { matched: [], otherTenants: allOrgs };
  }

  const db = getDb();
  const rows = await db
    .select({
      slug: schema.organizations.slug,
      orgName: schema.organizations.name,
      isHidden: schema.organizations.isHidden,
      fullName: schema.people.fullName,
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
      roles: schema.people.roles,
    })
    .from(schema.people)
    .innerJoin(
      schema.organizations,
      eq(schema.people.organizationId, schema.organizations.id)
    )
    .where(
      and(
        eq(schema.organizations.isHidden, false),
        or(
          eq(schema.people.email, cleanEmail),
          eq(schema.people.secondaryEmail, cleanEmail)
        )
      )
    );

  // Deduplicate by org slug in case a family has multiple rows with the same email
  const bySlug = new Map<
    string,
    { slug: string; name: string; role: string; userName: string }
  >();

  for (const row of rows) {
    const existing = bySlug.get(row.slug);
    const roles = Array.isArray(row.roles) ? row.roles : [];
    const role = deriveWorkspaceDisplayRole(roles);
    const userName =
      row.fullName?.trim() ||
      `${row.firstName || ""} ${row.lastName || ""}`.trim() ||
      cleanEmail;

    if (!existing || role === "Admin") {
      bySlug.set(row.slug, {
        slug: row.slug,
        name: formatTenantDisplayName(row.slug, row.orgName),
        role,
        userName,
      });
    }
  }

  const matched = Array.from(bySlug.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const otherTenants = allOrgs.filter((org) => !bySlug.has(org.slug));

  return { matched, otherTenants };
}

export async function findUserByEmailPg(tenantSlug: string, email: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return null;

  const db = getDb();
  const [person] = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, org.id),
        or(
          eq(schema.people.email, cleanEmail),
          eq(schema.people.secondaryEmail, cleanEmail)
        )
      )
    )
    .limit(1);

  if (!person) return null;

  return {
    id: (person.baserowId ?? person.id).toString(),
    name:
      person.fullName?.trim() ||
      `${person.firstName || ""} ${person.lastName || ""}`.trim() ||
      cleanEmail,
    email: cleanEmail,
    image: person.headshotUrl || null,
    role: derivePrimaryAppRole(person.roles || []),
    appPassword: person.passwordHash || null,
  };
}

function calculateAgeFromDob(dob: string | null): number {
  if (!dob) return 0;
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return 0;
  const diffMs = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
}

export async function getUserProfilePg(tenantSlug: string, email: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const cleanEmail = (email || "").trim().toLowerCase();
  const db = getDb();

  const [person] = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, org.id),
        or(
          eq(schema.people.email, cleanEmail),
          eq(schema.people.secondaryEmail, cleanEmail)
        )
      )
    )
    .limit(1);

  if (!person) return null;

  let familyMembers: Array<{
    id: number;
    name: string;
    role: string;
    age: number;
    image: string | null;
  }> = [];

  if (person.familyId) {
    const members = await db
      .select()
      .from(schema.people)
      .where(
        and(
          eq(schema.people.organizationId, org.id),
          eq(schema.people.familyId, person.familyId),
          ne(schema.people.id, person.id)
        )
      )
      .limit(20);

    familyMembers = members.map((m) => ({
      id: m.baserowId ?? m.id,
      name: m.fullName || `${m.firstName} ${m.lastName}`.trim() || "Member",
      role: m.roles?.[0] || "Student",
      age: calculateAgeFromDob(m.dateOfBirth),
      image: m.headshotUrl || null,
    }));
  }

  return {
    id: (person.baserowId ?? person.id).toString(),
    name: person.fullName || `${person.firstName} ${person.lastName}`.trim(),
    email: cleanEmail,
    phone: person.phone || "",
    address: [person.address, person.city].filter(Boolean).join(", "),
    role: person.roles?.[0] || "User",
    image: person.headshotUrl || null,
    familyMembers,
  };
}

export async function createGoogleUserPg(
  tenantSlug: string,
  googleUser: { name?: string | null; email?: string | null; image?: string | null }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org || !googleUser.email) return null;

  const cleanEmail = googleUser.email.trim().toLowerCase();
  const fullName = (googleUser.name || "Unknown User").trim();
  const parts = fullName.split(/\s+/);
  const firstName = parts[0] || "User";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";

  const db = getDb();
  const [created] = await db
    .insert(schema.people)
    .values({
      organizationId: org.id,
      firstName,
      lastName,
      fullName,
      email: cleanEmail,
      headshotUrl: googleUser.image || null,
      roles: ["Guest"],
    })
    .returning();

  return created;
}

export async function getPeoplePg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return [];

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.people)
    .where(eq(schema.people.organizationId, org.id))
    .orderBy(asc(schema.people.lastName), asc(schema.people.firstName));

  return rows.map((row) => ({
    id: row.baserowId ?? row.id,
    name: row.fullName || `${row.firstName} ${row.lastName}`.trim() || "Unnamed",
    headshot: row.headshotUrl || null,
    email: row.email || row.secondaryEmail || "",
    phone: row.phone || "",
    roles: row.roles || [],
  }));
}

export async function recordOnboardingRequestPg(input: {
  organizationName: string;
  requestedSlug: string;
  organizationType: string;
  contactName: string;
  contactEmail: string;
  notes?: string;
}) {
  const db = getDb();
  const [created] = await db
    .insert(schema.organizationOnboardingRequests)
    .values({
      organizationName: input.organizationName,
      requestedSlug: input.requestedSlug,
      organizationType: input.organizationType || "Theater",
      contactName: input.contactName,
      contactEmail: input.contactEmail.toLowerCase(),
      notes: input.notes || null,
      status: "pending",
    })
    .returning();
  return created;
}

const DEFAULT_STARTER_POSITIONS = [
  { roleName: "Director", department: "Creative" },
  { roleName: "Music Director", department: "Creative" },
  { roleName: "Choreographer", department: "Creative" },
  { roleName: "Stage Manager", department: "Production" },
  { roleName: "Production Coordinator", department: "Admin" },
];

export async function provisionOrganizationPg(input: {
  organizationName: string;
  slug: string;
  organizationType?: string;
  creatorEmail: string;
  creatorName: string;
  notes?: string;
}) {
  const db = getDb();
  const cleanSlug = input.slug.trim().toLowerCase();
  const cleanEmail = input.creatorEmail.trim().toLowerCase();
  const cleanName = input.creatorName.trim() || cleanEmail;

  const existing = await getOrganizationBySlugPg(cleanSlug);
  if (existing) {
    return {
      success: false as const,
      error: `The subdomain "${cleanSlug}.open-backstage.org" is already taken. Try a different subdomain.`,
    };
  }

  const [org] = await db
    .insert(schema.organizations)
    .values({
      slug: cleanSlug,
      name: input.organizationName.trim(),
      organizationType: input.organizationType || "Theater",
      plan: "starter",
      isHidden: false,
      settings: { contactEmail: cleanEmail },
    })
    .returning();

  const nameParts = cleanName.split(/\s+/);
  const firstName = nameParts[0] || "Admin";
  const lastName = nameParts.slice(1).join(" ");

  const currentYear = new Date().getFullYear();

  await Promise.all([
    db.insert(schema.people).values({
      organizationId: org.id,
      firstName,
      lastName,
      fullName: cleanName,
      email: cleanEmail,
      roles: ["Admin"],
    }),
    db.insert(schema.staffPositions).values(
      DEFAULT_STARTER_POSITIONS.map((p) => ({
        organizationId: org.id,
        roleName: p.roleName,
        department: p.department,
      }))
    ),
    db.insert(schema.seasons).values({
      organizationId: org.id,
      name: `${currentYear}–${currentYear + 1} Season`,
      startDate: `${currentYear}-09-01`,
      endDate: `${currentYear + 1}-06-30`,
      status: "Active",
    }),
    db.insert(schema.organizationOnboardingRequests).values({
      organizationName: org.name,
      requestedSlug: org.slug,
      organizationType: org.organizationType || "Theater",
      contactName: cleanName,
      contactEmail: cleanEmail,
      notes: input.notes || null,
      status: "provisioned",
      createdOrganizationId: org.id,
    }),
  ]);

  return {
    success: true as const,
    organization: org,
  };
}
