// app/lib/db/productions-repo.ts
// Phase 2A PostgreSQL repository: Productions, Seasons, Venues, Creative Team, and Admin Writes.

import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getOrganizationBySlugPg } from "./core-repo";

function extId(row: { id: number; baserowId: number | null }): number {
  return row.baserowId ?? row.id;
}

async function resolveProductionRow(orgId: number, externalProdId: number) {
  const db = getDb();
  const [prod] = await db
    .select()
    .from(schema.productions)
    .where(
      and(
        eq(schema.productions.organizationId, orgId),
        or(
          eq(schema.productions.baserowId, externalProdId),
          eq(schema.productions.id, externalProdId)
        )
      )
    )
    .limit(1);
  return prod ?? null;
}

async function resolvePersonRow(orgId: number, externalPersonId: number) {
  const db = getDb();
  const [person] = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, orgId),
        or(
          eq(schema.people.baserowId, externalPersonId),
          eq(schema.people.id, externalPersonId)
        )
      )
    )
    .limit(1);
  return person ?? null;
}

async function resolveSeasonRow(orgId: number, externalSeasonId: number) {
  const db = getDb();
  const [season] = await db
    .select()
    .from(schema.seasons)
    .where(
      and(
        eq(schema.seasons.organizationId, orgId),
        or(
          eq(schema.seasons.baserowId, externalSeasonId),
          eq(schema.seasons.id, externalSeasonId)
        )
      )
    )
    .limit(1);
  return season ?? null;
}

async function resolveMasterShowRow(orgId: number, externalShowId: number) {
  const db = getDb();
  const [show] = await db
    .select()
    .from(schema.masterShows)
    .where(
      and(
        eq(schema.masterShows.organizationId, orgId),
        or(
          eq(schema.masterShows.baserowId, externalShowId),
          eq(schema.masterShows.id, externalShowId)
        )
      )
    )
    .limit(1);
  return show ?? null;
}

async function resolvePositionRow(orgId: number, externalPosId: number) {
  const db = getDb();
  const [pos] = await db
    .select()
    .from(schema.staffPositions)
    .where(
      and(
        eq(schema.staffPositions.organizationId, orgId),
        or(
          eq(schema.staffPositions.baserowId, externalPosId),
          eq(schema.staffPositions.id, externalPosId)
        )
      )
    )
    .limit(1);
  return pos ?? null;
}

function mapPgShow(row: {
  prod: typeof schema.productions.$inferSelect;
  seasonName: string | null;
  venueName: string | null;
}) {
  const status = row.prod.status || "Archived";
  return {
    id: extId(row.prod),
    title: row.prod.title || "Untitled Show",
    season: row.seasonName || row.prod.sessionLabel || "Unknown Season",
    status,
    type: row.prod.type || "Other",
    isActive: status === "Active",
    image: row.prod.showImageUrl || null,
    productionSession: row.prod.sessionLabel || "",
    branch: row.prod.location || "General",
    location: row.prod.location || "General",
    venue: row.venueName || "TBD",
    productionFee: Number(row.prod.productionFee ?? 0) || 0,
    workflowOverrides: row.prod.workflowOverrides || [],
    Performances: row.prod.legacyPerformancesJson || null,
  };
}

// ==============================================================================
// READS
// ==============================================================================

export async function getAllShowsPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const rows = await db
    .select({
      prod: schema.productions,
      seasonName: schema.seasons.name,
      venueName: schema.venues.name,
    })
    .from(schema.productions)
    .leftJoin(schema.seasons, eq(schema.productions.seasonId, schema.seasons.id))
    .leftJoin(schema.venues, eq(schema.productions.venueId, schema.venues.id))
    .where(eq(schema.productions.organizationId, org.id))
    .orderBy(desc(sql`COALESCE(${schema.productions.baserowId}, ${schema.productions.id})`));

  return rows.map(mapPgShow);
}

export async function getShowByIdPg(tenantSlug: string, id: string | number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const db = getDb();
  const [row] = await db
    .select({
      prod: schema.productions,
      seasonName: schema.seasons.name,
      venueName: schema.venues.name,
    })
    .from(schema.productions)
    .leftJoin(schema.seasons, eq(schema.productions.seasonId, schema.seasons.id))
    .leftJoin(schema.venues, eq(schema.productions.venueId, schema.venues.id))
    .where(
      and(
        eq(schema.productions.organizationId, org.id),
        or(
          eq(schema.productions.baserowId, numericId),
          eq(schema.productions.id, numericId)
        )
      )
    )
    .limit(1);

  return row ? mapPgShow(row) : null;
}

export async function getActiveProductionPg(tenantSlug: string) {
  const shows = await getAllShowsPg(tenantSlug);
  if (!shows || shows.length === 0) return null;

  const current = shows.find(
    (s) => s.status === "Upcoming" || s.status === "Active" || s.isActive
  );
  return current ?? shows[0];
}

export async function getAuditionProductionPg(tenantSlug: string) {
  const shows = await getAllShowsPg(tenantSlug);
  if (!shows || shows.length === 0) return null;
  return shows.find((s) => s.status === "Upcoming") ?? null;
}

export async function getSeasonsPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [seasonRows, prodCounts] = await Promise.all([
    db
      .select()
      .from(schema.seasons)
      .where(eq(schema.seasons.organizationId, org.id)),
    db
      .select({
        seasonId: schema.productions.seasonId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.productions)
      .where(eq(schema.productions.organizationId, org.id))
      .groupBy(schema.productions.seasonId),
  ]);

  const countMap = new Map<number, number>();
  for (const pc of prodCounts) {
    if (pc.seasonId !== null) countMap.set(pc.seasonId, pc.count);
  }

  return seasonRows
    .map((s) => ({
      id: extId(s),
      name: s.name || "Unnamed Season",
      startDate: s.startDate || "",
      endDate: s.endDate || "",
      status: s.status || "Planning",
      productionCount: countMap.get(s.id) ?? 0,
    }))
    .sort((a, b) => {
      const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return timeB - timeA;
    });
}

export async function getMasterShowsPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.masterShows)
    .where(eq(schema.masterShows.organizationId, org.id))
    .orderBy(asc(schema.masterShows.title));

  return rows.map((row) => ({
    id: extId(row),
    title: row.title || "Untitled Show",
  }));
}

export async function getStaffPositionsPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.staffPositions)
    .where(eq(schema.staffPositions.organizationId, org.id))
    .orderBy(asc(schema.staffPositions.roleName));

  return rows.map((row) => ({
    id: extId(row),
    name: row.roleName || "Position",
    department: row.department || "General",
  }));
}

export async function getVenuesPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [venueRows, prodCounts] = await Promise.all([
    db
      .select()
      .from(schema.venues)
      .where(eq(schema.venues.organizationId, org.id))
      .orderBy(asc(schema.venues.name)),
    db
      .select({
        venueId: schema.productions.venueId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.productions)
      .where(eq(schema.productions.organizationId, org.id))
      .groupBy(schema.productions.venueId),
  ]);

  const countMap = new Map<number, number>();
  for (const pc of prodCounts) {
    if (pc.venueId !== null) countMap.set(pc.venueId, pc.count);
  }

  return venueRows.map((v) => ({
    id: extId(v),
    name: v.name || "Unknown Venue",
    capacity: v.seatingCapacity ?? 0,
    marketingName: v.marketingName || null,
    type: v.type || "Hybrid",
    historicalShows: countMap.get(v.id) ?? 0,
  }));
}

export async function getCreativeTeamPg(tenantSlug: string, productionId?: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  let internalProdId: number | null = null;
  if (productionId) {
    const prod = await resolveProductionRow(org.id, productionId);
    if (!prod) return [];
    internalProdId = prod.id;
  }

  const rows = await db
    .select({
      team: schema.showTeam,
      personId: schema.people.id,
      personBaserowId: schema.people.baserowId,
      personName: schema.people.fullName,
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
      email: schema.people.email,
      phone: schema.people.phone,
      headshotUrl: schema.people.headshotUrl,
      positionId: schema.staffPositions.id,
      positionBaserowId: schema.staffPositions.baserowId,
      positionName: schema.staffPositions.roleName,
    })
    .from(schema.showTeam)
    .leftJoin(schema.people, eq(schema.showTeam.personId, schema.people.id))
    .leftJoin(schema.staffPositions, eq(schema.showTeam.positionId, schema.staffPositions.id))
    .where(
      internalProdId !== null
        ? and(
            eq(schema.showTeam.organizationId, org.id),
            eq(schema.showTeam.productionId, internalProdId)
          )
        : eq(schema.showTeam.organizationId, org.id)
    );

  return rows
    .map((row) => {
      const name =
        row.personName?.trim() ||
        `${row.firstName || ""} ${row.lastName || ""}`.trim();
      if (!name) return null;
      const role = row.positionName || "Volunteer";
      return {
        id: extId(row.team),
        personId: row.personId ? (row.personBaserowId ?? row.personId) : null,
        positionId: row.positionId ? (row.positionBaserowId ?? row.positionId) : null,
        name,
        role,
        email: row.email || "",
        phone: row.phone || "",
        headshot: row.headshotUrl || null,
        initials: name
          .split(/\s+/)
          .map((n) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase(),
        color: role.toLowerCase().includes("director") ? "bg-blue-600" : "bg-zinc-600",
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export async function getUserProductionRolePg(
  tenantSlug: string,
  userId: number,
  productionId: number
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const [person, prod] = await Promise.all([
    resolvePersonRow(org.id, userId),
    resolveProductionRow(org.id, productionId),
  ]);
  if (!person || !prod) return null;

  const db = getDb();
  const [row] = await db
    .select({ roleName: schema.staffPositions.roleName })
    .from(schema.showTeam)
    .leftJoin(schema.staffPositions, eq(schema.showTeam.positionId, schema.staffPositions.id))
    .where(
      and(
        eq(schema.showTeam.organizationId, org.id),
        eq(schema.showTeam.personId, person.id),
        eq(schema.showTeam.productionId, prod.id)
      )
    )
    .limit(1);

  return row?.roleName ?? null;
}

// ==============================================================================
// ADMIN & SHOW LAUNCH WRITES
// ==============================================================================

export async function updatePersonProfilePg(
  tenantSlug: string,
  email: string,
  data: {
    fullName?: string;
    phone?: string;
    address?: string;
    city?: string;
    headshotUrl?: string;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false, error: "Organization not found." };

  const cleanEmail = email.trim().toLowerCase();
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

  if (!person) return { success: false, error: "Could not locate your profile record." };

  const updates: Partial<typeof schema.people.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (typeof data.fullName === "string" && data.fullName.trim()) {
    const clean = data.fullName.trim();
    const parts = clean.split(/\s+/);
    updates.firstName = parts[0];
    updates.lastName = parts.slice(1).join(" ");
    updates.fullName = clean;
  }
  if (typeof data.phone === "string") updates.phone = data.phone.trim();
  if (typeof data.address === "string") updates.address = data.address.trim();
  if (typeof data.city === "string") updates.city = data.city.trim();
  if (typeof data.headshotUrl === "string" && data.headshotUrl.startsWith("https://")) {
    updates.headshotUrl = data.headshotUrl;
  }

  await db.update(schema.people).set(updates).where(eq(schema.people.id, person.id));
  return { success: true };
}

export async function updatePersonRolesPg(
  tenantSlug: string,
  personId: number,
  roles: string[]
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false, error: "Organization not found." };

  const person = await resolvePersonRow(org.id, personId);
  if (!person) return { success: false, error: "Person not found." };

  const db = getDb();
  await db
    .update(schema.people)
    .set({ roles, updatedAt: new Date() })
    .where(eq(schema.people.id, person.id));

  return { success: true, roles };
}

export async function setProductionStatusPg(
  tenantSlug: string,
  productionId: number,
  status: string
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false, error: "Organization not found." };

  const prod = await resolveProductionRow(org.id, productionId);
  if (!prod) return { success: false, error: "Production not found." };

  const db = getDb();
  await db
    .update(schema.productions)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.productions.id, prod.id));

  return { success: true };
}

export async function createProductionPg(
  tenantSlug: string,
  data: {
    title: string;
    status: string;
    location?: string;
    productionFee: number;
    seasonId?: number | null;
    masterShowId?: number | null;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const [season, masterShow] = await Promise.all([
    data.seasonId ? resolveSeasonRow(org.id, data.seasonId) : Promise.resolve(null),
    data.masterShowId ? resolveMasterShowRow(org.id, data.masterShowId) : Promise.resolve(null),
  ]);

  const db = getDb();
  const [created] = await db
    .insert(schema.productions)
    .values({
      organizationId: org.id,
      title: data.title,
      status: data.status,
      location: data.location?.trim() || "General",
      productionFee: data.productionFee,
      seasonId: season?.id ?? null,
      masterShowId: masterShow?.id ?? null,
    })
    .returning();

  return {
    success: true as const,
    production: {
      id: extId(created),
      title: created.title,
      status: created.status || data.status,
      location: created.location || "General",
      productionFee: Number(created.productionFee ?? 0),
    },
  };
}

export async function createAuditionSlotPg(
  tenantSlug: string,
  productionId: number,
  data: { timeLabel: string; dateTime?: string; capacity: number }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const prod = await resolveProductionRow(org.id, productionId);
  if (!prod) return { success: false as const, error: "Production not found." };

  const db = getDb();
  const [created] = await db
    .insert(schema.auditionSlots)
    .values({
      organizationId: org.id,
      productionId: prod.id,
      timeLabel: data.timeLabel,
      dateTime: data.dateTime?.trim() || null,
      capacity: data.capacity,
    })
    .returning();

  return {
    success: true as const,
    slot: {
      id: extId(created),
      label: created.timeLabel,
      capacity: created.capacity,
      taken: 0,
      remaining: created.capacity,
      isFull: false,
    },
  };
}

export async function deleteAuditionSlotPg(tenantSlug: string, slotId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  await db
    .delete(schema.auditionSlots)
    .where(
      and(
        eq(schema.auditionSlots.organizationId, org.id),
        or(eq(schema.auditionSlots.baserowId, slotId), eq(schema.auditionSlots.id, slotId))
      )
    );

  return { success: true as const };
}

export async function assignShowTeamMemberPg(
  tenantSlug: string,
  productionId: number,
  personId: number,
  positionId: number
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const [prod, person, pos] = await Promise.all([
    resolveProductionRow(org.id, productionId),
    resolvePersonRow(org.id, personId),
    resolvePositionRow(org.id, positionId),
  ]);

  if (!prod || !person || !pos) {
    return {
      success: false as const,
      error: "Could not resolve production, person, or staff position.",
    };
  }

  const db = getDb();
  const [created] = await db
    .insert(schema.showTeam)
    .values({
      organizationId: org.id,
      productionId: prod.id,
      personId: person.id,
      positionId: pos.id,
      status: "Active",
    })
    .returning();

  return { success: true as const, assignmentId: extId(created) };
}

export async function removeShowTeamMemberPg(tenantSlug: string, assignmentId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  await db
    .delete(schema.showTeam)
    .where(
      and(
        eq(schema.showTeam.organizationId, org.id),
        or(
          eq(schema.showTeam.baserowId, assignmentId),
          eq(schema.showTeam.id, assignmentId)
        )
      )
    );

  return { success: true as const };
}

export async function updateProductionImagePg(
  tenantSlug: string,
  productionId: number,
  imageUrl: string | null
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const prod = await resolveProductionRow(org.id, productionId);
  if (!prod) return { success: false as const, error: "Production not found." };

  const db = getDb();
  await db
    .update(schema.productions)
    .set({
      showImageUrl: imageUrl?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(schema.productions.id, prod.id));

  return { success: true as const, imageUrl: imageUrl?.trim() || null };
}

const LEADERSHIP_PRIORITY = [
  "Executive Director",
  "Business Manager",
  "Production Coordinator",
  "Education Coordinator",
  "Admin",
];

export interface OrgLeaderSummary {
  id: number;
  name: string;
  role: string;
  initials: string;
  image: string | null;
}

export async function getOrgLeadershipPg(
  tenantSlug: string,
  limit = 4
): Promise<OrgLeaderSummary[]> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return [];

  const db = getDb();
  const rows = await db
    .select({
      id: schema.people.id,
      baserowId: schema.people.baserowId,
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
      fullName: schema.people.fullName,
      roles: schema.people.roles,
      headshotUrl: schema.people.headshotUrl,
    })
    .from(schema.people)
    .where(eq(schema.people.organizationId, org.id));

  const ranked: { rank: number; leader: OrgLeaderSummary }[] = [];

  for (const person of rows) {
    const roles = Array.isArray(person.roles) ? person.roles : [];
    const matchIndex = LEADERSHIP_PRIORITY.findIndex((r) => roles.includes(r));
    if (matchIndex === -1) continue;

    const name =
      person.fullName?.trim() ||
      `${person.firstName || ""} ${person.lastName || ""}`.trim();
    if (!name) continue;

    const initials = name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    ranked.push({
      rank: matchIndex,
      leader: {
        id: extId(person),
        name,
        role: LEADERSHIP_PRIORITY[matchIndex],
        initials,
        image: person.headshotUrl || null,
      },
    });
  }

  return ranked
    .sort((a, b) => a.rank - b.rank || a.leader.name.localeCompare(b.leader.name))
    .slice(0, limit)
    .map((entry) => entry.leader);
}
