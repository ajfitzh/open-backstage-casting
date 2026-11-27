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

function scoreEmailAccountCandidate(person: typeof schema.people.$inferSelect): number {
  const primary = derivePrimaryAppRole(person.roles || []);
  let score = 0;
  if (primary === "Admin") score += 1000;
  else if (primary === "Staff") score += 500;
  else if (primary === "Volunteer") score += 300;
  else if (primary === "Parent/Guardian") score += 200;
  else if (primary !== "Guest") score += 100;
  if (person.passwordHash) score += 50;
  return score;
}

async function findBestPersonByEmail(orgId: number, cleanEmail: string) {
  const db = getDb();
  const candidates = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, orgId),
        or(
          eq(schema.people.email, cleanEmail),
          eq(schema.people.secondaryEmail, cleanEmail)
        )
      )
    )
    .limit(25);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const diff = scoreEmailAccountCandidate(b) - scoreEmailAccountCandidate(a);
    return diff !== 0 ? diff : a.id - b.id;
  });
  return candidates[0];
}

export async function findUserByEmailPg(tenantSlug: string, email: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return null;

  const person = await findBestPersonByEmail(org.id, cleanEmail);
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

  const person = await findBestPersonByEmail(org.id, cleanEmail);
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

export async function findUserByEmailClientPg(tenantSlug: string, email: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return null;

  const person = await findBestPersonByEmail(org.id, cleanEmail);
  if (!person) return null;
  const roles = Array.isArray(person.roles) && person.roles.length > 0 ? person.roles : ["Guest"];
  const primaryRole = roles.includes("Admin")
    ? "Admin"
    : roles.includes("Executive Director")
      ? "Executive Director"
      : roles.includes("Education Coordinator")
        ? "Education Coordinator"
        : roles[0] || "Guest";

  return {
    id: String(person.baserowId ?? person.id),
    name:
      person.fullName?.trim() ||
      `${person.firstName || ""} ${person.lastName || ""}`.trim() ||
      cleanEmail,
    email: person.email || person.secondaryEmail || cleanEmail,
    phone: person.phone || null,
    address: `${person.address || ""}, ${person.city || ""}`.replace(/^, |, $/g, ""),
    role: primaryRole,
    tags: roles,
    image: person.headshotUrl || null,
    familyId: person.familyId ?? null,
    appPassword: person.passwordHash || null,
  };
}

export async function setAccountPasswordPg(
  tenantSlug: string,
  email: string,
  hashedPassword: string,
  upgradeToUser = false
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return { success: false as const, error: "Account not found." };

  const db = getDb();
  const [person] = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, org.id),
        or(eq(schema.people.email, cleanEmail), eq(schema.people.secondaryEmail, cleanEmail))
      )
    )
    .limit(1);

  if (!person) return { success: false as const, error: "Account not found." };

  const currentRoles = Array.isArray(person.roles) ? person.roles : [];
  const nextRoles = upgradeToUser
    ? Array.from(new Set([...currentRoles.filter((r) => r !== "Guest"), "User"]))
    : currentRoles;

  await db
    .update(schema.people)
    .set({
      passwordHash: hashedPassword,
      ...(upgradeToUser ? { roles: nextRoles } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.people.id, person.id));

  return { success: true as const };
}

export async function registerUserPg(
  tenantSlug: string,
  data: { firstName: string; lastName: string; email: string; hashedPassword: string }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const cleanEmail = (data.email || "").trim().toLowerCase();
  if (!cleanEmail) return { success: false as const, error: "Email is required." };

  const db = getDb();
  const [existing] = await db
    .select({ id: schema.people.id })
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, org.id),
        or(eq(schema.people.email, cleanEmail), eq(schema.people.secondaryEmail, cleanEmail))
      )
    )
    .limit(1);

  if (existing) {
    return { success: false as const, error: "An account with this email already exists." };
  }

  await db.insert(schema.people).values({
    organizationId: org.id,
    firstName: (data.firstName || "").trim() || "Member",
    lastName: (data.lastName || "").trim(),
    fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim() || cleanEmail,
    email: cleanEmail,
    roles: ["User"],
    passwordHash: data.hashedPassword,
  });

  return { success: true as const };
}

export interface OrganizationBillingSummary {
  slug: string;
  name: string;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
}

export async function getOrganizationBillingPg(
  tenantSlug: string
): Promise<OrganizationBillingSummary | null> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const settings = (org.settings || {}) as Record<string, any>;
  return {
    slug: org.slug,
    name: formatTenantDisplayName(org.slug, org.name),
    plan: org.plan || "starter",
    stripeCustomerId: typeof settings.stripeCustomerId === "string" ? settings.stripeCustomerId : null,
    stripeSubscriptionId:
      typeof settings.stripeSubscriptionId === "string" ? settings.stripeSubscriptionId : null,
    subscriptionStatus:
      typeof settings.subscriptionStatus === "string" ? settings.subscriptionStatus : null,
    currentPeriodEnd:
      typeof settings.currentPeriodEnd === "string" ? settings.currentPeriodEnd : null,
  };
}

export async function updateOrganizationBillingPg(
  tenantSlug: string,
  patch: {
    plan?: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    subscriptionStatus?: string | null;
    currentPeriodEnd?: string | null;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const currentSettings = (org.settings || {}) as Record<string, any>;
  const nextSettings: Record<string, any> = {
    ...currentSettings,
    ...(patch.stripeCustomerId !== undefined ? { stripeCustomerId: patch.stripeCustomerId } : {}),
    ...(patch.stripeSubscriptionId !== undefined
      ? { stripeSubscriptionId: patch.stripeSubscriptionId }
      : {}),
    ...(patch.subscriptionStatus !== undefined
      ? { subscriptionStatus: patch.subscriptionStatus }
      : {}),
    ...(patch.currentPeriodEnd !== undefined ? { currentPeriodEnd: patch.currentPeriodEnd } : {}),
  };

  const db = getDb();
  const [updated] = await db
    .update(schema.organizations)
    .set({
      ...(patch.plan !== undefined ? { plan: patch.plan } : {}),
      settings: nextSettings,
      updatedAt: new Date(),
    })
    .where(eq(schema.organizations.id, org.id))
    .returning();

  return { success: true as const, organization: updated };
}
