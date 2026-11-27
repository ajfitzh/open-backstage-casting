// app/lib/db/phase4-repo.ts
// Phase 4 PostgreSQL repository:
// - Activity & Audit Log recording and querying
// - Custom Organization Branding (organizations.settings)
// - Super-Admin Onboarding Request Review & One-Click Org Provisioning

import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { OrganizationSettings } from "@/db/schema/core";
import { getOrganizationBySlugPg } from "./core-repo";
import {
  DEFAULT_STAFF_POSITIONS,
  parseCommitteeList,
  sanitizeHexColor,
  sanitizeProvisionSlug,
} from "../phase4-helpers";

export async function recordAuditLogPg(
  tenantSlug: string,
  input: {
    actorEmail: string;
    actorName?: string | null;
    action: string;
    entityType?: string | null;
    entityId?: string | number | null;
    details?: Record<string, unknown>;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [row] = await db
    .insert(schema.auditLogs)
    .values({
      organizationId: org.id,
      actorEmail: input.actorEmail.trim().toLowerCase(),
      actorName: input.actorName || null,
      action: input.action,
      entityType: input.entityType || null,
      entityId: input.entityId != null ? String(input.entityId) : null,
      details: input.details || {},
    })
    .returning();
  return row;
}

export async function listAuditLogsPg(tenantSlug: string, limit = 30) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return [];

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.auditLogs)
    .where(eq(schema.auditLogs.organizationId, org.id))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(Math.min(100, Math.max(1, limit)));

  return rows.map((r) => ({
    id: r.id,
    actorEmail: r.actorEmail,
    actorName: r.actorName || r.actorEmail,
    action: r.action,
    entityType: r.entityType || "",
    entityId: r.entityId || "",
    details: r.details || {},
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getOrganizationBrandingPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const s = (org.settings || {}) as OrganizationSettings;
  return {
    orgId: org.id,
    slug: org.slug,
    name: org.name,
    primaryColor: sanitizeHexColor(s.primaryColor),
    logoUrl: s.logoUrl || "",
    contactEmail: s.contactEmail || "",
    websiteUrl: s.websiteUrl || "",
    timezone: s.timezone || "America/New_York",
    waiverText: s.waiverText || "",
    committeeTemplates: parseCommitteeList(s.committeeTemplates),
  };
}

export async function updateOrganizationBrandingPg(
  tenantSlug: string,
  input: {
    primaryColor?: string;
    logoUrl?: string;
    contactEmail?: string;
    websiteUrl?: string;
    timezone?: string;
    waiverText?: string;
    committeeTemplates?: string[] | string;
  },
  actor: { email: string; name?: string | null }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const existing = (org.settings || {}) as OrganizationSettings;
  const nextSettings: OrganizationSettings = {
    ...existing,
    primaryColor: sanitizeHexColor(input.primaryColor ?? existing.primaryColor),
    logoUrl: (input.logoUrl ?? existing.logoUrl ?? "").trim(),
    contactEmail: (input.contactEmail ?? existing.contactEmail ?? "").trim(),
    websiteUrl: (input.websiteUrl ?? existing.websiteUrl ?? "").trim(),
    timezone: (input.timezone ?? existing.timezone ?? "America/New_York").trim(),
    waiverText: (input.waiverText ?? existing.waiverText ?? "").trim(),
    committeeTemplates: parseCommitteeList(input.committeeTemplates ?? existing.committeeTemplates),
  };

  const db = getDb();
  await db
    .update(schema.organizations)
    .set({ settings: nextSettings, updatedAt: new Date() })
    .where(eq(schema.organizations.id, org.id));

  await recordAuditLogPg(tenantSlug, {
    actorEmail: actor.email,
    actorName: actor.name,
    action: "branding_updated",
    entityType: "organization",
    entityId: org.id,
    details: { primaryColor: nextSettings.primaryColor, hasLogo: Boolean(nextSettings.logoUrl) },
  });

  return { success: true as const, settings: nextSettings };
}

export async function listOnboardingRequestsPg() {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.organizationOnboardingRequests)
    .orderBy(desc(schema.organizationOnboardingRequests.createdAt))
    .limit(50);

  return rows.map((r) => ({
    id: r.id,
    organizationName: r.organizationName,
    requestedSlug: r.requestedSlug,
    organizationType: r.organizationType || "Theater",
    contactName: r.contactName,
    contactEmail: r.contactEmail,
    notes: r.notes || "",
    status: r.status,
    createdOrganizationId: r.createdOrganizationId,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function approveOnboardingRequestPg(
  requestId: number,
  actor: { tenant: string; email: string; name?: string | null }
) {
  const db = getDb();
  const [reqRow] = await db
    .select()
    .from(schema.organizationOnboardingRequests)
    .where(eq(schema.organizationOnboardingRequests.id, requestId))
    .limit(1);

  if (!reqRow) return { success: false as const, error: "Onboarding request not found." };
  if (reqRow.status === "approved" && reqRow.createdOrganizationId) {
    return { success: false as const, error: "This organization has already been provisioned." };
  }

  const slug = sanitizeProvisionSlug(reqRow.requestedSlug || reqRow.organizationName);
  if (slug.length < 2) {
    return { success: false as const, error: "Invalid requested subdomain slug." };
  }

  const [existingSlug] = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, slug))
    .limit(1);

  if (existingSlug) {
    return { success: false as const, error: `Subdomain "${slug}" is already taken.` };
  }

  const [newOrg] = await db
    .insert(schema.organizations)
    .values({
      slug,
      name: reqRow.organizationName.trim(),
      organizationType: reqRow.organizationType || "Theater",
      plan: "starter",
      settings: {
        primaryColor: "#2563eb",
        contactEmail: reqRow.contactEmail.trim().toLowerCase(),
        timezone: "America/New_York",
      },
    })
    .returning();

  // Seed default staff positions
  await db.insert(schema.staffPositions).values(
    DEFAULT_STAFF_POSITIONS.map((roleName) => ({
      organizationId: newOrg.id,
      roleName,
    }))
  );

  // Create initial Admin user
  const nameParts = reqRow.contactName.trim().split(/\s+/);
  await db.insert(schema.people).values({
    organizationId: newOrg.id,
    firstName: nameParts[0] || reqRow.contactName,
    lastName: nameParts.slice(1).join(" "),
    fullName: reqRow.contactName.trim(),
    email: reqRow.contactEmail.trim().toLowerCase(),
    roles: ["Admin", "Director"],
  });

  await db
    .update(schema.organizationOnboardingRequests)
    .set({ status: "approved", createdOrganizationId: newOrg.id })
    .where(eq(schema.organizationOnboardingRequests.id, reqRow.id));

  await recordAuditLogPg(actor.tenant, {
    actorEmail: actor.email,
    actorName: actor.name,
    action: "org_provisioned",
    entityType: "organization",
    entityId: newOrg.id,
    details: { slug: newOrg.slug, name: newOrg.name, contactEmail: reqRow.contactEmail },
  });

  return {
    success: true as const,
    organization: { id: newOrg.id, slug: newOrg.slug, name: newOrg.name },
  };
}
